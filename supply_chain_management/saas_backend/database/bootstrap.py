from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import InventoryRecord, Product, Supplier
from .session import Base, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def seed_reference_data(db: Session) -> None:
    has_products = db.scalar(select(Product.id).limit(1))
    if has_products:
        return

    product = Product(
        sku="SKU-RL-001",
        name="Smart Thermostat",
        category="electronics",
        description="Demo product for RL-guided supply chain optimization.",
        unit_price=26.0,
    )
    local_supplier = Supplier(
        name="Metro Components",
        supplier_type="local",
        lead_time_days=2,
        unit_cost=11.0,
        reliability_score=0.97,
    )
    overseas_supplier = Supplier(
        name="Pacific Source Ltd",
        supplier_type="overseas",
        lead_time_days=5,
        unit_cost=6.5,
        reliability_score=0.88,
    )
    db.add_all([product, local_supplier, overseas_supplier])
    db.flush()

    db.add_all(
        [
            InventoryRecord(
                product_id=product.id,
                location_type="central",
                location_name="National DC",
                on_hand=250,
                backlog=0,
                in_transit=30,
                reorder_point=120,
                safety_stock=80,
            ),
            InventoryRecord(
                product_id=product.id,
                location_type="regional",
                location_name="West Region",
                on_hand=130,
                backlog=15,
                in_transit=20,
                reorder_point=90,
                safety_stock=60,
            ),
        ]
    )
    db.commit()
