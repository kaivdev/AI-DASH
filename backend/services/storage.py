from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from typing import Dict, List, Any

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
DATA_PATH = STORAGE_DIR / "data.json"
_lock = RLock()

_INITIAL_DATA = {"notes": [], "tasks": [], "transactions": []}


def _ensure_storage() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_PATH.exists():
        DATA_PATH.write_text(json.dumps(_INITIAL_DATA, ensure_ascii=False, indent=2), encoding="utf-8")


def load_data() -> Dict[str, List[Dict[str, Any]]]:
    _ensure_storage()
    with _lock:
        try:
            return json.loads(DATA_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            DATA_PATH.write_text(json.dumps(_INITIAL_DATA), encoding="utf-8")
            return _INITIAL_DATA.copy()


def save_data(data: Dict[str, List[Dict[str, Any]]]) -> None:
    with _lock:
        DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# Generic helpers

def list_items(kind: str) -> List[Dict[str, Any]]:
    data = load_data()
    return data.get(kind, [])


def add_item(kind: str, item: Dict[str, Any]) -> Dict[str, Any]:
    data = load_data()
    items = data.setdefault(kind, [])
    items.append(item)
    save_data(data)
    return item


def update_item(kind: str, item_id: str, update: Dict[str, Any]) -> Dict[str, Any]:
    data = load_data()
    items = data.setdefault(kind, [])
    for idx, itm in enumerate(items):
        if itm.get("id") == item_id:
            new_item = {**itm, **update, "id": item_id}
            items[idx] = new_item
            save_data(data)
            return new_item
    raise KeyError(f"{kind} with id={item_id} not found")


def delete_item(kind: str, item_id: str) -> bool:
    data = load_data()
    items = data.setdefault(kind, [])
    new_items = [itm for itm in items if itm.get("id") != item_id]
    deleted = len(new_items) != len(items)
    if deleted:
        data[kind] = new_items
        save_data(data)
    return deleted


def export_all() -> Dict[str, Any]:
    return load_data()


def import_all(payload: Dict[str, Any], replace: bool = True) -> Dict[str, Any]:
    current = load_data()
    if replace:
        merged = {
            "notes": list(payload.get("notes", [])),
            "tasks": list(payload.get("tasks", [])),
            "transactions": list(payload.get("transactions", [])),
        }
    else:
        merged = {
            "notes": current.get("notes", []) + payload.get("notes", []),
            "tasks": current.get("tasks", []) + payload.get("tasks", []),
            "transactions": current.get("transactions", []) + payload.get("transactions", []),
        }
    save_data(merged)
    return merged 