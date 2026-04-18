from __future__ import annotations

from schema import Observation


def _observation_block(observation: Observation) -> str:
    return f"""Current simulation state (Day {observation.day}):
- Central Inventory: {observation.inventory_central} units
- Regional Inventory: {observation.inventory_regional} units
- Backlog (unfulfilled): {observation.backlog} units
- Weather: {observation.weather_condition}
- Overseas Route: {observation.overseas_route_status}
- Fuel Cost Multiplier: {observation.fuel_cost_multiplier:.2f}x
- Cumulative Profit: ${observation.cumulative_profit:,.2f}
- Day {observation.day}
"""


def build_supply_chain_context(observation: Observation) -> str:
    return f"""You are a Supply Chain analyst Co-Pilot. Be concise and analytical.
{_observation_block(observation)}
Focus on inventory positioning, route disruptions, service levels, backlog, and replenishment decisions.
"""


def build_producer_context(observation: Observation) -> str:
    return f"""You are a producer-side operations strategist. Be concise and analytical.
{_observation_block(observation)}
Focus on raw material procurement, supplier concentration risk, production planning, assembly bottlenecks, component shortages, and pre-inventory failure modes.
When relevant, consider fuel hikes, freight inflation, port congestion, export controls, and geopolitical shocks such as Taiwan-linked semiconductor disruption affecting processors, chipsets, and downstream products.
Give practical mitigation advice like dual sourcing, safety stock, alternate parts, production sequencing, and scenario planning.
"""


def build_chat_context(mode: str, observation: Observation) -> str:
    if mode == "producer_analysis":
        return build_producer_context(observation)
    return build_supply_chain_context(observation)