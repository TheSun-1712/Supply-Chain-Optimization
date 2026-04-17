from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "Supply Chain RL SaaS API"
    app_version: str = "2.0.0"
    api_prefix: str = "/api"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./saas_supply_chain.db")
    model_path: str = os.getenv(
        "RL_MODEL_PATH",
        str(Path(__file__).resolve().parents[2] / "rl_offline_dqn_optimized.pth"),
    )
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    )


settings = Settings()
