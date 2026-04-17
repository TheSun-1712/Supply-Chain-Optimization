from __future__ import annotations

from typing import Any, Type

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session


def list_entities(db: Session, model: Type[Any]) -> list[Any]:
    return list(db.scalars(select(model).order_by(model.id)).all())


def get_entity(db: Session, model: Type[Any], entity_id: int) -> Any:
    instance = db.get(model, entity_id)
    if not instance:
        raise HTTPException(status_code=404, detail=f"{model.__name__} {entity_id} not found")
    return instance


def create_entity(db: Session, model: Type[Any], payload: BaseModel) -> Any:
    instance = model(**payload.model_dump())
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


def update_entity(db: Session, instance: Any, payload: BaseModel) -> Any:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(instance, field, value)
    db.commit()
    db.refresh(instance)
    return instance


def delete_entity(db: Session, instance: Any) -> None:
    db.delete(instance)
    db.commit()
