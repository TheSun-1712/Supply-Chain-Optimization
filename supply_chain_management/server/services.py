import time
import requests
import yfinance as yf
from typing import Optional, Dict, Any

class RealWorldService:
    """
    Fetches live environmental and market data to drive simulation disruptions.
    Uses basic caching to stay within free-tier rate limits.
    """
    def __init__(self, cache_ttl: int = 600): # 10 minutes cache
        self.cache_ttl = cache_ttl
        self.last_fetch = 0
        self.cached_data = {
            "weather": "clear",
            "wind_speed": 0.0,
            "fuel_multiplier": 1.0,
            "oil_price": 80.0,
            "status": "Stochastic"
        }

    def get_latest(self) -> Dict[str, Any]:
        now = time.time()
        if now - self.last_fetch > self.cache_ttl:
            self._update()
        return self.cached_data

    def _update(self):
        try:
            # 1. Fetch Weather (Singapore Port)
            weather_url = "https://api.open-meteo.com/v1/forecast?latitude=1.2641&longitude=103.8230&current=wind_speed_10m,weather_code"
            wr = requests.get(weather_url, timeout=5)
            wdata = wr.json().get("current", {})
            
            w_code = wdata.get("weather_code", 0)
            wind = wdata.get("wind_speed_10m", 0)
            
            # Map WMO codes: 0-3 Clear, 51-67 Rain/Storm, 95-99 T-Storm/Hurricane
            # Force hurricane if wind > 60 km/h
            if wind > 60 or w_code in [95, 96, 99]:
                condition = "hurricane"
            elif wind > 30 or w_code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
                condition = "storm"
            else:
                condition = "clear"

            # 2. Fetch Fuel (WTI Crude Oil)
            oil = yf.Ticker("CL=F")
            # fast_info is reliable and fast
            price = oil.fast_info['last_price']
            
            # Baseline is $80.00
            mult = max(0.5, min(3.5, price / 80.0))
            
            self.cached_data = {
                "weather": condition,
                "wind_speed": wind,
                "fuel_multiplier": round(mult, 2),
                "oil_price": round(price, 2),
                "status": "Real-World Sync"
            }
            self.last_fetch = time.time()
            print(f"DEBUG RealWorldService: Updated -> {condition} | Wind: {wind} | Oil: ${price}")

        except Exception as e:
            print(f"ERROR RealWorldService: Failed update, falling back to stochastic. {e}")
            self.cached_data["status"] = f"Stochastic (Sync Error: {str(e)[:40]}...)"
            # Don't reset last_fetch so it tries again sooner if it failed

# Singleton for the app
real_world_service = RealWorldService()
