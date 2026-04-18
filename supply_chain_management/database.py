from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime
import datetime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./supply_chain_rl.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class RLTrajectory(Base):
    __tablename__ = "rl_trajectories"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String)
    day = Column(Integer)
    observation_state_json = Column(Text)
    action_taken_json = Column(Text)
    reward = Column(Float)

class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String)
    agent_type = Column(String) # 'math' or 'nn'
    final_profit = Column(Float)
    avg_service_level = Column(Float)
    score = Column(Float)
    steps = Column(Integer)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)