from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database.models import Product
from ..database.session import get_db
from ..schemas.domain import ProductCreate, ProductRead, ProductUpdate
from ..services.crud import create_entity, delete_entity, get_entity, list_entities, update_entity

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(db: Session = Depends(get_db)):
    return list_entities(db, Product)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return create_entity(db, Product, payload)


@router.get("/{product_id}", response_model=ProductRead)
def read_product(product_id: int, db: Session = Depends(get_db)):
    return get_entity(db, Product, product_id)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    return update_entity(db, get_entity(db, Product, product_id), payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_product(product_id: int, db: Session = Depends(get_db)):
    delete_entity(db, get_entity(db, Product, product_id))
