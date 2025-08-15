from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import requests
from datetime import datetime, timedelta, date
import re
from dotenv import load_dotenv
load_dotenv()

import models
import schemas
import crud
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Ensure new columns exist for SQLite (simple online migration)
from sqlalchemy import text

def _ensure_sqlite_columns():
    # Only run on SQLite; no-op for PostgreSQL
    if engine.dialect.name != "sqlite":
        return
    try:
        with engine.connect() as conn:
            # employees.hourly_rate
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info('employees')")).fetchall()]
            if 'hourly_rate' not in cols:
                conn.execute(text("ALTER TABLE employees ADD COLUMN hourly_rate INTEGER"))
            # project_members.hourly_rate
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info('project_members')")).fetchall()]
            if 'hourly_rate' not in cols:
                conn.execute(text("ALTER TABLE project_members ADD COLUMN hourly_rate INTEGER"))
            # tasks new columns
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info('tasks')")).fetchall()]
            if 'hours_spent' not in cols:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN hours_spent REAL DEFAULT 0.0 NOT NULL"))
            if 'billable' not in cols:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN billable BOOLEAN DEFAULT 1 NOT NULL"))
            if 'hourly_rate_override' not in cols:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN hourly_rate_override INTEGER"))
            if 'applied_hourly_rate' not in cols:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN applied_hourly_rate INTEGER"))
            # transactions.project_id
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info('transactions')")).fetchall()]
            if 'project_id' not in cols:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN project_id TEXT"))
            conn.commit()
    except Exception as e:
        print(f"Migration check error: {e}")

_ensure_sqlite_columns()

# Ensure PostgreSQL extra columns/constraints exist
from sqlalchemy import text as _text

def _ensure_postgres_schema():
    if engine.dialect.name != "postgresql":
        return
    try:
        with engine.connect() as conn:
            # employees.user_id unique FK
            conn.execute(_text("ALTER TABLE IF EXISTS employees ADD COLUMN IF NOT EXISTS user_id TEXT UNIQUE"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='employees' AND constraint_name='employees_user_fk') THEN ALTER TABLE employees ADD CONSTRAINT employees_user_fk FOREIGN KEY (user_id) REFERENCES users(id); END IF; END $$;"))
            # notes/reading_items/goals.user_id
            conn.execute(_text("ALTER TABLE IF EXISTS notes ADD COLUMN IF NOT EXISTS user_id TEXT"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='notes' AND constraint_name='notes_user_fk') THEN ALTER TABLE notes ADD CONSTRAINT notes_user_fk FOREIGN KEY (user_id) REFERENCES users(id); END IF; END $$;"))
            conn.execute(_text("ALTER TABLE IF EXISTS reading_items ADD COLUMN IF NOT EXISTS user_id TEXT"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='reading_items' AND constraint_name='reading_items_user_fk') THEN ALTER TABLE reading_items ADD CONSTRAINT reading_items_user_fk FOREIGN KEY (user_id) REFERENCES users(id); END IF; END $$;"))
            conn.execute(_text("ALTER TABLE IF EXISTS goals ADD COLUMN IF NOT EXISTS user_id TEXT"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='goals' AND constraint_name='goals_user_fk') THEN ALTER TABLE goals ADD CONSTRAINT goals_user_fk FOREIGN KEY (user_id) REFERENCES users(id); END IF; END $$;"))
            # unique membership
            conn.execute(_text("CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_pair ON project_members(project_id, employee_id)"))
            # task approval columns
            conn.execute(_text("ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE"))
            conn.execute(_text("ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ"))
            conn.commit()
    except Exception as e:
        print(f"PostgreSQL schema ensure error: {e}")

_ensure_postgres_schema()

app = FastAPI(title="Dashboard API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory and static mount
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

@app.on_event("startup")
def startup_seed():
    # Ensure default registration code and owner user exist
    db = next(get_db())
    try:
        crud.ensure_owner_and_code(db)
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "Dashboard API is running"}

# --- Auth endpoints ---
@app.post("/api/auth/register", response_model=schemas.AuthResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # Verify code
    code = db.query(models.RegistrationCode).filter(models.RegistrationCode.code == payload.code, models.RegistrationCode.is_active == True).first()
    if not code:
        raise HTTPException(status_code=400, detail="Invalid registration code")

    existing = crud.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate confirm password
    if getattr(payload, "confirm_password", None) and payload.confirm_password != payload.password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # Compose name from first/last if provided
    name = None
    if getattr(payload, "first_name", None) or getattr(payload, "last_name", None):
        name = f"{payload.first_name or ''} {payload.last_name or ''}".strip()

    user = crud.create_user(db, email=payload.email, password=payload.password, role="user", name=name)
    # Ensure employee record linked to this user
    crud.ensure_employee_for_user(db, user, getattr(payload, "first_name", None), getattr(payload, "last_name", None))

    token = crud.create_session(db, user.id)
    return {"user": crud.serialize_user(user), "token": token}

@app.post("/api/auth/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if not user or not crud.verify_password(user, payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = crud.create_session(db, user.id)
    return {"user": crud.serialize_user(user), "token": token}

@app.get("/api/auth/me", response_model=schemas.MeResponse)
def me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return crud.serialize_user(user)

@app.put("/api/auth/profile", response_model=schemas.MeResponse)
def update_profile(payload: schemas.UserUpdate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    profile_patch = payload.profile.model_dump(exclude_unset=True) if payload.profile else None
    updated = crud.update_user_profile(db, user.id, payload.name, profile_patch)
    return crud.serialize_user(updated)

@app.post("/api/auth/avatar", response_model=schemas.MeResponse)
def upload_avatar(authorization: Optional[str] = Header(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Save file
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    safe_name = f"{user.id}{ext}"
    dst_path = os.path.join(AVATAR_DIR, safe_name)
    with open(dst_path, "wb") as out:
        out.write(file.file.read())

    # Update profile
    rel_url = f"/uploads/avatars/{safe_name}"
    abs_url = f"http://localhost:8000{rel_url}"
    crud.update_user_profile(db, user.id, None, {"avatar_url": abs_url})
    user = crud.get_user_by_email(db, user.email)
    return crud.serialize_user(user)

@app.put("/api/auth/password", response_model=schemas.MessageResponse)
def change_password(payload: schemas.PasswordChange, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    ok = crud.change_user_password(db, user.id, payload.current_password, payload.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid current password")
    return {"message": "Password updated"}

@app.post("/api/auth/logout", response_model=schemas.MessageResponse)
def logout(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        crud.delete_session(db, token)
    return {"message": "Logged out"}

# Employee endpoints
@app.get("/api/employees", response_model=List[schemas.Employee])
def get_employees(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
            return [emp] if emp else []
    return crud.get_employees(db)

@app.get("/api/employees/{employee_id}", response_model=schemas.Employee)
def get_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.post("/api/employees", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    return crud.create_employee(db, employee)

@app.put("/api/employees/{employee_id}", response_model=schemas.Employee)
def update_employee(employee_id: str, employee: schemas.EmployeeUpdate, db: Session = Depends(get_db)):
    db_employee = crud.update_employee(db, employee_id, employee)
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return db_employee

@app.put("/api/employees/{employee_id}/status", response_model=schemas.Employee)
def update_employee_status(employee_id: str, status_update: schemas.EmployeeStatusUpdate, db: Session = Depends(get_db)):
    db_employee = crud.update_employee_status(db, employee_id, status_update)
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return db_employee

@app.delete("/api/employees/{employee_id}", response_model=schemas.MessageResponse)
def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    if crud.delete_employee(db, employee_id):
        return {"message": "Employee deleted successfully"}
    raise HTTPException(status_code=404, detail="Employee not found")

# Project endpoints
@app.get("/api/projects", response_model=List[schemas.Project])
def get_projects(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # If auth provided, scope for non-admin users
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            return crud.list_projects_for_user(db, user)
    return crud.get_projects(db)

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.post("/api/projects", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can create projects
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    return crud.create_project(db, project)

@app.put("/api/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: str, project: schemas.ProjectUpdate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can update projects
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    db_project = crud.update_project(db, project_id, project)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.delete("/api/projects/{project_id}", response_model=schemas.MessageResponse)
def delete_project(project_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can delete projects
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    if crud.delete_project(db, project_id):
        return {"message": "Project deleted successfully"}
    raise HTTPException(status_code=404, detail="Project not found")

@app.post("/api/projects/{project_id}/members", response_model=schemas.MessageResponse)
def add_project_member(project_id: str, member: schemas.ProjectMemberAdd, db: Session = Depends(get_db)):
    if crud.add_project_member(db, project_id, member.employee_id):
        return {"message": "Member added successfully"}
    raise HTTPException(status_code=400, detail="Member already exists or invalid data")

@app.put("/api/projects/{project_id}/members/{employee_id}/rate", response_model=schemas.MessageResponse)
def set_project_member_rate(project_id: str, employee_id: str, hourly_rate: int | None = None, db: Session = Depends(get_db)):
    crud.set_project_member_rate(db, project_id, employee_id, hourly_rate)
    return {"message": "Rate updated"}

@app.delete("/api/projects/{project_id}/members/{employee_id}", response_model=schemas.MessageResponse)
def remove_project_member(project_id: str, employee_id: str, db: Session = Depends(get_db)):
    if crud.remove_project_member(db, project_id, employee_id):
        return {"message": "Member removed successfully"}
    raise HTTPException(status_code=404, detail="Member not found")

@app.post("/api/projects/{project_id}/links", response_model=schemas.ProjectLink)
def add_project_link(project_id: str, link: schemas.ProjectLinkAdd, db: Session = Depends(get_db)):
    return crud.add_project_link(db, project_id, link)

@app.delete("/api/projects/{project_id}/links/{link_id}", response_model=schemas.MessageResponse)
def remove_project_link(project_id: str, link_id: str, db: Session = Depends(get_db)):
    if crud.remove_project_link(db, project_id, link_id):
        return {"message": "Link removed successfully"}
    raise HTTPException(status_code=404, detail="Link not found")

# Transaction endpoints
@app.get("/api/transactions", response_model=List[schemas.Transaction])
def get_transactions(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            # скрываем финансы для обычных пользователей
            return []
    return crud.get_transactions(db)

@app.get("/api/transactions/{transaction_id}", response_model=schemas.Transaction)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    transaction = crud.get_transaction(db, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@app.post("/api/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    return crud.create_transaction(db, transaction)

@app.put("/api/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: str, transaction: schemas.TransactionUpdate, db: Session = Depends(get_db)):
    db_transaction = crud.update_transaction(db, transaction_id, transaction)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction

@app.delete("/api/transactions/{transaction_id}", response_model=schemas.MessageResponse)
def delete_transaction(transaction_id: str, db: Session = Depends(get_db)):
    if crud.delete_transaction(db, transaction_id):
        return {"message": "Transaction deleted successfully"}
    raise HTTPException(status_code=404, detail="Transaction not found")

# Task endpoints
@app.get("/api/tasks", response_model=List[schemas.Task])
def get_tasks(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            return crud.list_tasks_for_user(db, user)
    return crud.get_tasks(db)

@app.get("/api/tasks/{task_id}", response_model=schemas.Task)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/api/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can create tasks
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    return crud.create_task(db, task)

@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: str, task: schemas.TaskUpdate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Non-admins may only update their own task hours_spent and done flag; everything else is forbidden
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            # Fetch task and check ownership via employee mapping
            t = crud.get_task(db, task_id)
            if not t:
                raise HTTPException(status_code=404, detail="Task not found")
            emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
            if not emp or t.assigned_to != emp.id:
                raise HTTPException(status_code=403, detail="Forbidden")
            # restrict fields
            allowed = schemas.TaskUpdate(hours_spent=task.hours_spent, done=task.done)
            task = allowed
    db_task = crud.update_task(db, task_id, task)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.put("/api/tasks/{task_id}/toggle", response_model=schemas.Task)
def toggle_task(task_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Role-aware toggle: employee marks done -> awaiting; admin click on awaiting -> approve; admin toggling sets approval with done
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)

    current = crud.get_task(db, task_id)
    if not current:
        raise HTTPException(status_code=404, detail="Task not found")

    is_admin = bool(user and user.role in ("owner", "admin"))

    # If admin clicks on awaiting (done=true, approved=false) -> approve without flipping done
    if is_admin and current.done and not (getattr(current, "approved", False) or False):
        try:
            with engine.begin() as conn:
                conn.execute(_text("UPDATE tasks SET approved = TRUE, approved_at = NOW() WHERE id = :id"), {"id": task_id})
            # refresh
            current = crud.get_task(db, task_id)
            return current
        except Exception:
            pass

    # Otherwise perform normal toggle
    db_task = crud.toggle_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Set approval flags based on actor
    try:
        if db_task.done:
            if is_admin:
                with engine.begin() as conn:
                    conn.execute(_text("UPDATE tasks SET approved = TRUE, approved_at = NOW() WHERE id = :id"), {"id": task_id})
            else:
                with engine.begin() as conn:
                    conn.execute(_text("UPDATE tasks SET approved = FALSE, approved_at = NULL WHERE id = :id"), {"id": task_id})
        else:
            with engine.begin() as conn:
                conn.execute(_text("UPDATE tasks SET approved = FALSE, approved_at = NULL WHERE id = :id"), {"id": task_id})
    except Exception:
        pass

    return crud.get_task(db, task_id)

@app.delete("/api/tasks/{task_id}", response_model=schemas.MessageResponse)
def delete_task(task_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can delete tasks
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    if crud.delete_task(db, task_id):
        return {"message": "Task deleted successfully"}
    raise HTTPException(status_code=404, detail="Task not found")

# Goal endpoints
@app.get("/api/goals", response_model=List[schemas.Goal])
def get_goals(db: Session = Depends(get_db)):
    return crud.get_goals(db)

@app.get("/api/goals/{goal_id}", response_model=schemas.Goal)
def get_goal(goal_id: str, db: Session = Depends(get_db)):
    goal = crud.get_goal(db, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@app.post("/api/goals", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db)):
    return crud.create_goal(db, goal)

@app.put("/api/goals/{goal_id}", response_model=schemas.Goal)
def update_goal(goal_id: str, goal: schemas.GoalUpdate, db: Session = Depends(get_db)):
    db_goal = crud.update_goal(db, goal_id, goal)
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal

@app.put("/api/goals/{goal_id}/progress")
def update_goal_progress(goal_id: str, progress: int, db: Session = Depends(get_db)):
    db_goal = crud.update_goal_progress(db, goal_id, progress)
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal

@app.delete("/api/goals/{goal_id}", response_model=schemas.MessageResponse)
def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    if crud.delete_goal(db, goal_id):
        return {"message": "Goal deleted successfully"}
    raise HTTPException(status_code=404, detail="Goal not found")

# Reading Item endpoints
@app.get("/api/reading", response_model=List[schemas.ReadingItem])
def get_reading_items(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            # вернём только его записи
            return db.query(models.ReadingItem).filter(models.ReadingItem.user_id == user.id).order_by(models.ReadingItem.added_date.desc()).all()
    return crud.get_reading_items(db)

@app.get("/api/reading/{item_id}", response_model=schemas.ReadingItem)
def get_reading_item(item_id: str, db: Session = Depends(get_db)):
    item = crud.get_reading_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return item

@app.post("/api/reading", response_model=schemas.ReadingItem)
def create_reading_item(item: schemas.ReadingItemCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    uid = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        uid = user.id if user else None
    return crud.create_reading_item(db, item, user_id=uid)

@app.put("/api/reading/{item_id}", response_model=schemas.ReadingItem)
def update_reading_item(item_id: str, item: schemas.ReadingItemUpdate, db: Session = Depends(get_db)):
    db_item = crud.update_reading_item(db, item_id, item)
    if not db_item:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return db_item

@app.put("/api/reading/{item_id}/reading", response_model=schemas.ReadingItem)
def mark_as_reading(item_id: str, db: Session = Depends(get_db)):
    db_item = crud.mark_reading_item_as_reading(db, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return db_item

@app.put("/api/reading/{item_id}/completed", response_model=schemas.ReadingItem)
def mark_as_completed(item_id: str, notes: str = None, db: Session = Depends(get_db)):
    db_item = crud.mark_reading_item_as_completed(db, item_id, notes)
    if not db_item:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return db_item

@app.delete("/api/reading/{item_id}", response_model=schemas.MessageResponse)
def delete_reading_item(item_id: str, db: Session = Depends(get_db)):
    if crud.delete_reading_item(db, item_id):
        return {"message": "Reading item deleted successfully"}
    raise HTTPException(status_code=404, detail="Reading item not found")

# Note endpoints
@app.get("/api/notes", response_model=List[schemas.Note])
def get_notes(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            return db.query(models.Note).filter(models.Note.user_id == user.id).order_by(models.Note.date.desc()).all()
    return crud.get_notes(db)

@app.get("/api/notes/{note_id}", response_model=schemas.Note)
def get_note(note_id: str, db: Session = Depends(get_db)):
    note = crud.get_note(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.post("/api/notes", response_model=schemas.Note)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    uid = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        uid = user.id if user else None
    return crud.create_note(db, note, user_id=uid)

@app.put("/api/notes/{note_id}", response_model=schemas.Note)
def update_note(note_id: str, note: schemas.NoteUpdate, db: Session = Depends(get_db)):
    db_note = crud.update_note(db, note_id, note)
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note

@app.delete("/api/notes/{note_id}", response_model=schemas.MessageResponse)
def delete_note(note_id: str, db: Session = Depends(get_db)):
    if crud.delete_note(db, note_id):
        return {"message": "Note deleted successfully"}
    raise HTTPException(status_code=404, detail="Note not found")

# --- AI command endpoint ---
def _call_ollama(prompt: str) -> str:
    errors: list[str] = []
    # 1) Ollama generate
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=120,
        )
        if r.ok:
            j = r.json()
            if isinstance(j, dict) and j.get("response"):
                return j["response"]
        else:
            errors.append(f"generate {r.status_code}")
    except Exception as e:
        errors.append(f"generate {e}")

    # 2) Ollama chat
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
            },
            timeout=120,
        )
        if r.ok:
            j = r.json()
            if isinstance(j, dict):
                if j.get("message") and j["message"].get("content"):
                    return j["message"]["content"]
                if j.get("response"):
                    return j["response"]
        else:
            errors.append(f"chat {r.status_code}")
    except Exception as e:
        errors.append(f"chat {e}")

    # 3) OpenAI-compatible chat (LM Studio): /v1/chat/completions
    try:
        r = requests.post(
            f"{OLLAMA_URL}/v1/chat/completions",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
            },
            timeout=120,
        )
        if r.ok:
            j = r.json()
            if isinstance(j, dict) and j.get("choices"):
                content = j["choices"][0]["message"]["content"]
                return content
        else:
            errors.append(f"v1/chat {r.status_code}")
    except Exception as e:
        errors.append(f"v1/chat {e}")

    # 4) OpenAI-compatible completions: /v1/completions (если модель текстовая)
    try:
        r = requests.post(
            f"{OLLAMA_URL}/v1/completions",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=120,
        )
        if r.ok:
            j = r.json()
            if isinstance(j, dict) and j.get("choices"):
                return j["choices"][0]["text"]
        else:
            errors.append(f"v1/compl {r.status_code}")
    except Exception as e:
        errors.append(f"v1/compl {e}")

    raise HTTPException(status_code=500, detail=f"LLM error: {'; '.join(errors) or 'unknown'}")

def _nlg(facts) -> str:
    """Generate a human-friendly short answer from structured facts using the same LLM backend.
    The model is instructed to use ONLY provided facts (no hallucinations). Returns plain text.
    """
    try:
        import json
        if isinstance(facts, str):
            facts_text = facts
        else:
            facts_text = json.dumps(facts, ensure_ascii=False)
        system = (
            "Ты ассистент дашборда. Сформируй короткий, человеко‑понятный ответ на русском "
            "по приведённым ФАКТАМ. Не выдумывай, не добавляй внешние знания."
        )
        prompt = f"{system}\nФАКТЫ:\n{facts_text}\nОТВЕТ:"
        out = _call_ollama(prompt)
        return (out or "").strip()
    except Exception:
        return ""

def _parse_date(text: str) -> Optional[date]:
    t = (text or "").strip().lower()
    today = date.today()
    if t in ("сегодня", "today"): return today
    if t in ("завтра", "tomorrow"): return today + timedelta(days=1)
    if t in ("послезавтра",): return today + timedelta(days=2)
    # через N дней
    try:
        m = re.search(r"через\s+(\d+)\s+дн", t)
        if m:
            return today + timedelta(days=int(m.group(1)))
    except Exception:
        pass
    # dd.mm.yyyy or dd/mm/yyyy
    for sep in (".", "/"):
        try:
            parts = t.split(sep)
            if len(parts) == 3 and all(parts):
                d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
                return date(y, m, d)
        except Exception:
            pass
    # ISO-like
    try:
        return datetime.fromisoformat(t).date()
    except Exception:
        return None

# Simple per-user context (in-memory)
USER_CTX: dict[str, dict] = {}

def _get_user_ctx(uid: Optional[str]) -> dict:
    if not uid:
        uid = "anon"
    if uid not in USER_CTX:
        USER_CTX[uid] = {}
    return USER_CTX[uid]

@app.post("/api/ai/command", response_model=schemas.AIChatResponse)
def ai_command(payload: schemas.AICommandRequest, db: Session = Depends(get_db)):
    system = (
        "Ты помощник-оператор. Преобразуй текст пользователя в JSON с полями: "
        "intent (add_task|update_task|toggle_task|delete_task|summary|overdue|finance|"
        "employee_add|employee_update|employee_status|employee_delete|employee_info|employee_stats|"
        "project_add|project_info|project_update|project_delete|project_add_member|project_remove_member|project_set_member_rate|project_add_link|project_remove_link|"
        "transaction_add|transaction_update|transaction_delete|"
        "note_add|note_update|note_delete|"
        "reading_add|reading_update|reading_delete|reading_mark_reading|reading_mark_completed|reading_list|"
        "goal_add|goal_update|goal_progress|goal_delete), "
        "content, assignee, priority (L|M|H), due, project, done (true|false), name. "
        "Для finance добавь month ('2025-08'). Для employee_* используй поля name, position, email, salary, revenue, hourly_rate (ставка/почасовка), status, status_tag, status_date. "
        "Для project_* используй name, description, tags (list), status, start_date, end_date, employee (для member), hourly_rate (ставка). "
        "Для transaction_* используй transaction_type, amount, date, category, description, employee, project. "
        "Для note_* используй title, date, content, tags. Для reading_* используй title, url, item_type, status, priority, tags, notes. "
        "Для goal_* используй title, description, period, start_date, end_date, status, progress, tags. Только JSON."
    )
    user = payload.query
    uid = payload.user_id or None
    prompt = f"{system}\nUSER: {user}\nJSON:"
    raw = _call_ollama(prompt)
    # «Обрезать» возможный текст до JSON
    import json, re
    match = re.search(r"\{[\s\S]*\}", raw)
    data = {}
    if match:
        try:
            data = json.loads(match.group(0))
        except Exception:
            data = {}
    intent = (data.get("intent") or "").lower()
    actions: List[str] = []
    created: List[str] = []

    # Handle clear/cleanup and greetings early
    low = user.strip().lower()
    if re.match(r"^(привет|здравств|hi|hello|hey)\b", low):
        # Let free-chat answer handle greetings: return empty actions so UI prefers chat
        return {"result": {"summary": "", "actions": [], "created_task_ids": []}}
    if re.search(r"\b(clear|очисти(ть)?\s+чат|очисти(ть)?\s+контекст)\b", low):
        if payload.user_id:
            USER_CTX.pop(payload.user_id, None)
        return {"result": {"summary": "Чат и контекст очищены", "actions": ["Очистка"], "created_task_ids": []}}

    # Heuristics
    def _extract_rate(text: str) -> Optional[int]:
        try:
            m = re.search(r"(?:ставк[а-я]*|почасовк[а-я]*|часов[а-я]*|руб)\s*[:\-]?\s*(\d+)", text, re.IGNORECASE)
            if m: return int(m.group(1))
        except Exception: pass
        try:
            m = re.search(r"(\d{2,5})\s*(?:руб|р\b)", text, re.IGNORECASE)
            if m: return int(m.group(1))
        except Exception: pass
        return None

    def _extract_priority(text: str) -> Optional[str]:
        t = text.lower()
        if re.search(r"высок|high|высш", t): return "H"
        if re.search(r"средн|medium|ср", t): return "M"
        if re.search(r"низк|low", t): return "L"
        return None

    def _extract_done(text: str) -> Optional[bool]:
        t = text.lower()
        if re.search(r"(выполн|заверш|сделан|готов|закрой\s+задачу)", t): return True
        if re.search(r"(отмен[аы]\s+выполн|сними\s+галоч|не\s+выполн)", t): return False
        return None

    def _extract_month_yyyy_mm(text: str) -> Optional[str]:
        t = text.lower()
        months = {
            "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "ма": 5, "июн": 6, "июл": 7,
            "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12
        }
        for stem, num in months.items():
            if stem in t:
                y = date.today().year
                m = num
                # try explicit year
                my = re.search(r"(20\d{2})", t)
                if my:
                    y = int(my.group(1))
                return f"{y}-{m:02d}"
        return None

    def _extract_item_type(text: str) -> Optional[str]:
        t = text.lower()
        if re.search(r"стать|article", t): return "article"
        if re.search(r"книг|book", t): return "book"
        if re.search(r"видео|video", t): return "video"
        if re.search(r"подкаст|podcast", t): return "podcast"
        if re.search(r"курс|course", t): return "course"
        return None

    def _extract_goal_period(text: str) -> Optional[str]:
        t = text.lower()
        if re.search(r"кварт|quarter", t): return "quarterly"
        if re.search(r"месяц|month", t): return "monthly"
        if re.search(r"год|year", t): return "yearly"
        return None

    def _extract_project_status(text: str) -> Optional[str]:
        t = text.lower()
        if re.search(r"заверш|законч|close|complete", t): return "completed"
        if re.search(r"пауза|pause", t): return "paused"
        if re.search(r"отмен|cancel", t): return "cancelled"
        if re.search(r"актив|resume|start", t): return "active"
        return None

    # --- Employee info / stats ---
    if intent in ("employee_info", "employee_stats"):
        # resolve name or last context
        name = data.get("name") or data.get("assignee")
        if not name:
            m = re.search(r"кто\s+такой\s+([^\n,]+)", user, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
        emp = crud.find_employee_by_name(db, name or "") if name else None
        if not emp and uid:
            ctx = _get_user_ctx(uid)
            last_emp_id = ctx.get("last_employee_id")
            if last_emp_id:
                emp = db.query(models.Employee).filter(models.Employee.id == last_emp_id).first()
        if not emp:
            return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
        # update context
        if uid:
            _get_user_ctx(uid)["last_employee_id"] = emp.id
        if intent == "employee_info":
            tasks = db.query(models.Task).filter(models.Task.assigned_to == emp.id).all()
            done = sum(1 for t in tasks if t.done)
            hours = sum(float(t.hours_spent or 0.0) for t in tasks if t.done)
            facts = {
                "action": "employee_info",
                "name": emp.name,
                "position": emp.position,
                "email": emp.email or None,
                "hourly_rate": emp.hourly_rate,
                "salary": emp.salary,
                "revenue": emp.revenue,
                "status": emp.current_status,
                "status_tag": emp.status_tag,
                "status_date": emp.status_date.isoformat() if emp.status_date else None,
                "done_tasks": done,
                "done_hours": int(hours),
            }
            return {"result": {"summary": _nlg(facts) or f"Имя: {emp.name}\nДолжность: {emp.position}", "actions": ["Показана карточка сотрудника"], "created_task_ids": []}}
        if intent == "employee_stats":
            tasks = db.query(models.Task).filter(models.Task.assigned_to == emp.id).all()
            done = [t for t in tasks if t.done]
            active = [t for t in tasks if not t.done]
            done_count = len(done)
            active_count = len(active)
            hours_done = sum(float(t.hours_spent or 0.0) for t in done)
            hours_active = sum(float(t.hours_spent or 0.0) for t in active)
            payout = db.query(models.Transaction).filter(models.Transaction.employee_id == emp.id).filter(models.Transaction.transaction_type == "expense").all()
            total_paid = sum(float(tx.amount or 0.0) for tx in payout)
            facts = {
                "action": "employee_stats",
                "name": emp.name,
                "done_tasks": done_count,
                "active_tasks": active_count,
                "done_hours": int(hours_done),
                "active_hours": int(hours_active),
                "paid_total": round(total_paid, 2),
            }
            return {"result": {"summary": _nlg(facts) or (f"{emp.name}: выполнено задач {done_count} (часы {hours_done:.0f}), в работе {active_count} (часы {hours_active:.0f}), начислено {total_paid:.2f} руб."), "actions": ["Показана статистика сотрудника"], "created_task_ids": []}}

    if intent == "add_task":
        content = data.get("content") or payload.query
        priority = (data.get("priority") or _extract_priority(user) or "M").upper()
        if priority not in ("L","M","H"): priority = "M"
        due = _parse_date(str(data.get("due") or "")) or _parse_date(user)
        assignee_name = data.get("assignee")
        assignee_id = None
        if assignee_name:
            emp = crud.find_employee_by_name(db, assignee_name)
            assignee_id = emp.id if emp else None
        project_id = None
        # простая привязка проекта по названию
        proj_name = data.get("project")
        if proj_name:
            projects = crud.get_projects(db)
            for p in projects:
                if proj_name.lower() in p.name.lower():
                    project_id = p.id
                    break
        task = crud.create_task_simple(db, content=content, priority=priority, due_date=due, assigned_to=assignee_id, project_id=project_id)
        actions.append(f"Создана задача: {task.content}")
        created.append(task.id)
        facts = {
            "action": "task_created",
            "content": task.content,
            "priority": priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "assignee": assignee_name or None,
            "project": proj_name or None,
        }
        summary = _nlg(facts) or f"Создана задача ‘{task.content}’ (приоритет {priority}{', срок ' + task.due_date.isoformat() if task.due_date else ''})."
        return {"result": {"summary": summary, "actions": actions, "created_task_ids": created}}

    if intent == "summary":
        # Guard against false positives (e.g., greeting)
        if not re.search(r"итог|сводк|summary|за\s+сегодня|за\s+неделю|за\s+месяц", low):
            return {"result": {"summary": "", "actions": [], "created_task_ids": []}}
        period = (data.get("period") or "today").lower()
        tasks = crud.get_tasks(db)
        today_s = date.today().isoformat()
        if period == "today":
            tasks = [t for t in tasks if (t.due_date and t.due_date.isoformat()==today_s) or (t.created_at and t.created_at.date().isoformat()==today_s)]
        facts = {"action": "tasks_summary", "count": len(tasks), "examples": [t.content for t in tasks[:10]]}
        summary = _nlg(facts) or (f"Найдено задач: {len(tasks)}. " + "; ".join([t.content for t in tasks[:10]]))
        return {"result": {"summary": summary, "actions": ["Сводка задач"], "created_task_ids": []}}

    if intent == "overdue":
        over = crud.list_overdue_tasks(db)
        if not over:
            return {"result": {"summary": _nlg({"action":"overdue","count":0}) or "Просроченных задач нет", "actions": ["Сводка задач"], "created_task_ids": []}}
        lines = [f"{t.content} (срок {t.due_date.isoformat()})" for t in over[:10]]
        facts = {"action": "overdue", "count": len(over), "items": lines}
        summary = _nlg(facts) or ("Просроченные задачи: " + "; ".join(lines))
        return {"result": {"summary": summary, "actions": ["Сводка задач"], "created_task_ids": []}}

    if intent == "update_task":
        # Простое обновление по содержимому
        target = crud.find_task_by_text(db, data.get("content") or "")
        if not target:
            return {"result": {"summary": "Задача не найдена", "actions": [], "created_task_ids": []}}
        # done toggle or set
        done_hint = _extract_done(user)
        if data.get("done") is True or done_hint is True:
            target.done = True
        elif data.get("done") is False or done_hint is False:
            target.done = False
        # update due/priority
        d = _parse_date(str(data.get("due") or "")) or _parse_date(user)
        if d: target.due_date = d
        pr = (data.get("priority") or _extract_priority(user) or "").upper()
        if pr in ("L","M","H"): target.priority = pr
        db.commit(); db.refresh(target)
        facts = {
            "action": "task_updated",
            "content": target.content,
            "done": target.done,
            "priority": target.priority,
            "due_date": target.due_date.isoformat() if target.due_date else None,
        }
        return {"result": {"summary": _nlg(facts) or f"Обновлена задача ‘{target.content}’", "actions": ["Обновлена задача"], "created_task_ids": []}}

    if intent == "toggle_task":
        target = crud.find_task_by_text(db, data.get("content") or "")
        if not target:
            return {"result": {"summary": "Задача не найдена", "actions": [], "created_task_ids": []}}
        crud.toggle_task(db, target.id)
        return {"result": {"summary": f"Переключен статус задачи ‘{target.content}’", "actions": ["Переключен статус"], "created_task_ids": []}}

    if intent == "delete_task":
        target = crud.find_task_by_text(db, data.get("content") or "")
        if not target:
            return {"result": {"summary": "Задача не найдена", "actions": [], "created_task_ids": []}}
        crud.delete_task(db, target.id)
        return {"result": {"summary": f"Удалена задача ‘{target.content}’", "actions": ["Удалена задача"], "created_task_ids": []}}

    if intent == "finance":
        # month like YYYY-MM
        month = (data.get("month") or "").strip() or (_extract_month_yyyy_mm(user) or "")
        try:
            y, m = month.split("-")
            y, m = int(y), int(m)
        except Exception:
            today_d = date.today()
            y, m = today_d.year, today_d.month
        s = crud.finance_summary_month(db, y, m)
        facts = {"action": "finance_summary", "year": y, "month": m, **s}
        summary = _nlg(facts) or f"Финансы {y}-{m:02d}: доход {s['income']:.2f}, расход {s['expense']:.2f}, баланс {s['balance']:.2f}."
        return {"result": {"summary": summary, "actions": ["Сводка финансов"], "created_task_ids": []}}

    # --- Employees ---
    if intent == "employee_add":
        name = data.get("name")
        position = data.get("position") or "Specialist"
        # Heuristic extraction from raw query
        if isinstance(name, dict):
            name = name.get("name") or name.get("full_name") or ""
        if isinstance(name, list):
            name = " ".join([str(x) for x in name])
        if not isinstance(name, str):
            name = str(name or "")
        if not name.strip():
            m = re.search(r"(?:сотрудник[а-я]*:?|имя:?|name:?|Добавь\s+сотрудника:?)\s*([A-ZА-ЯЁ][^,\n]+)", user, re.IGNORECASE)
            if m:
                name = m.group(1).strip().split(";")[0]
        if not position and re.search(r"позици|должност", user, re.IGNORECASE):
            mp = re.search(r"(?:позиция|должность)\s*[:\-]?\s*([^,\n]+)", user, re.IGNORECASE)
            if mp:
                position = mp.group(1).strip()
        hr = data.get("hourly_rate")
        if hr is None:
            mh = re.search(r"ставк[а-я]*\s*[:\-]?\s*(\d+)", user, re.IGNORECASE)
            if mh:
                try: hr = int(mh.group(1))
                except Exception: hr = None
        if not name.strip():
            return {"result": {"summary": "Не указано имя сотрудника", "actions": [], "created_task_ids": []}}
        # idempotency: if employee with same name exists -> update basic fields instead of creating
        existing_emp = crud.find_employee_by_name(db, name)
        if existing_emp:
            from schemas import EmployeeUpdate
            crud.update_employee(db, existing_emp.id, EmployeeUpdate(position=position, hourly_rate=hr))
            return {"result": {"summary": f"Сотрудник уже существует: {existing_emp.name}", "actions": ["Обновлен сотрудник"], "created_task_ids": []}}
        from schemas import EmployeeCreate
        status_date = _parse_date(str(data.get("status_date") or "")) or date.today()
        emp = crud.create_employee(db, EmployeeCreate(
            name=name.strip(),
            position=position,
            email=data.get("email"),
            salary=data.get("salary"),
            revenue=data.get("revenue"),
            current_status=data.get("status") or "",
            status_tag=data.get("status_tag"),
            status_date=status_date,
            hourly_rate=hr,
        ))
        return {"result": {"summary": f"Создан сотрудник {emp.name}", "actions": ["Создан сотрудник"], "created_task_ids": []}}

    if intent == "employee_update":
        target_name = data.get("name") or data.get("assignee")
        if not target_name:
            m = re.search(r"(?:сотрудник[а-я]*:?|имя:?|name:?|Обнови\s+сотрудника:?)\s*([A-ZА-ЯЁ][^,\n]+)", user, re.IGNORECASE)
            if m:
                target_name = m.group(1).strip()
        emp = crud.find_employee_by_name(db, target_name or "") if target_name else None
        if not emp:
            return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
        from schemas import EmployeeUpdate
        hr = data.get("hourly_rate")
        if hr is None:
            hr = _extract_rate(user)
        patch = EmployeeUpdate(
            name=data.get("name"),
            position=data.get("position"),
            email=data.get("email"),
            salary=data.get("salary"),
            revenue=data.get("revenue"),
            current_status=data.get("status"),
            status_tag=data.get("status_tag"),
            status_date=_parse_date(str(data.get("status_date") or "")),
            hourly_rate=hr,
        )
        crud.update_employee(db, emp.id, patch)
        return {"result": {"summary": f"Обновлен сотрудник {emp.name}", "actions": ["Обновлен сотрудник"], "created_task_ids": []}}

    if intent == "employee_status":
        target_name = data.get("name") or data.get("assignee")
        emp = crud.find_employee_by_name(db, target_name or "") if target_name else None
        if not emp:
            return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
        from schemas import EmployeeStatusUpdate
        crud.update_employee_status(db, emp.id, EmployeeStatusUpdate(current_status=data.get("status") or "", status_tag=data.get("status_tag")))
        return {"result": {"summary": f"Статус обновлен для {emp.name}", "actions": ["Обновлен статус"], "created_task_ids": []}}

    if intent == "employee_delete":
        target_name = data.get("name") or data.get("assignee")
        emp = crud.find_employee_by_name(db, target_name or "") if target_name else None
        if not emp:
            return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
        crud.delete_employee(db, emp.id)
        return {"result": {"summary": f"Удален сотрудник {emp.name}", "actions": ["Удален сотрудник"], "created_task_ids": []}}

    # --- Projects ---
    if intent == "project_add":
        from schemas import ProjectCreate
        name = data.get("name") or data.get("project")
        # if model returned structured object for name, coerce to string
        if isinstance(name, dict):
            # common cases: {"name":"..."} or {"title":"..."}
            name = name.get("name") or name.get("title") or ""
        if isinstance(name, list):
            name = " ".join([str(x) for x in name])
        if not isinstance(name, str):
            name = str(name or "")
        # normalize
        def _norm(s: str) -> str:
            return " ".join((s or "").split()).strip().lower()
        if not _norm(name):
            mp = re.search(r"(?:проект)\s*:?\s*([^,\n]+)", user, re.IGNORECASE)
            if mp:
                name = mp.group(1).strip()
        if not _norm(name):
            return {"result": {"summary": "Не указан проект", "actions": [], "created_task_ids": []}}
        # idempotency: reuse existing project with the same name (case-insensitive, normalized spaces)
        nname = _norm(name)
        for p in crud.get_projects(db):
            if _norm(p.name) == nname:
                return {"result": {"summary": f"Проект уже существует: {p.name}", "actions": [], "created_task_ids": []}}
        tags = data.get("tags") or []
        proj = crud.create_project(db, ProjectCreate(
            name=name.strip(),
            description=data.get("description"),
            tags=tags,
            status=data.get("status") or "active",
            start_date=_parse_date(str(data.get("start_date") or "")),
            end_date=_parse_date(str(data.get("end_date") or "")),
        ))
        return {"result": {"summary": f"Создан проект {proj.name}", "actions": ["Создан проект"], "created_task_ids": []}}

    if intent == "project_info":
        # find by content/name like
        query_name = data.get("name") or data.get("content") or data.get("project") or ""
        pid = None; project = None
        if query_name:
            for p in crud.get_projects(db):
                if query_name.lower() in p.name.lower():
                    project = p; pid = p.id; break
        if not project:
            mp = re.search(r"(?:проект)\s*:?\s*([^,\n]+)", user, re.IGNORECASE)
            if mp:
                qn = mp.group(1).strip()
                for p in crud.get_projects(db):
                    if qn.lower() in p.name.lower():
                        project = p; pid = p.id; break
        if not project:
            return {"result": {"summary": "Проект не найден", "actions": [], "created_task_ids": []}}
        # gather details
        tasks = db.query(models.Task).filter(models.Task.project_id == pid).all()
        done = sum(1 for t in tasks if t.done)
        open_t = sum(1 for t in tasks if not t.done)
        links = [l.title for l in (project.links or []) if getattr(l, 'title', None)]
        facts = {
            "action": "project_info",
            "name": project.name,
            "status": project.status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "tags": list(getattr(project, 'tags', []) or []),
            "members": len(getattr(project, 'member_ids', []) or []),
            "tasks_open": open_t,
            "tasks_done": done,
            "links": links[:5],
        }
        return {"result": {"summary": _nlg(facts) or f"Проект {project.name}: статус {project.status}, задач в работе {open_t}, завершено {done}.", "actions": ["Информация о проекте"], "created_task_ids": []}}

    if intent in ("project_update", "project_delete", "project_add_member", "project_remove_member", "project_set_member_rate", "project_add_link", "project_remove_link"):
        # helper find project by name contains
        proj_name = data.get("name") or data.get("project") or ""
        project_id = None
        if proj_name:
            for p in crud.get_projects(db):
                if proj_name.lower() in p.name.lower():
                    project_id = p.id
                    break
        if not project_id:
            # try phrase like "в проекте {Name}"
            mp = re.search(r"в\s+проекте\s+([^,\n]+)", user, re.IGNORECASE)
            if mp:
                pn = mp.group(1).strip()
                for p in crud.get_projects(db):
                    if pn.lower() in p.name.lower():
                        project_id = p.id
                        break
        if not project_id:
            return {"result": {"summary": "Проект не найден", "actions": [], "created_task_ids": []}}

        if intent == "project_update":
            from schemas import ProjectUpdate
            tags = data.get("tags")
            crud.update_project(db, project_id, ProjectUpdate(
                name=data.get("name"),
                description=data.get("description"),
                tags=tags,
                status=data.get("status"),
                start_date=_parse_date(str(data.get("start_date") or "")),
                end_date=_parse_date(str(data.get("end_date") or "")),
            ))
            return {"result": {"summary": "Проект обновлен", "actions": ["Обновлен проект"], "created_task_ids": []}}

        if intent == "project_delete":
            crud.delete_project(db, project_id)
            return {"result": {"summary": "Проект удален", "actions": ["Удален проект"], "created_task_ids": []}}

        if intent == "project_add_member":
            emp_name = data.get("employee") or data.get("assignee")
            emp = crud.find_employee_by_name(db, emp_name or "") if emp_name else None
            if not emp:
                return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
            crud.add_project_member(db, project_id, emp.id)
            return {"result": {"summary": "Участник добавлен в проект", "actions": ["Добавлен участник"], "created_task_ids": []}}

        if intent == "project_remove_member":
            emp_name = data.get("employee") or data.get("assignee")
            emp = crud.find_employee_by_name(db, emp_name or "") if emp_name else None
            if not emp:
                return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
            crud.remove_project_member(db, project_id, emp.id)
            return {"result": {"summary": "Участник удален из проекта", "actions": ["Удален участник"], "created_task_ids": []}}

        if intent == "project_set_member_rate":
            emp_name = data.get("employee") or data.get("assignee")
            emp = crud.find_employee_by_name(db, emp_name or "") if emp_name else None
            if not emp:
                return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
            rate = data.get("hourly_rate")
            if rate is None:
                rate = _extract_rate(user)
            crud.set_project_member_rate(db, project_id, emp.id, int(rate) if rate is not None else None)
            return {"result": {"summary": "Ставка участника обновлена", "actions": ["Обновлена ставка"], "created_task_ids": []}}

        if intent == "project_add_link":
            from schemas import ProjectLinkAdd
            title = data.get("title") or (data.get("link") or "")
            url = data.get("url")
            link_type = data.get("link_type") or "other"
            if not (title and url):
                return {"result": {"summary": "Нужны title и url для ссылки", "actions": [], "created_task_ids": []}}
            crud.add_project_link(db, project_id, ProjectLinkAdd(title=title, url=url, link_type=link_type))
            return {"result": {"summary": "Ссылка добавлена к проекту", "actions": ["Добавлена ссылка"], "created_task_ids": []}}

        if intent == "project_remove_link":
            # По заголовку находим ссылку
            title = data.get("title") or (data.get("link") or "")
            if not title:
                return {"result": {"summary": "Укажите title ссылки", "actions": [], "created_task_ids": []}}
            # прямой поиск через ORM
            link = (
                db.query(models.ProjectLink)
                .filter(models.ProjectLink.project_id == project_id)
                .filter(models.ProjectLink.title.ilike(f"%{title}%"))
                .first()
            )
            if not link:
                return {"result": {"summary": "Ссылка не найдена", "actions": [], "created_task_ids": []}}
            crud.remove_project_link(db, project_id, link.id)
            return {"result": {"summary": "Ссылка удалена", "actions": ["Удалена ссылка"], "created_task_ids": []}}

    # --- Transactions ---
    if intent in ("transaction_add", "transaction_update", "transaction_delete"):
        # helper: resolve employee/project by name
        emp_id = None
        proj_id = None
        if data.get("employee"):
            emp = crud.find_employee_by_name(db, data.get("employee"))
            emp_id = emp.id if emp else None
        if data.get("project"):
            for p in crud.get_projects(db):
                if data.get("project").lower() in p.name.lower():
                    proj_id = p.id
                    break
        if intent == "transaction_add":
            from schemas import TransactionCreate
            tx_type = data.get("transaction_type")
            if not tx_type:
                if re.search(r"доход|прибыл|выручк", user, re.IGNORECASE): tx_type = "income"
                elif re.search(r"расход|убыт|трат", user, re.IGNORECASE): tx_type = "expense"
            amount = data.get("amount")
            if amount is None:
                ma = re.search(r"([0-9]+(?:[\.,][0-9]+)?)", user)
                if ma:
                    try: amount = float(ma.group(1).replace(',', '.'))
                    except Exception: amount = 0.0
            tx_date = _parse_date(str(data.get("date") or "")) or _parse_date(user) or date.today()
            tx = crud.create_transaction(db, TransactionCreate(
                transaction_type=tx_type or "expense",
                amount=float(amount or 0),
                date=tx_date,
                category=data.get("category") or ("Выручка" if (tx_type or "") == "income" else None),
                description=data.get("description") or user,
                tags=data.get("tags") or [],
                employee_id=emp_id,
                project_id=proj_id,
            ))
            return {"result": {"summary": f"Транзакция добавлена ({tx.transaction_type} {tx.amount:.2f})", "actions": ["Добавлена транзакция"], "created_task_ids": []}}
        # find transaction by description contains (fallback)
        target = None
        if data.get("description"):
            target = (
                db.query(models.Transaction)
                .filter(models.Transaction.description.ilike(f"%{data.get('description')}%"))
                .first()
            )
        if not target:
            return {"result": {"summary": "Транзакция не найдена", "actions": [], "created_task_ids": []}}
        if intent == "transaction_update":
            from schemas import TransactionUpdate
            crud.update_transaction(db, target.id, TransactionUpdate(
                transaction_type=data.get("transaction_type"),
                amount=float(data.get("amount")) if data.get("amount") is not None else None,
                date=_parse_date(str(data.get("date") or "")) or _parse_date(user),
                category=data.get("category"),
                description=data.get("description"),
                tags=data.get("tags"),
                employee_id=emp_id,
                project_id=proj_id,
            ))
            return {"result": {"summary": "Транзакция обновлена", "actions": ["Обновлена транзакция"], "created_task_ids": []}}
        if intent == "transaction_delete":
            crud.delete_transaction(db, target.id)
            return {"result": {"summary": "Транзакция удалена", "actions": ["Удалена транзакция"], "created_task_ids": []}}

    # --- Notes ---
    if intent in ("note_add", "note_update", "note_delete"):
        from schemas import NoteCreate, NoteUpdate
        if intent == "note_add":
            # Heuristic: title after first colon in phrase containing 'замет'
            title = data.get("title")
            if not title and re.search(r"замет", user, re.IGNORECASE):
                m = re.search(r"замет[^:]*:\s*([^\n]+)", user, re.IGNORECASE)
                if m: title = m.group(1).strip()
            n = crud.create_note(db, NoteCreate(
                date=_parse_date(str(data.get("date") or "")) or _parse_date(user) or date.today(),
                title=title,
                content=data.get("content") or "",
                tags=data.get("tags") or [],
            ))
            return {"result": {"summary": f"Заметка добавлена{': ' + (n.title or '')}", "actions": ["Добавлена заметка"], "created_task_ids": []}}
        # find by title contains
        target = None
        if data.get("title"):
            target = (
                db.query(models.Note)
                .filter(models.Note.title.isnot(None))
                .filter(models.Note.title.ilike(f"%{data.get('title')}%"))
                .first()
            )
        if not target:
            return {"result": {"summary": "Заметка не найдена", "actions": [], "created_task_ids": []}}
        if intent == "note_update":
            crud.update_note(db, target.id, NoteUpdate(
                date=_parse_date(str(data.get("date") or "")) or _parse_date(user),
                title=data.get("title"),
                content=data.get("content"),
                tags=data.get("tags"),
            ))
            return {"result": {"summary": "Заметка обновлена", "actions": ["Обновлена заметка"], "created_task_ids": []}}
        if intent == "note_delete":
            crud.delete_note(db, target.id)
            return {"result": {"summary": "Заметка удалена", "actions": ["Удалена заметка"], "created_task_ids": []}}

    # --- Reading ---
    if intent in ("reading_list", "reading_add", "reading_update", "reading_delete", "reading_mark_reading", "reading_mark_completed"):
        if intent == "reading_list":
            items = crud.get_reading_items(db)
            # optional status filter from content (to_read/reading/completed)
            status = None
            m = re.search(r"\b(to_read|reading|completed|archived|читаю|просьба|прочитан)\b", user, re.IGNORECASE)
            if m:
                st = m.group(1).lower()
                mapru = {"читаю": "reading", "прочитан": "completed"}
                status = mapru.get(st, st)
            if status:
                items = [i for i in items if (i.status or "").lower() == status]
            examples = [i.title for i in items[:10] if i.title]
            facts = {"action": "reading_list", "count": len(items), "examples": examples, "status": status}
            return {"result": {"summary": _nlg(facts) or (f"В списке чтения {len(items)} элементов: " + "; ".join(examples)), "actions": ["Список чтения"], "created_task_ids": []}}
        from schemas import ReadingItemCreate, ReadingItemUpdate
        if intent == "reading_add":
            item_type = data.get("item_type") or _extract_item_type(user) or "article"
            pr = (data.get("priority") or _extract_priority(user) or "M").upper()
            it = crud.create_reading_item(db, ReadingItemCreate(
                title=data.get("title") or (data.get("content") or "Элемент чтения"),
                url=data.get("url"),
                content=data.get("content"),
                item_type=item_type,
                status=data.get("status") or "to_read",
                priority=pr,
                tags=data.get("tags") or [],
                added_date=_parse_date(str(data.get("added_date") or "")) or _parse_date(user) or date.today(),
                completed_date=_parse_date(str(data.get("completed_date") or "")),
                notes=data.get("notes"),
            ))
            return {"result": {"summary": _nlg({"action":"reading_add","title":it.title}) or f"Добавлено в чтение: {it.title}", "actions": ["Добавлен элемент чтения"], "created_task_ids": []}}
        # find by title contains
        items = crud.get_reading_items(db)
        target = None
        title = data.get("title") or data.get("content")
        if title:
            for it in items:
                if it.title and title.lower() in it.title.lower():
                    target = it
                    break
        if not target:
            return {"result": {"summary": "Элемент чтения не найден", "actions": [], "created_task_ids": []}}
        if intent == "reading_update":
            crud.update_reading_item(db, target.id, ReadingItemUpdate(
                title=data.get("title"),
                url=data.get("url"),
                content=data.get("content"),
                item_type=data.get("item_type") or _extract_item_type(user),
                status=data.get("status"),
                priority=data.get("priority") or _extract_priority(user),
                tags=data.get("tags"),
                added_date=_parse_date(str(data.get("added_date") or "")) or _parse_date(user),
                completed_date=_parse_date(str(data.get("completed_date") or "")),
                notes=data.get("notes"),
            ))
            return {"result": {"summary": "Элемент чтения обновлен", "actions": ["Обновлен элемент чтения"], "created_task_ids": []}}
        if intent == "reading_mark_reading":
            crud.mark_reading_item_as_reading(db, target.id)
            return {"result": {"summary": "Отмечено как читается", "actions": ["Изменен статус чтения"], "created_task_ids": []}}
        if intent == "reading_mark_completed":
            crud.mark_reading_item_as_completed(db, target.id, data.get("notes"))
            return {"result": {"summary": "Отмечено как прочитано", "actions": ["Завершено чтение"], "created_task_ids": []}}
        if intent == "reading_delete":
            crud.delete_reading_item(db, target.id)
            return {"result": {"summary": "Элемент чтения удален", "actions": ["Удален элемент чтения"], "created_task_ids": []}}

    # --- Goals ---
    if intent in ("goal_add", "goal_update", "goal_progress", "goal_delete"):
        from schemas import GoalCreate, GoalUpdate
        if intent == "goal_add":
            period = data.get("period") or _extract_goal_period(user) or "quarterly"
            g = crud.create_goal(db, GoalCreate(
                title=data.get("title") or (data.get("content") or "Цель"),
                description=data.get("description"),
                period=period,
                start_date=_parse_date(str(data.get("start_date") or "")) or _parse_date(user) or date.today(),
                end_date=_parse_date(str(data.get("end_date") or "")) or date.today(),
                status=data.get("status") or "active",
                progress=int(data.get("progress") or 0),
                tags=data.get("tags") or [],
            ))
            return {"result": {"summary": f"Добавлена цель: {g.title}", "actions": ["Добавлена цель"], "created_task_ids": []}}
        # find by title
        goals = crud.get_goals(db)
        target = None
        title = data.get("title") or data.get("content")
        if title:
            for g in goals:
                if g.title and title.lower() in g.title.lower():
                    target = g
                    break
        if not target:
            return {"result": {"summary": "Цель не найдена", "actions": [], "created_task_ids": []}}
        if intent == "goal_update":
            crud.update_goal(db, target.id, GoalUpdate(
                title=data.get("title"),
                description=data.get("description"),
                period=data.get("period") or _extract_goal_period(user),
                start_date=_parse_date(str(data.get("start_date") or "")) or _parse_date(user),
                end_date=_parse_date(str(data.get("end_date") or "")) or _parse_date(user),
                status=data.get("status"),
                progress=int(data.get("progress")) if data.get("progress") is not None else None,
                tags=data.get("tags"),
            ))
            return {"result": {"summary": "Цель обновлена", "actions": ["Обновлена цель"], "created_task_ids": []}}
        if intent == "goal_progress":
            try:
                prog = int(data.get("progress"))
            except Exception:
                prog = None
            if prog is None:
                return {"result": {"summary": "Укажите прогресс (0-100)", "actions": [], "created_task_ids": []}}
            crud.update_goal_progress(db, target.id, prog)
            return {"result": {"summary": f"Прогресс цели обновлен до {prog}%", "actions": ["Обновлен прогресс"], "created_task_ids": []}}
        if intent == "goal_delete":
            crud.delete_goal(db, target.id)
            return {"result": {"summary": "Цель удалена", "actions": ["Удалена цель"], "created_task_ids": []}}

    # Heuristic: employee stats questions without explicit intent (last referenced employee)
    try:
        t = user.lower()
        if re.search(r"сколько\s+задач|итоги\s+задач", t) or re.search(r"сколько\s+час", t) or re.search(r"сколько\s+(денег|получил|начислено)", t):
            ctx = _get_user_ctx(payload.user_id) if payload.user_id else {}
            emp_id = ctx.get("last_employee_id")
            if emp_id:
                emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
                if emp:
                    tasks = db.query(models.Task).filter(models.Task.assigned_to == emp.id).all()
                    done = [x for x in tasks if x.done]
                    active = [x for x in tasks if not x.done]
                    hours_done = sum(float(x.hours_spent or 0.0) for x in done)
                    hours_active = sum(float(x.hours_spent or 0.0) for x in active)
                    payout = (
                        db.query(models.Transaction)
                        .filter(models.Transaction.employee_id == emp.id)
                        .filter(models.Transaction.transaction_type == "expense")
                        .all()
                    )
                    total_paid = sum(float(tx.amount or 0.0) for tx in payout)
                    summary = (
                        f"{emp.name}: выполнено задач {len(done)} (часы {hours_done:.0f}), "
                        f"в работе {len(active)} (часы {hours_active:.0f}), "
                        f"начислено {total_paid:.2f} руб."
                    )
                    return {"result": {"summary": summary, "actions": ["Показана статистика сотрудника (эвристика)"] , "created_task_ids": []}}
    except Exception:
        pass

    # fallback: просто эхо-ответ
    return {"result": {"summary": raw.strip()[:800], "actions": [], "created_task_ids": []}}

@app.post("/api/ai/chat", response_model=schemas.MessageResponse)
def ai_chat(payload: schemas.AICommandRequest):
    """Свободный чат без JSON-команд. Возвращает обычный текстовый ответ модели."""
    reply = _call_ollama(payload.query)
    return {"message": (reply or "").strip()[:4000]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 