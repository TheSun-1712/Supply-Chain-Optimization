
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

From repo root:

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
