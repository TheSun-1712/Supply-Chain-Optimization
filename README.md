
# Retail Supply Chain OpenEnv

This project implements a complete OpenEnv-style environment for a real-world task: retail demand planning and inventory replenishment.

It is designed for evaluating agentic decision making under uncertainty, with realistic trade-offs between service quality, stock levels, and operating cost.

## Why this is real-world

This environment models work done by demand planners and supply chain analysts:

- Place replenishment orders under lead times and disruptions.
- Decide whether to expedite delayed shipments.
- Apply tactical discounts to reduce overstock.
- Balance service levels against backlog, holding costs, and margin pressure.

## OpenEnv compliance

The environment implements typed models and standard APIs:

- Typed models:
	- `Action` in `schema.py`
	- `Observation` in `schema.py`
	- `Reward` in `schema.py`
	- `State` in `schema.py`
- API methods:
	- `reset()` in `env.py`
	- `step(action)` in `env.py`
	- `state()` in `env.py`
- Metadata file:
	- `openenv.yaml` in repository root

## Tasks and difficulty progression

Three deterministic tasks are provided and graded from easy to hard:

1. `easy`: Stable weekday demand, short lead times.
2. `medium`: Promotional spikes and moderate disruption risk.
3. `hard`: Peak-season volatility with long lead times and frequent disruptions.

Each task has a deterministic programmatic grader that outputs score in `[0.0, 1.0]`:

- Grader implementation: `grader.py`
- Entry points:
	- `SupplyChainGrader.grade_task()`
	- `SupplyChainGrader.evaluate_all()`

## Action space

`Action` fields:

- `operation`: `noop | order | expedite | discount`
- `quantity`: order quantity in `[0, 500]`
- `target_shipment_id`: shipment id to expedite
- `discount_pct`: discount in `[0.0, 0.5]`
- `rationale`: optional text for traceability

## Observation space

`Observation` fields include:

- `task_id`, `day`, `horizon_days`
- `inventory`, `backlog`
- `demand_today`, `demand_forecast_3d`
- `in_transit` (typed list of shipments)
- `service_level_7d`
- `cumulative_profit`
- `guidance`

## Reward design

Reward is dense and shaped over the whole trajectory (not terminal-only). Each step returns `Reward(value, components)` where `value` is clamped to `[0, 1]` and combines:

- service quality term
- inventory health term
- profit quality term
- backlog control term
- anti-loop penalty for no-op behavior without progress

At episode end, a terminal bonus based on service level and cumulative profit is added and clamped to `[0,1]`.

## Baseline inference

Mandatory script: `inference.py` (in repo root).

It:

- Uses OpenAI Python client for model calls.
- Reads credentials from env vars: `OPENAI_API_KEY` (fallback `HF_TOKEN`).
- Reads endpoint/model config from:
	- `API_BASE_URL`
	- `MODEL_NAME`
	- `HF_TOKEN` (required by challenge configuration)
- Runs all three tasks and prints strict structured logs:
	- `[START] ...`
	- `[STEP] ...`
	- `[END] ...`

## Setup

```bash
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run local API server

```bash
uvicorn app:app --host 0.0.0.0 --port 7860
```

Test endpoints:

```bash
curl -X POST http://localhost:7860/reset -H "Content-Type: application/json" -d '{}'
curl http://localhost:7860/state
```

## Run grader

```bash
python grader.py
```

## Run baseline inference

```bash
export OPENAI_API_KEY=...
export API_BASE_URL=https://api.openai.com/v1
export MODEL_NAME=gpt-4o-mini
export HF_TOKEN=...

python inference.py
```

## Docker

Build and run:

```bash
docker build -t retail-supply-openenv .
docker run --rm -p 7860:7860 retail-supply-openenv
```

## Hugging Face Spaces deployment

Use a Docker Space and include tag `openenv`.

1. Create new Space (SDK: Docker).
2. Push this repository files to the Space.
3. Set Secrets/Variables:
	 - `API_BASE_URL`
	 - `MODEL_NAME`
	 - `HF_TOKEN`
	 - `OPENAI_API_KEY` (if applicable)
4. Ensure app is reachable and `POST /reset` returns 200.

## Validation checklist

Before submission, run:

1. Space health: `POST /reset` returns 200.
2. Docker builds locally.
3. `openenv validate` passes.
4. `python inference.py` completes and logs all tasks.
5. Three tasks produce deterministic grader scores in `[0.0, 1.0]`.

## Baseline score notes

Reproducibility controls:

- Fixed simulation seed: `17`
- Deterministic task demand series
- Deterministic grader thresholds and formulas

After running `python inference.py`, record the printed `model_score_*` values in your submission notes.
