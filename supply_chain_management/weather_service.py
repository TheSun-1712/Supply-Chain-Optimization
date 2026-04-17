from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import List, Optional, Sequence

import httpx


OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
WEATHER_STATES = ("clear", "storm", "hurricane")
STATE_TO_INDEX = {state: idx for idx, state in enumerate(WEATHER_STATES)}


@dataclass
class WeatherSnapshot:
    observed_date: str
    current_state: str
    current_temperature_c: float
    current_precipitation_mm: float
    current_wind_speed_kph: float
    forecast_states_3d: List[str]
    source: str


@dataclass
class WeatherHistoryRecord:
    observed_date: str
    state: str
    temperature_c: float
    precipitation_mm: float
    wind_speed_kph: float
    source: str


def classify_weather_state(
    weather_code: Optional[int],
    precipitation_mm: float,
    wind_speed_kph: float,
) -> str:
    if weather_code in {95, 96, 99} or wind_speed_kph >= 90:
        return "hurricane"
    if weather_code in {51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82}:
        return "storm"
    if weather_code in {71, 73, 75, 77, 85, 86}:
        return "storm"
    if precipitation_mm >= 8 or wind_speed_kph >= 45:
        return "storm"
    return "clear"


class WeatherHistoryStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load_records(self) -> List[WeatherHistoryRecord]:
        if not self.path.exists():
            return []
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            return []

        records: List[WeatherHistoryRecord] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            state = str(item.get("state", "clear"))
            if state not in WEATHER_STATES:
                continue
            records.append(
                WeatherHistoryRecord(
                    observed_date=str(item.get("observed_date", "")),
                    state=state,
                    temperature_c=float(item.get("temperature_c", 0.0) or 0.0),
                    precipitation_mm=float(item.get("precipitation_mm", 0.0) or 0.0),
                    wind_speed_kph=float(item.get("wind_speed_kph", 0.0) or 0.0),
                    source=str(item.get("source", "unknown")),
                )
            )
        return sorted(records, key=lambda record: record.observed_date)

    def save_records(self, records: Sequence[WeatherHistoryRecord]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = [asdict(record) for record in sorted(records, key=lambda r: r.observed_date)]
        self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def append_record(self, record: WeatherHistoryRecord) -> List[WeatherHistoryRecord]:
        records = self.load_records()
        for idx, existing in enumerate(records):
            if existing.observed_date == record.observed_date:
                records[idx] = record
                self.save_records(records)
                return records

        records.append(record)
        self.save_records(records)
        return records

    def ensure_bootstrap_history(
        self,
        latitude: float,
        longitude: float,
        timezone: str,
        lookback_days: int = 180,
        min_records: int = 45,
        timeout_seconds: float = 15.0,
    ) -> List[WeatherHistoryRecord]:
        records = self.load_records()
        if len(records) >= min_records:
            return records

        end_date = date.today() - timedelta(days=1)
        start_date = end_date - timedelta(days=max(lookback_days - 1, 1))
        archive_records = fetch_historical_weather(
            latitude=latitude,
            longitude=longitude,
            timezone=timezone,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            timeout_seconds=timeout_seconds,
        )
        if archive_records:
            records_by_day = {record.observed_date: record for record in records}
            for record in archive_records:
                records_by_day[record.observed_date] = record
            records = sorted(records_by_day.values(), key=lambda item: item.observed_date)
            self.save_records(records)
        return records


class WeatherMarkovChain:
    def __init__(self, transition_matrix: Optional[List[List[float]]] = None) -> None:
        self.states = list(WEATHER_STATES)
        self.transition_matrix = transition_matrix or [
            [0.80, 0.18, 0.02],
            [0.45, 0.45, 0.10],
            [0.35, 0.30, 0.35],
        ]

    def fit(self, states: Sequence[str], alpha: float = 1.0) -> None:
        counts = [[alpha for _ in self.states] for _ in self.states]
        clean_states = [state for state in states if state in STATE_TO_INDEX]

        for prev_state, next_state in zip(clean_states[:-1], clean_states[1:]):
            counts[STATE_TO_INDEX[prev_state]][STATE_TO_INDEX[next_state]] += 1.0

        self.transition_matrix = []
        for row in counts:
            row_total = sum(row) or 1.0
            self.transition_matrix.append([value / row_total for value in row])

    def forecast_probabilities(self, current_state: str, horizon: int = 3) -> List[List[float]]:
        if current_state not in STATE_TO_INDEX:
            current_state = "clear"

        probs = [0.0, 0.0, 0.0]
        probs[STATE_TO_INDEX[current_state]] = 1.0

        forecasts: List[List[float]] = []
        for _ in range(horizon):
            next_probs = [0.0, 0.0, 0.0]
            for state_idx, state_prob in enumerate(probs):
                row = self.transition_matrix[state_idx]
                for next_idx, transition_prob in enumerate(row):
                    next_probs[next_idx] += state_prob * transition_prob
            forecasts.append([round(value, 4) for value in next_probs])
            probs = next_probs
        return forecasts

    def most_likely_states(self, current_state: str, horizon: int = 3) -> List[str]:
        forecasts = self.forecast_probabilities(current_state=current_state, horizon=horizon)
        states: List[str] = []
        for day_probs in forecasts:
            best_idx = max(range(len(day_probs)), key=lambda idx: day_probs[idx])
            states.append(self.states[best_idx])
        return states


def fetch_historical_weather(
    latitude: float,
    longitude: float,
    timezone: str,
    start_date: str,
    end_date: str,
    timeout_seconds: float = 15.0,
) -> List[WeatherHistoryRecord]:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "weather_code,temperature_2m_max,precipitation_sum,wind_speed_10m_max",
    }

    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.get(OPEN_METEO_ARCHIVE_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return []

    daily = payload.get("daily", {})
    dates = daily.get("time", [])
    codes = daily.get("weather_code", [])
    temperatures = daily.get("temperature_2m_max", [])
    precipitation = daily.get("precipitation_sum", [])
    wind_speeds = daily.get("wind_speed_10m_max", [])

    records: List[WeatherHistoryRecord] = []
    for idx, day in enumerate(dates):
        records.append(
            WeatherHistoryRecord(
                observed_date=str(day),
                state=classify_weather_state(
                    int(codes[idx]) if idx < len(codes) and codes[idx] is not None else None,
                    float(precipitation[idx] or 0.0) if idx < len(precipitation) else 0.0,
                    float(wind_speeds[idx] or 0.0) if idx < len(wind_speeds) else 0.0,
                ),
                temperature_c=float(temperatures[idx] or 0.0) if idx < len(temperatures) else 0.0,
                precipitation_mm=float(precipitation[idx] or 0.0) if idx < len(precipitation) else 0.0,
                wind_speed_kph=float(wind_speeds[idx] or 0.0) if idx < len(wind_speeds) else 0.0,
                source="historical_api",
            )
        )
    return records


class LiveWeatherClient:
    def __init__(
        self,
        latitude: float,
        longitude: float,
        timezone: str = "auto",
        cache_ttl_seconds: int = 1800,
        timeout_seconds: float = 10.0,
    ) -> None:
        self.latitude = latitude
        self.longitude = longitude
        self.timezone = timezone
        self.cache_ttl_seconds = cache_ttl_seconds
        self.timeout_seconds = timeout_seconds
        self._cached_snapshot: Optional[WeatherSnapshot] = None
        self._cached_at: float = 0.0

    def get_snapshot(self, force_refresh: bool = False) -> Optional[WeatherSnapshot]:
        if not force_refresh and self._cached_snapshot is not None:
            if time.time() - self._cached_at < self.cache_ttl_seconds:
                return self._cached_snapshot

        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timezone": self.timezone,
            "current": "temperature_2m,precipitation,wind_speed_10m,weather_code",
            "daily": "weather_code,temperature_2m_max,precipitation_sum,wind_speed_10m_max",
            "forecast_days": 4,
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.get(OPEN_METEO_FORECAST_URL, params=params)
                response.raise_for_status()
                payload = response.json()
        except Exception:
            return None

        current = payload.get("current", {})
        daily = payload.get("daily", {})
        daily_dates = daily.get("time", [])
        daily_codes = daily.get("weather_code", [])
        daily_precip = daily.get("precipitation_sum", [])
        daily_wind = daily.get("wind_speed_10m_max", [])

        current_state = classify_weather_state(
            current.get("weather_code"),
            float(current.get("precipitation", 0.0) or 0.0),
            float(current.get("wind_speed_10m", 0.0) or 0.0),
        )

        forecast_states_3d: List[str] = []
        for idx in range(1, min(4, len(daily_codes))):
            forecast_states_3d.append(
                classify_weather_state(
                    int(daily_codes[idx]) if daily_codes[idx] is not None else None,
                    float(daily_precip[idx] or 0.0),
                    float(daily_wind[idx] or 0.0),
                )
            )

        while len(forecast_states_3d) < 3:
            forecast_states_3d.append(current_state)

        observed_date = str(daily_dates[0]) if daily_dates else date.today().isoformat()
        snapshot = WeatherSnapshot(
            observed_date=observed_date,
            current_state=current_state,
            current_temperature_c=float(current.get("temperature_2m", 0.0) or 0.0),
            current_precipitation_mm=float(current.get("precipitation", 0.0) or 0.0),
            current_wind_speed_kph=float(current.get("wind_speed_10m", 0.0) or 0.0),
            forecast_states_3d=forecast_states_3d[:3],
            source="live_api",
        )
        self._cached_snapshot = snapshot
        self._cached_at = time.time()
        return snapshot
