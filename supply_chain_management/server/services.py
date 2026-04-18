import json
import os
import time
import re
import requests
import yfinance as yf
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from openai import OpenAI

SERPAPI_URL = os.getenv("SERPAPI_URL", "https://serpapi.com/search.json")
LLM_BASE_URL = os.getenv("API_BASE_URL") or os.getenv("OPENAI_BASE_URL") or "http://localhost:11434/v1"
LLM_MODEL = os.getenv("MODEL_NAME", "llama3:latest")
LLM_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("HF_TOKEN") or "ollama"


def _get_serpapi_key() -> str:
    key = (os.getenv("SERPAPI_KEY") or "").strip()
    if key:
        return key

    if os.name == "nt":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as env_key:
                reg_value, _ = winreg.QueryValueEx(env_key, "SERPAPI_KEY")
                return str(reg_value or "").strip()
        except Exception:
            return ""

    return ""


def _safe_lower(text: object) -> str:
    return str(text or "").lower()


def _extract_source_name(source: object) -> str:
    if isinstance(source, dict):
        return str(source.get("name") or source.get("title") or source.get("domain") or "news")
    return str(source or "news")


def _parse_article_age_hours(raw_date: str) -> float:
    raw_text = str(raw_date or "").strip()
    if not raw_text:
        return -1.0

    date_text = raw_text.lower()

    # SerpAPI commonly returns relative strings like "3 hours ago" or "2 days ago".
    match = re.search(r"(\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks)\s+ago", date_text)
    if match:
        qty = int(match.group(1))
        unit = match.group(2)
        if "minute" in unit:
            return qty / 60.0
        if "hour" in unit:
            return float(qty)
        if "day" in unit:
            return float(qty * 24)
        if "week" in unit:
            return float(qty * 24 * 7)

    now_utc = datetime.now(timezone.utc)
    absolute_formats = [
        "%m/%d/%Y, %I:%M %p, %z %Z",
        "%m/%d/%Y, %I:%M %p, %z",
        "%m/%d/%Y, %I:%M %p",
        "%m/%d/%Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d %b %Y",
    ]
    parse_candidates = [
        raw_text,
        re.sub(r"\s+UTC$", "", raw_text, flags=re.IGNORECASE),
        re.sub(r",\s*\+0000\s*UTC$", "", raw_text, flags=re.IGNORECASE),
    ]

    for candidate in parse_candidates:
        candidate = candidate.strip()
        if not candidate:
            continue
        for fmt in absolute_formats:
            try:
                parsed = datetime.strptime(candidate, fmt)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                else:
                    parsed = parsed.astimezone(timezone.utc)
                age = now_utc - parsed
                return max(0.0, age.total_seconds() / 3600.0)
            except ValueError:
                continue

    return -1.0


def _is_low_signal_market_story(title: str, snippet: str) -> bool:
    text = f"{_safe_lower(title)} {_safe_lower(snippet)}"
    noisy_terms = [
        "stock",
        "shares",
        "ytd",
        "book profit",
        "price target",
        "dividend",
        "earnings",
        "buy rating",
        "hold rating",
        "analyst",
    ]
    return any(term in text for term in noisy_terms)


def _first_match(text: str, options: list[str], default: str) -> str:
    for option in options:
        if option in text:
            return default if default != option else option
    return default


def _region_profile(text: str) -> Dict[str, Any]:
    region_profiles = [
        {
            "matchers": ["taiwan", "tsmc", "hsinchu"],
            "region": "Taiwan",
            "production": ["semiconductors", "advanced nodes", "processors", "chipsets"],
            "devices": ["laptops", "phones", "servers", "automotive electronics"],
            "sector": "Semiconductor manufacturing",
        },
        {
            "matchers": ["israel", "tel aviv", "haifa", "jerusalem"],
            "region": "Israel",
            "production": ["defense electronics", "cyber hardware", "specialty semiconductors", "medical devices"],
            "devices": ["network equipment", "secure devices", "medical systems", "industrial controls"],
            "sector": "High-tech electronics and defense",
        },
        {
            "matchers": ["middle east", "saudi", "uae", "qatar", "kuwait", "iran", "iraq", "saint", "gulf", "hormuz"],
            "region": "Middle East",
            "production": ["crude oil", "lng", "petrochemicals", "plastics", "fertilizers"],
            "devices": ["cars", "phones", "laptops", "appliances", "packaged goods"],
            "sector": "Energy and petrochemicals",
        },
        {
            "matchers": ["south korea", "korea", "busan", "samsung", "sk hynix"],
            "region": "South Korea",
            "production": ["memory chips", "displays", "batteries", "shipbuilding inputs"],
            "devices": ["smartphones", "pcs", "servers", "tv panels"],
            "sector": "Memory and display supply",
        },
        {
            "matchers": ["japan", "osaka", "tokyo", "kyoto"],
            "region": "Japan",
            "production": ["precision machinery", "semiconductor chemicals", "materials", "sensors"],
            "devices": ["cars", "electronics", "industrial equipment"],
            "sector": "Materials and precision manufacturing",
        },
        {
            "matchers": ["china", "shenzhen", "guangdong", "sichuan"],
            "region": "China",
            "production": ["electronics assembly", "batteries", "rare earth processing", "consumer hardware"],
            "devices": ["phones", "laptops", "wearables", "e-bikes"],
            "sector": "Electronics assembly and battery supply",
        },
        {
            "matchers": ["ukraine", "odessa", "black sea"],
            "region": "Ukraine / Black Sea",
            "production": ["grain", "sunflower oil", "metals", "fertilizers"],
            "devices": ["food products", "industrial inputs", "packaging"],
            "sector": "Agriculture and raw materials",
        },
        {
            "matchers": ["europe", "germany", "poland", "france", "italy"],
            "region": "Europe",
            "production": ["autos", "industrial machinery", "chemicals", "pharma"],
            "devices": ["cars", "appliances", "factory automation", "medical devices"],
            "sector": "Industrial and automotive manufacturing",
        },
        {
            "matchers": ["united states", "us", "texas", "arizona", "california"],
            "region": "United States",
            "production": ["chips", "cloud hardware", "aerospace parts", "advanced manufacturing"],
            "devices": ["servers", "laptops", "phones", "industrial systems"],
            "sector": "Advanced manufacturing",
        },
    ]

    for profile in region_profiles:
        if any(matcher in text for matcher in profile["matchers"]):
            return profile

    return {
        "region": "Global",
        "production": ["supplier inputs", "raw materials", "subassemblies"],
        "devices": ["multi-industry manufacturing"],
        "sector": "Broad supply-chain exposure",
    }


def _sector_profile(text: str) -> Dict[str, Any]:
    if any(term in text for term in ["oil", "fuel", "crude", "lng", "opec", "pipeline", "refinery"]):
        return {
            "theme": "Energy and fuel risk",
            "likely_disruption": "Oil and fuel price moves can lift transport, packaging, and all-in manufacturing costs.",
            "affected_parts": ["fuel", "shipping", "plastics", "chemicals", "packaging"],
            "devices": ["cars", "phones", "laptops", "appliances"],
            "severity": 4,
        }

    if any(term in text for term in ["semiconductor", "chip", "chipset", "processor", "foundry", "wafer", "gpu", "memory"]):
        return {
            "theme": "Semiconductor risk",
            "likely_disruption": "Chip shortages can slow final assembly and raise bill-of-materials costs across multiple device categories.",
            "affected_parts": ["processors", "chipsets", "memory", "pcbs", "sensors"],
            "devices": ["phones", "laptops", "servers", "cars", "industrial systems"],
            "severity": 5,
        }

    if any(term in text for term in ["battery", "lithium", "rare earth", "minerals", "cobalt", "nickel"]):
        return {
            "theme": "Battery and materials risk",
            "likely_disruption": "Batteries and critical minerals can constrain EVs, portable devices, and grid equipment.",
            "affected_parts": ["batteries", "cathodes", "anodes", "magnets", "motors"],
            "devices": ["phones", "laptops", "evs", "power tools", "grid hardware"],
            "severity": 4,
        }

    if any(term in text for term in ["grain", "wheat", "sunflower", "food", "agriculture", "fertilizer"]):
        return {
            "theme": "Agriculture and food risk",
            "likely_disruption": "Food and fertilizer shocks affect packaged goods, consumer prices, and logistics demand.",
            "affected_parts": ["food inputs", "fertilizer", "packaging", "shipping"],
            "devices": ["food products", "retail goods"],
            "severity": 3,
        }

    if any(term in text for term in ["automotive", "car", "vehicle", "factory", "industrial", "machinery"]):
        return {
            "theme": "Industrial manufacturing risk",
            "likely_disruption": "Industrial disruptions can hit motors, sensors, controllers, and finished equipment output.",
            "affected_parts": ["motors", "controllers", "sensors", "machinery"],
            "devices": ["cars", "appliances", "factory systems", "robots"],
            "severity": 3,
        }

    return {
        "theme": "General upstream risk",
        "likely_disruption": "The headline may indicate a broader sourcing, demand, or route risk worth monitoring.",
        "affected_parts": ["supplier base", "assembly planning"],
        "devices": ["multi-industry manufacturing"],
        "severity": 2,
    }


def _classify_article(article: Dict[str, Any]) -> Dict[str, Any]:
    title = str(article.get("title") or article.get("seendate") or "Untitled article")
    text = " ".join(
        [
            _safe_lower(title),
            _safe_lower(article.get("snippet")),
            _safe_lower(article.get("query")),
            _safe_lower(article.get("sourceCountry")),
            _safe_lower(article.get("language")),
            _safe_lower(article.get("tone")),
            _safe_lower(article.get("domain")),
        ]
    )

    region_profile = _region_profile(text)
    sector_profile = _sector_profile(text)

    return {
        "theme": sector_profile["theme"],
        "region": region_profile["region"],
        "production_area": region_profile["sector"],
        "local_products": region_profile["production"],
        "downstream_devices": region_profile["devices"] or sector_profile["devices"],
        "likely_disruption": sector_profile["likely_disruption"],
        "affected_parts": sorted({*region_profile["production"], *sector_profile["affected_parts"]}),
        "severity": sector_profile["severity"] if sector_profile["severity"] >= 3 else (3 if region_profile["region"] != "Global" else 2),
    }


class ProducerIntelService:
    """Pulls public news and turns it into producer-side risk signals."""

    def __init__(self, cache_ttl: int = 900, max_article_age_hours: int = 24 * 21):
        self.cache_ttl = cache_ttl
        self.max_article_age_hours = max_article_age_hours
        self.last_fetch = 0.0
        self.cached_data: Dict[str, Any] = {
            "status": "Stochastic",
            "generatedAt": None,
            "riskScore": 0,
            "signals": [],
            "headlines": [],
            "watchlist": [],
            "deviceWatchlist": [],
            "summary": "Waiting for live news feed.",
        }

    def get_latest(self) -> Dict[str, Any]:
        now = time.time()
        if now - self.last_fetch > self.cache_ttl:
            self._update()
        return self.cached_data

    def _fetch_serpapi(self, query: str) -> list[Dict[str, Any]]:
        serpapi_key = _get_serpapi_key()
        if not serpapi_key:
            return []

        url = SERPAPI_URL
        response = requests.get(
            url,
            params={
                "engine": "google_news",
                "q": query,
                "api_key": serpapi_key,
                "hl": "en",
                "gl": "us",
                "num": 10,
                "tbs": "qdr:w",
            },
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("news_results", []) or []

    def _create_llm_client(self) -> OpenAI:
        return OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY)

    def _llm_score_articles(self, articles: list[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        if not articles:
            return {}

        payload = {
            "instructions": {
                "task": "Assess the severity of geopolitical and upstream production risk from real-time news.",
                "scale": "severity must be an integer from 1 to 5, where 1 is low and 5 is severe disruption risk within 30-90 days.",
                "focus": [
                    "Which parts are actually produced in the impacted region",
                    "Which downstream devices depend on those parts",
                    "How tensions, fuel spikes, sanctions, export controls, war, strikes, or shipping disruptions change supply",
                    "Whether the headline implies broad industrial costs or a narrow local issue",
                ],
                "output": "Return strict JSON with a top-level 'results' array. Each result must contain: title, severity, summary, affected_parts, downstream_devices, risk_theme, confidence."
            },
            "articles": articles,
        }

        client = self._create_llm_client()
        response = client.chat.completions.create(
            model=LLM_MODEL,
            temperature=0.0,
            messages=[
                {
                    "role": "system",
                    "content": "You are a geopolitical supply-chain analyst. Output only valid JSON. Do not wrap the response in markdown.",
                },
                {
                    "role": "user",
                    "content": json.dumps(payload),
                },
            ],
        )
        raw_text = (response.choices[0].message.content or "").strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            raw_text = raw_text.replace("json", "", 1).strip()

        parsed = json.loads(raw_text)
        results = parsed.get("results", []) if isinstance(parsed, dict) else []
        return {
            str(item.get("title") or "").strip().lower(): item
            for item in results
            if isinstance(item, dict)
        }

    def _fallback_llm_analysis(self, article: Dict[str, Any]) -> Dict[str, Any]:
        title = str(article.get("title") or "Untitled article")
        text = " ".join(
            [
                _safe_lower(title),
                _safe_lower(article.get("snippet")),
                _safe_lower(article.get("sourceCountry")),
                _safe_lower(article.get("source")),
            ]
        )
        region_profile = _region_profile(text)
        sector_profile = _sector_profile(text)
        return {
            "title": title,
            "severity": sector_profile["severity"],
            "summary": sector_profile["likely_disruption"],
            "affected_parts": sorted({*region_profile["production"], *sector_profile["affected_parts"]}),
            "downstream_devices": region_profile["devices"] or sector_profile["devices"],
            "risk_theme": sector_profile["theme"],
            "confidence": 0.45,
        }

    def _update(self):
        key = _get_serpapi_key()
        if not key:
            self.cached_data = {
                **self.cached_data,
                "status": "Missing SerpAPI key",
                "summary": "SerpAPI credentials are required for live news analysis.",
                "signals": [],
                "headlines": [],
                "watchlist": [],
                "deviceWatchlist": [],
                "riskScore": 0,
            }
            return

        queries = [
            "Middle East oil LNG refinery shipping disruption",
            "Red Sea Suez shipping delays container freight disruption",
            "Israel manufacturing exports medical devices defense electronics supply risk",
            "Taiwan semiconductor export controls foundry disruption",
            "South Korea battery memory display supply disruption",
            "China rare earth graphite battery materials export controls",
            "Chile Peru copper mining disruption smelter strikes",
            "DR Congo cobalt mining disruption EV battery supply",
            "Indonesia nickel smelting disruption battery supply",
            "Ukraine Black Sea grain fertilizer metals logistics disruption",
            "Europe automotive chemicals pharma manufacturing disruption",
            "India API pharmaceutical ingredients export disruption",
            "Bangladesh Vietnam apparel textile factory disruption",
            "Mexico electronics automotive nearshoring supply disruption",
            "global port strike logistics congestion container shortage",
        ]

        articles: list[Dict[str, Any]] = []
        seen_urls: set[str] = set()

        try:
            for query in queries:
                per_query_articles: list[Dict[str, Any]] = []
                for article in self._fetch_serpapi(query):
                    title = str(article.get("title") or "Untitled article").strip()
                    link = str(article.get("link") or article.get("url") or "")
                    raw_date = str(article.get("date") or article.get("published_date") or "")
                    snippet = str(article.get("snippet") or article.get("description") or "")
                    age_hours = _parse_article_age_hours(raw_date)
                    if not title or link in seen_urls:
                        continue
                    if _is_low_signal_market_story(title, snippet):
                        continue
                    if age_hours >= 0 and age_hours > self.max_article_age_hours:
                        continue
                    seen_urls.add(link)
                    per_query_articles.append(
                        {
                            "query": query,
                            "title": title,
                            "link": link,
                            "source": _extract_source_name(article.get("source") or article.get("publisher") or article.get("domain") or "news"),
                            "date": raw_date,
                            "age_hours": age_hours,
                            "snippet": snippet,
                            "raw": article,
                        }
                    )
                per_query_articles.sort(
                    key=lambda item: float(item.get("age_hours", 10**9))
                    if float(item.get("age_hours", -1.0)) >= 0
                    else 10**9
                )
                articles.extend(per_query_articles[:2])
            articles.sort(
                key=lambda item: float(item.get("age_hours", 10**9))
                if float(item.get("age_hours", -1.0)) >= 0
                else 10**9
            )
            articles = articles[:30]

            # Keep only clearly recent items when dates are parseable.
            recent_articles = [a for a in articles if float(a.get("age_hours", -1.0)) >= 0]
            articles = recent_articles

            llm_results: Dict[str, Dict[str, Any]] = {}
            if articles:
                try:
                    llm_results = self._llm_score_articles(articles)
                except Exception as exc:
                    print(f"WARN ProducerIntelService: LLM scoring failed, using heuristic fallback. {exc}")

            signals: list[Dict[str, Any]] = []
            for article in articles:
                analysis = llm_results.get(article["title"].strip().lower()) or self._fallback_llm_analysis(article)
                classification = _classify_article(article)
                signals.append(
                    {
                        "headline": article["title"],
                        "url": article["link"],
                        "source": article["source"],
                        "theme": analysis.get("risk_theme") or classification["theme"],
                        "region": classification["region"],
                        "production_area": classification["production_area"],
                        "local_products": classification["local_products"],
                        "downstream_devices": analysis.get("downstream_devices") or classification["downstream_devices"],
                        "likely_disruption": analysis.get("summary") or classification["likely_disruption"],
                        "affected_parts": sorted(set(analysis.get("affected_parts") or classification["affected_parts"])),
                        "severity": int(max(1, min(5, round(float(analysis.get("severity", classification["severity"])))))),
                        "confidence": float(analysis.get("confidence", 0.5)),
                        "date": article.get("date", ""),
                        "age_hours": article.get("age_hours", -1.0),
                    }
                )

            # Balance by recency and diversity to avoid single-region dominance.
            signals = sorted(
                signals,
                key=lambda item: (
                    int(item.get("severity", 0)),
                    -float(next((a.get("age_hours", 10**9) for a in articles if a["title"] == item["headline"]), 10**9)),
                ),
                reverse=True,
            )

            region_counts: Dict[str, int] = {}
            theme_counts: Dict[str, int] = {}
            balanced_signals: list[Dict[str, Any]] = []
            region_caps = {
                "Taiwan": 1,
            }
            theme_caps = {
                "Semiconductor risk": 2,
            }
            for signal in signals:
                region = str(signal.get("region") or "Global")
                theme = str(signal.get("theme") or "General upstream risk")
                region_cap = region_caps.get(region, 2)
                theme_cap = theme_caps.get(theme, 3)
                if region_counts.get(region, 0) >= region_cap:
                    continue
                if theme_counts.get(theme, 0) >= theme_cap:
                    continue
                balanced_signals.append(signal)
                region_counts[region] = region_counts.get(region, 0) + 1
                theme_counts[theme] = theme_counts.get(theme, 0) + 1
                if len(balanced_signals) >= 12:
                    break

            if len(balanced_signals) < 8:
                for signal in signals:
                    if signal in balanced_signals:
                        continue
                    balanced_signals.append(signal)
                    if len(balanced_signals) >= 12:
                        break

            signals = balanced_signals[:12]
            headlines = [
                {
                    "headline": item["headline"],
                    "theme": item["theme"],
                    "region": item["region"],
                    "production_area": item["production_area"],
                    "downstream_devices": item["downstream_devices"],
                    "url": item["url"],
                    "severity": item["severity"],
                    "date": item.get("date", ""),
                }
                for item in signals[:8]
            ]

            watchlist = sorted({part for item in signals for part in item.get("affected_parts", [])})[:10]
            device_watchlist = sorted({device for item in signals for device in item.get("downstream_devices", [])})[:12]
            overall_severity = round(sum(item["severity"] for item in signals) / max(1, len(signals)), 1)

            self.cached_data = {
                "status": "Live News Sync",
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "riskScore": overall_severity,
                "signals": signals,
                "headlines": headlines,
                "watchlist": watchlist,
                "deviceWatchlist": device_watchlist,
                "summary": self._build_summary(signals),
            }
            if not signals:
                self.cached_data["status"] = "No SerpAPI news results"
                self.cached_data["summary"] = "SerpAPI returned no recent headlines for the current query set."
            self.last_fetch = time.time()
            print(f"DEBUG ProducerIntelService: Updated {len(signals)} signals | Risk {overall_severity}")
        except Exception as exc:
            print(f"ERROR ProducerIntelService: Failed update, falling back to cached digest. {exc}")
            self.cached_data["status"] = f"Stochastic (Sync Error: {str(exc)[:40]}...)"

    @staticmethod
    def _build_summary(signals: list[Dict[str, Any]]) -> str:
        if not signals:
            return "No live news signal available; use this as a low-confidence baseline."

        top = signals[0]
        if top["region"] == "Middle East":
            return "Middle East energy tension can lift oil and petrochemical costs, which flows into transport, plastics, packaging, and broad manufacturing inputs."
        if top["region"] == "Taiwan":
            return "Taiwan-linked semiconductor risk can disrupt processors and chipsets first, then cascade into laptops, phones, servers, and vehicles."
        if top["region"] == "Israel":
            return "Israel-linked tension can affect defense electronics, specialty hardware, and secure devices, which may slow high-value industrial and network equipment."
        if top["region"] == "Ukraine / Black Sea":
            return "Black Sea tension can hit grain, fertilizer, and metals flows, raising food-system and industrial input costs."
        return "Broad upstream news risk detected. Watch for supplier, route, and component disruption before it reaches final assembly."

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
            if yf is None:
                raise RuntimeError("yfinance is not installed")

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
producer_intel_service = ProducerIntelService()
