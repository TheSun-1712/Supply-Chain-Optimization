# FlowSync

React + Tailwind dashboard for an AI-driven production scheduling system with PostgreSQL-backed RL logs and Sei Atlantic-2 verification cues.

## Run locally

```bash
npm install
npm run dev
```

## Included UI surfaces

- Landing page with a `Launch Agentic Suite` call-to-action
- Fixed sidebar navigation for `Dashboard`, `Financials`, and `Logs`
- Separate `Producer` dashboard for upstream news, geopolitical severity, and downstream device exposure
- Environment controls for `Market Noise` and `Climate Stability`
- Recharts-based inventory and profit forecast visualizations
- Prediction logs table with a `Verify on Sei` badge for the max-profit row
- Sei transaction status widget for the best anchored record

## Backend contract

The frontend is already shaped for these endpoints:

- `GET /api/latest-run`
- `GET /api/logs`
- `GET /api/sei-status`

If those are unavailable, the UI falls back to realistic static sample data in `src/data/mockData.js`.

## Data flow

1. Python RL model writes each simulation step into PostgreSQL.
2. FastAPI queries the most recent run for the dashboard and financial charts.
3. A background task selects the top profit row, hashes it with SHA-256, and submits the proof to Sei Atlantic-2.
4. The logs endpoint returns `is_best: true` for the highest-profit row, which the UI converts into the Sei verification badge.

See `docs/integration.md` for a concrete FastAPI + SQL sketch.
