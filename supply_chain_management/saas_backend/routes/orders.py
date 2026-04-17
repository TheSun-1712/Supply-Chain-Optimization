from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database.models import OrderShipment
from ..database.session import get_db
from ..schemas.domain import OrderCreate, OrderRead, OrderUpdate
from ..services.crud import create_entity, delete_entity, get_entity, list_entities, update_entity

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)):
    return list_entities(db, OrderShipment)


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    return create_entity(db, OrderShipment, payload)


@router.get("/{order_id}", response_model=OrderRead)
def read_order(order_id: int, db: Session = Depends(get_db)):
    return get_entity(db, OrderShipment, order_id)


@router.put("/{order_id}", response_model=OrderRead)
def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    return update_entity(db, get_entity(db, OrderShipment, order_id), payload)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_order(order_id: int, db: Session = Depends(get_db)):
    delete_entity(db, get_entity(db, OrderShipment, order_id))
