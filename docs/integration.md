# Integration Notes

## PostgreSQL schema

```sql
CREATE TABLE simulation_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL,
  day INTEGER NOT NULL,
  backlog NUMERIC NOT NULL,
  central_inv NUMERIC NOT NULL,
  regional_inv NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  action TEXT NOT NULL,
  stochastic_noise_value NUMERIC NOT NULL,
  agent_id TEXT NOT NULL,
  hash_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## FastAPI endpoints

```python
from fastapi import FastAPI
from sqlalchemy import text

app = FastAPI()

@app.get("/api/latest-run")
async def latest_run(session=Depends(get_session)):
    rows = session.execute(
        text(
            """
            SELECT day, backlog, central_inv, regional_inv, profit
            FROM simulation_logs
            WHERE run_id = (
                SELECT run_id
                FROM simulation_logs
                ORDER BY created_at DESC
                LIMIT 1
            )
            ORDER BY day
            """
        )
    ).mappings().all()
    return {
        "controls": {"marketNoise": 0.28, "climateStability": 0.81},
        "inventory": [
            {
                "day": row["day"],
                "backlog": row["backlog"],
                "centralInv": row["central_inv"],
                "regionalInv": row["regional_inv"],
                "profit": row["profit"],
            }
            for row in rows
        ],
    }

@app.get("/api/logs")
async def logs(session=Depends(get_session)):
    rows = session.execute(
        text(
            """
            SELECT
              created_at AS timestamp,
              agent_id,
              action,
              stochastic_noise_value,
              profit AS profit_impact,
              hash_id,
              (profit = (SELECT MAX(profit) FROM simulation_logs)) AS is_best
            FROM simulation_logs
            ORDER BY created_at DESC
            LIMIT 100
            """
        )
    ).mappings().all()
    return [dict(row) for row in rows]
```

## Best-profit hashing task

```python
import hashlib
import json

async def anchor_best_profit(session, sei_client):
    row = session.execute(
        text(
            """
            SELECT *
            FROM simulation_logs
            ORDER BY profit DESC, created_at DESC
            LIMIT 1
            """
        )
    ).mappings().first()

    payload = json.dumps(dict(row), sort_keys=True, default=str).encode("utf-8")
    sha256_hash = hashlib.sha256(payload).hexdigest()

    tx_hash = await sei_client.anchor_hash(sha256_hash)

    session.execute(
        text("UPDATE simulation_logs SET hash_id = :tx_hash WHERE id = :id"),
        {"tx_hash": tx_hash, "id": row["id"]},
    )
    session.commit()
```

## Frontend expectations

- `/api/latest-run` returns `controls`, `generatedAt`, and an `inventory` array with 30 simulation days.
- `/api/logs` returns `timestamp`, `agentId`, `action`, `stochastic_noise_value`, `profitImpact`, `hashId`, and `isBest`.
- `/api/sei-status` returns the current anchor state, the Sei transaction hash, the best profit amount, and the SHA-256 digest.
