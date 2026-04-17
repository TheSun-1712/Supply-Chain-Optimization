from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .session import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Product(TimestampMixin, Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    category: Mapped[str] = mapped_column(String(80), default="general")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, default=25.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    inventory_records: Mapped[list["InventoryRecord"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    orders: Mapped[list["OrderShipment"]] = relationship(back_populates="product")


class Supplier(TimestampMixin, Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    supplier_type: Mapped[str] = mapped_column(String(24), default="local")
    lead_time_days: Mapped[int] = mapped_column(Integer, default=2)
    unit_cost: Mapped[float] = mapped_column(Float, default=10.0)
    reliability_score: Mapped[float] = mapped_column(Float, default=0.95)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    orders: Mapped[list["OrderShipment"]] = relationship(back_populates="supplier")


class InventoryRecord(TimestampMixin, Base):
    __tablename__ = "inventory_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    location_type: Mapped[str] = mapped_column(String(24), index=True)
    location_name: Mapped[str] = mapped_column(String(120), index=True)
    on_hand: Mapped[int] = mapped_column(Integer, default=0)
    backlog: Mapped[int] = mapped_column(Integer, default=0)
    in_transit: Mapped[int] = mapped_column(Integer, default=0)
    reorder_point: Mapped[int] = mapped_column(Integer, default=50)
    safety_stock: Mapped[int] = mapped_column(Integer, default=25)

    product: Mapped[Product] = relationship(back_populates="inventory_records")


class OrderShipment(TimestampMixin, Base):
    __tablename__ = "order_shipments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    order_type: Mapped[str] = mapped_column(String(24), default="order")
    status: Mapped[str] = mapped_column(String(24), default="planned")
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)
    source_location: Mapped[str] = mapped_column(String(120), default="supplier")
    destination_location: Mapped[str] = mapped_column(String(120), default="central")
    expected_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    product: Mapped[Product] = relationship(back_populates="orders")
    supplier: Mapped[Optional[Supplier]] = relationship(back_populates="orders")


class SimulationRun(TimestampMixin, Base):
    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="Scenario Run")
    task_id: Mapped[str] = mapped_column(String(24), default="medium")
    policy: Mapped[str] = mapped_column(String(24), default="rl")
    steps_requested: Mapped[int] = mapped_column(Integer, default=14)
    scenario: Mapped[dict] = mapped_column(JSON, default=dict)
    initial_state: Mapped[dict] = mapped_column(JSON, default=dict)
    final_state: Mapped[dict] = mapped_column(JSON, default=dict)
    total_profit: Mapped[float] = mapped_column(Float, default=0.0)
    avg_service_level: Mapped[float] = mapped_column(Float, default=0.0)
    ending_backlog: Mapped[int] = mapped_column(Integer, default=0)

    steps: Mapped[list["SimulationStep"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class SimulationStep(Base):
    __tablename__ = "simulation_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("simulation_runs.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer)
    action_type: Mapped[str] = mapped_column(String(24))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    supplier: Mapped[str] = mapped_column(String(24), default="local")
    reward: Mapped[float] = mapped_column(Float, default=0.0)
    profit: Mapped[float] = mapped_column(Float, default=0.0)
    service_level: Mapped[float] = mapped_column(Float, default=0.0)
    backlog: Mapped[int] = mapped_column(Integer, default=0)
    state_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)

    run: Mapped[SimulationRun] = relationship(back_populates="steps")
