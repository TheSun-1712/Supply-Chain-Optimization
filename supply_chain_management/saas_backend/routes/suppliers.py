from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database.models import Supplier
from ..database.session import get_db
from ..schemas.domain import SupplierCreate, SupplierRead, SupplierUpdate
from ..services.crud import create_entity, delete_entity, get_entity, list_entities, update_entity

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierRead])
def list_suppliers(db: Session = Depends(get_db)):
    return list_entities(db, Supplier)


@router.post("", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    return create_entity(db, Supplier, payload)


@router.get("/{supplier_id}", response_model=SupplierRead)
def read_supplier(supplier_id: int, db: Session = Depends(get_db)):
    return get_entity(db, Supplier, supplier_id)


@router.put("/{supplier_id}", response_model=SupplierRead)
def update_supplier(supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db)):
    return update_entity(db, get_entity(db, Supplier, supplier_id), payload)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_supplier(supplier_id: int, db: Session = Depends(get_db)):
    delete_entity(db, get_entity(db, Supplier, supplier_id))
