from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    sessions: Mapped[List["SimulationSession"]] = relationship(back_populates="user")

class SimulationSession(Base):
    __tablename__ = "simulation_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    task_id: Mapped[str] = mapped_column(String(50))
    horizon_days: Mapped[int] = mapped_column(Integer)
    seed: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # The final cumulative profit when the simulation finishes
    final_profit: Mapped[Optional[float]] = mapped_column(Float, nullable=True) 

    user: Mapped["User"] = relationship(back_populates="sessions")
    trajectories: Mapped[List["RLTrajectory"]] = relationship(back_populates="session")

class RLTrajectory(Base):
    """
    Stores an entire tuple of State, Action, Reward, Next State (S, A, R, S') 
    which is fundamentally what RL agents loop over to train dynamically.
    """
    __tablename__ = "rl_trajectories"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("simulation_sessions.id"))
    day: Mapped[int] = mapped_column(Integer)
    
    # Store complex JSON structures compactly in the DB
    observation_state_json: Mapped[str] = mapped_column(Text) 
    action_taken_json: Mapped[str] = mapped_column(Text)
    
    # Reward tracking
    step_profit: Mapped[float] = mapped_column(Float)
    service_level: Mapped[float] = mapped_column(Float)
    
    # Next State / End conditions
    next_state_json: Mapped[str] = mapped_column(Text)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["SimulationSession"] = relationship(back_populates="trajectories")

# Initialize SQLite database (Generates the file locally, can be hot-swapped to Postgres URL later)
DATABASE_URL = "sqlite:///supply_chain.db"
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Ensure there is at least one Default user for Hackathon ease-of-use
    with SessionLocal() as db:
        admin = db.query(User).filter_by(username="admin").first()
        if not admin:
            admin = User(username="admin")
            db.add(admin)
            db.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at supply_chain.db!")
