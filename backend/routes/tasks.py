from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import List
from ..models import Task
from ..services import storage

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("/", response_model=List[Task])
def list_tasks() -> List[Task]:
    return [Task(**n) for n in storage.list_items("tasks")]


@router.post("/", response_model=Task)
def create_task(task: Task) -> Task:
    storage.add_item("tasks", task.model_dump())
    return task


@router.put("/{task_id}", response_model=Task)
def update_task(task_id: str, task: Task) -> Task:
    try:
        updated = storage.update_item("tasks", task_id, task.model_dump())
        return Task(**updated)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{task_id}")
def delete_task(task_id: str) -> dict:
    if storage.delete_item("tasks", task_id):
        return {"ok": True}
    raise HTTPException(status_code=404, detail="Task not found") 