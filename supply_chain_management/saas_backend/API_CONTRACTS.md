# API Contracts

Base URL: `http://localhost:8000/api`

## CRUD

### `GET /products`
Returns all products.

### `POST /products`
```json
{
  "sku": "SKU-RL-001",
  "name": "Smart Thermostat",
  "category": "electronics",
  "description": "Demo SKU",
  "unit_price": 26.0,
  "active": true
}
```

### `PUT /products/{id}`
Partial update using the same fields as create.

### `DELETE /products/{id}`
Deletes the product.

The same CRUD shape applies to:

- `GET|POST /suppliers`
- `GET|PUT|DELETE /suppliers/{id}`
- `GET|POST /inventory`
- `GET|PUT|DELETE /inventory/{id}`
- `GET|POST /orders`
- `GET|PUT|DELETE /orders/{id}`

## Recommendation Engine

### `POST /recommend-action`
```json
{
  "state": {
    "task_id": "medium",
    "central_inventory": 250,
    "regional_inventory": 130,
    "backlog": 18,
    "in_transit_central": 40,
    "in_transit_regional": 10,
    "demand_forecast_3d": [24, 27, 29],
    "weather_condition": "storm",
    "overseas_route_status": "delayed",
    "fuel_cost_multiplier": 1.2,
    "pending_shipments": []
  }
}
```

Response:
```json
{
  "action_type": "order",
  "quantity": 120,
  "supplier": "overseas",
  "confidence_score": 0.78,
  "expected_reward": 0.54,
  "reasoning": "Backlog is elevated + near-term demand is rising + overseas supply keeps unit cost lower"
}
```

## Simulation

### `POST /simulate`
```json
{
  "name": "RL scenario",
  "initial_state": {
    "task_id": "medium",
    "central_inventory": 250,
    "regional_inventory": 120,
    "backlog": 12,
    "in_transit_central": 60,
    "in_transit_regional": 10,
    "demand_forecast_3d": [25, 29, 32],
    "weather_condition": "clear",
    "overseas_route_status": "open",
    "fuel_cost_multiplier": 1.0,
    "pending_shipments": []
  },
  "steps": 14,
  "policy": "rl",
  "manual_actions": [],
  "scenario": {
    "demand_multiplier": 1.0,
    "fuel_multiplier": 1.0,
    "weather_condition": "clear",
    "route_status": "open"
  }
}
```

Response:

- `run_id`
- `policy`
- `trajectory[]`
- `final_kpis.total_profit`
- `final_kpis.service_level`
- `final_kpis.backlog`
- `final_kpis.average_reward`

### `POST /scenario-test`
Same payload and response as `/simulate`.

### `POST /compare-policies`
```json
{
  "initial_state": {
    "task_id": "hard",
    "central_inventory": 300,
    "regional_inventory": 140,
    "backlog": 18,
    "in_transit_central": 90,
    "in_transit_regional": 35,
    "demand_forecast_3d": [38, 44, 48],
    "weather_condition": "storm",
    "overseas_route_status": "delayed",
    "fuel_cost_multiplier": 1.2,
    "pending_shipments": []
  },
  "steps": 18,
  "scenario": {
    "demand_multiplier": 1.4,
    "fuel_multiplier": 1.5,
    "weather_condition": "storm",
    "route_status": "delayed"
  }
}
```

## Analytics

- `GET /analytics/summary`
- `GET /analytics/performance-over-time`
- `GET /analytics/action-distribution`
- `GET /analytics/profit-trends`
- `GET /analytics/scorecard`
