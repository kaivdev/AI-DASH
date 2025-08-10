from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import List
from ..models import Transaction
from ..services import storage

router = APIRouter(prefix="/api/transactions", tags=["finance"])


@router.get("/", response_model=List[Transaction])
def list_transactions() -> List[Transaction]:
    return [Transaction(**n) for n in storage.list_items("transactions")]


@router.post("/", response_model=Transaction)
def create_transaction(tx: Transaction) -> Transaction:
    storage.add_item("transactions", tx.model_dump())
    return tx


@router.put("/{tx_id}", response_model=Transaction)
def update_transaction(tx_id: str, tx: Transaction) -> Transaction:
    try:
        updated = storage.update_item("transactions", tx_id, tx.model_dump())
        return Transaction(**updated)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{tx_id}")
def delete_transaction(tx_id: str) -> dict:
    if storage.delete_item("transactions", tx_id):
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Transaction not found") 