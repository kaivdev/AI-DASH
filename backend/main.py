from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import notes, tasks, finance, meta

app = FastAPI(title="AI Life Dashboard API", version="0.1.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(notes.router)
app.include_router(tasks.router)
app.include_router(finance.router)


@app.get("/")
def root() -> dict:
    return {"name": "AI Life Dashboard API", "version": "0.1.0"} 