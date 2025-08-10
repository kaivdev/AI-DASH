from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import List
from ..models import Note
from ..services import storage

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("/", response_model=List[Note])
def list_notes() -> List[Note]:
    return [Note(**n) for n in storage.list_items("notes")]


@router.post("/", response_model=Note)
def create_note(note: Note) -> Note:
    storage.add_item("notes", note.model_dump())
    return note


@router.put("/{note_id}", response_model=Note)
def update_note(note_id: str, note: Note) -> Note:
    try:
        updated = storage.update_item("notes", note_id, note.model_dump())
        return Note(**updated)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{note_id}")
def delete_note(note_id: str) -> dict:
    if storage.delete_item("notes", note_id):
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Note not found") 