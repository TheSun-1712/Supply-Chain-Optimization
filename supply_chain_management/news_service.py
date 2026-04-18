import os
import requests
import random
from typing import Dict, Any

class GlobalIntelService:
    """
    Simulates a real-world intelligence feed by aggregating supply chain news 
    and geopolitical events. In a production environment, this would connect 
    to News APIs or Bloomberg Terminal data.
    """
    
    # April 2026 Curated Scenarios based on current trends
    REAL_WORLD_EVENTS = [
        {
            "event": "trade_war",
            "description": "Tensions rise in semiconductor manufacturing hubs; export restrictions on Raw Silicon.",
            "magnitude": 0.85,
            "headline": "Semiconductor Export Ban: RAM Supply at Risk"
        },
        {
            "event": "unrest",
            "description": "Logistics workers strike at major overseas ports affecting raw material outflow.",
            "magnitude": 0.45,
            "headline": "Port Strikes Disrupt Raw Material Procurement"
        },
        {
            "event": "sanctions",
            "description": "New environmental sanctions on heavy mining affecting overseas raw vendors.",
            "magnitude": 0.65,
            "headline": "Mining Sanctions Squeeze Overseas Suppliers"
        },
        {
            "event": "stable",
            "description": "Supply chains are relatively stable with minor logistical delays.",
            "magnitude": 0.1,
            "headline": "Market Stability: Supply Chains Recovering"
        }
    ]

    @classmethod
    def fetch_current_shocks(cls) -> Dict[str, Any]:
        api_key = os.getenv("SERP_API_KEY")
        
        if not api_key:
            # Fallback to curated April 2026 data if no API key
            return cls.REAL_WORLD_EVENTS[0]

        try:
            # Search for latest supply chain disruptions
            params = {
                "q": "geopolitical supply chain disruption news April 2026",
                "tbm": "nws", # News search
                "api_key": api_key,
                "num": 3
            }
            response = requests.get("https://serpapi.com/search", params=params, timeout=10)
            results = response.json().get("news_results", [])
            
            if not results:
                return cls.REAL_WORLD_EVENTS[0]
            
            # Analyze top result
            top = results[0]
            title = top.get("title", "")
            snippet = top.get("snippet", "")
            
            # Simple heuristic for shock magnitude
            # In production, use LLM or NLP sentiment analysis
            magnitude = 0.2 # Base
            keywords = ["crisis", "ban", "shortage", "war", "strike", "sanction", "block"]
            for kw in keywords:
                if kw in title.lower() or kw in snippet.lower():
                    magnitude += 0.25
            
            magnitude = min(1.0, magnitude)
            
            event_type = "unrest"
            if "war" in title.lower() or "conflict" in title.lower(): event_type = "trade_war"
            elif "sanction" in title.lower(): event_type = "sanctions"
            
            return {
                "event": event_type,
                "description": snippet[:200] + "...",
                "magnitude": magnitude,
                "headline": title
            }
            
        except Exception as e:
            print(f"Error fetching SerpApi: {e}")
            return cls.REAL_WORLD_EVENTS[0]

    @classmethod
    def get_intel_briefing(cls) -> str:
        data = cls.fetch_current_shocks()
        return f"INTEL ALERT: {data['headline']}. {data['description']}"
