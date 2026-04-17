from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database.models import InventoryRecord
from ..database.session import get_db
from ..schemas.domain import InventoryCreate, InventoryRead, InventoryUpdate
from ..services.crud import create_entity, delete_entity, get_entity, list_entities, update_entity

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryRead])
def list_inventory(db: Session = Depends(get_db)):
    return list_entities(db, InventoryRecord)


@router.post("", response_model=InventoryRead, status_code=status.HTTP_201_CREATED)
def create_inventory(payload: InventoryCreate, db: Session = Depends(get_db)):
    return create_entity(db, InventoryRecord, payload)


@router.get("/{inventory_id}", response_model=InventoryRead)
def read_inventory(inventory_id: int, db: Session = Depends(get_db)):
    return get_entity(db, InventoryRecord, inventory_id)


@router.put("/{inventory_id}", response_model=InventoryRead)
def update_inventory(inventory_id: int, payload: InventoryUpdate, db: Session = Depends(get_db)):
    return update_entity(db, get_entity(db, InventoryRecord, inventory_id), payload)


@router.delete("/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_inventory(inventory_id: int, db: Session = Depends(get_db)):
    delete_entity(db, get_entity(db, InventoryRecord, inventory_id))
