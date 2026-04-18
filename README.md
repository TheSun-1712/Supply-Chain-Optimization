
# Supply Chain Optimization SaaS

This repository now includes a production-style SaaS layer around the offline RL supply chain optimizer:

- FastAPI backend with modular packages for `routes`, `services`, `rl_engine`, `database`, and `schemas`
- PostgreSQL-ready SQLAlchemy models with SQLite fallback for local development
- RL recommendation API backed by the trained CQL hybrid network in `rl_offline_dqn_optimized.pth`
- Simulation engine with RL, baseline, and manual-override policies
- React dashboard for CRUD, AI recommendations, simulation, scenario testing, and analytics

## Architecture

### Backend

Primary backend package:

- `supply_chain_management/saas_backend/app.py`
- `supply_chain_management/saas_backend/routes/`
- `supply_chain_management/saas_backend/services/`
- `supply_chain_management/saas_backend/rl_engine/`
- `supply_chain_management/saas_backend/database/`
- `supply_chain_management/saas_backend/schemas/`

Core domain files reused by the SaaS backend:

- `supply_chain_management/env.py`
- `supply_chain_management/schema.py`
- `supply_chain_management/rl_offline_dqn_optimized.pth`

### Frontend

React dashboard:

- `Supply-Chain-Optimization-frontend/Supply-Chain-Optimization-frontend/src/App.jsx`
- `.../src/components/AppShell.jsx`
- `.../src/pages/InventoryManagementPage.jsx`
- `.../src/pages/SimulationDashboardPage.jsx`
- `.../src/pages/RecommendationsPage.jsx`
- `.../src/pages/ScenarioTestingPage.jsx`
- `.../src/pages/AnalyticsPage.jsx`

## Features

### CRUD

- Products
- Suppliers
- Inventory records for central and regional nodes
- Orders and shipments

### RL decision engine

The trained network uses:

- shared layers `256 -> 128 -> 64`
- discrete Q-head for `noop`, `order`, `transfer`, `expedite`, `discount`
- continuous quantity head
- supplier selection head for `local` vs `overseas`

### Simulation and analytics

- `POST /api/recommend-action`
- `POST /api/simulate`
- `POST /api/scenario-test`
- `POST /api/compare-policies`
- `GET /api/analytics/summary`
- `GET /api/analytics/performance-over-time`
- `GET /api/analytics/action-distribution`
- `GET /api/analytics/profit-trends`
- `GET /api/analytics/scorecard`

Detailed payloads are documented in [API_CONTRACTS.md](supply_chain_management/saas_backend/API_CONTRACTS.md).

## Local Run

### 1. Backend

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

## Producer risk dashboard

The backend also exposes a producer-analysis view that pulls live news from SerpAPI and uses an LLM to score geopolitical severity and downstream product exposure.

Required environment variables for live news analysis:

- `SERPAPI_KEY`
- `API_BASE_URL` or `OPENAI_BASE_URL` for the scoring LLM
- `MODEL_NAME`
- `OPENAI_API_KEY` or `HF_TOKEN` if the selected LLM endpoint requires authentication

If the news or LLM credentials are missing, the dashboard falls back to cached heuristic analysis.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r supply_chain_management/requirements.txt
uvicorn supply_chain_management.saas_backend.app:app --reload --port 8000
```

Optional environment variables:

- `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/supply_chain`
- `RL_MODEL_PATH=E:\path\to\rl_offline_dqn_optimized.pth`

### 2. Frontend

In a second terminal:

```bash
cd Supply-Chain-Optimization-frontend/Supply-Chain-Optimization-frontend
npm install
npm run dev
```

Frontend dev server:

- `http://localhost:5173`

Backend API:

- `http://localhost:8000`

## Verification

Verified locally in this workspace:

- Python SaaS backend modules compile successfully
- RL model loads and returns a recommendation
- Simulation service runs successfully for an RL scenario
- React dashboard builds with `npm run build`
