from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel


class Note(BaseModel):
    id: str
    date: str
    title: Optional[str] = None
    content: str
    tags: List[str] = []


class Task(BaseModel):
    id: str
    content: str
    priority: Literal["L", "M", "H"] = "M"
    due: Optional[str] = None
    done: bool = False


class Transaction(BaseModel):
    id: str
    type: Literal["income", "expense"]
    amount: float
    date: str
    category: Optional[str] = None
    description: Optional[str] = None 