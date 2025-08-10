from __future__ import annotations

from fastapi import APIRouter
from ..services import storage

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.get("/export")
def export_data() -> dict:
    return storage.export_all()


@router.post("/import")
def import_data(payload: dict, replace: bool = True) -> dict:
    return storage.import_all(payload, replace=replace) 