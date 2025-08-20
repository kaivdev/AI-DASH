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
from telegram_notifier import send_message, set_webhook, get_webhook_info, delete_webhook, get_updates
from telegram_notifier import delete_message

# Create database tables
models.Base.metadata.create_all(bind=engine)

from sqlalchemy import text as _text

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
            # employees new rate columns (robust IF NOT EXISTS)
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='hourly_rate') THEN ALTER TABLE employees ADD COLUMN hourly_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='cost_hourly_rate') THEN ALTER TABLE employees ADD COLUMN cost_hourly_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='bill_hourly_rate') THEN ALTER TABLE employees ADD COLUMN bill_hourly_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='telegram_chat_id') THEN ALTER TABLE employees ADD COLUMN telegram_chat_id TEXT; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='planned_monthly_hours') THEN ALTER TABLE employees ADD COLUMN planned_monthly_hours INTEGER; END IF; END $$;"))
            # notes/reading_items/goals.user_id
            conn.execute(_text("ALTER TABLE IF EXISTS notes ADD COLUMN IF NOT EXISTS user_id TEXT"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='notes' AND constraint_name='notes_user_fk') THEN ALTER TABLE notes ADD CONSTRAINT notes_user_fk FOREIGN KEY (user_id) REFERENCES users(id); END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='shared') THEN ALTER TABLE notes ADD COLUMN shared BOOLEAN NOT NULL DEFAULT FALSE; END IF; END $$;"))
            conn.execute(_text("ALTER TABLE IF EXISTS reading_items ADD COLUMN IF NOT EXISTS user_id TEXT"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='reading_items' AND constraint_name='reading_items_user_fk') THEN ALTER TABLE reading_items ADD CONSTRAINT reading_items_user_fk FOREIGN KEY (user_id) REFERENCES users(id); END IF; END $$;"))
            conn.execute(_text("ALTER TABLE IF EXISTS goals ADD COLUMN IF NOT EXISTS user_id TEXT"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='goals' AND constraint_name='goals_user_fk') THEN ALTER TABLE goals ADD CONSTRAINT goals_user_fk FOREIGN KEY (user_id) REFERENCES users(id); END IF; END $$;"))
            # unique membership
            conn.execute(_text("CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_pair ON project_members(project_id, employee_id)"))
            # project_members additional rates
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_members' AND column_name='hourly_rate') THEN ALTER TABLE project_members ADD COLUMN hourly_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_members' AND column_name='cost_hourly_rate') THEN ALTER TABLE project_members ADD COLUMN cost_hourly_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_members' AND column_name='bill_hourly_rate') THEN ALTER TABLE project_members ADD COLUMN bill_hourly_rate INTEGER; END IF; END $$;"))
            # task approval columns
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='approved') THEN ALTER TABLE tasks ADD COLUMN approved BOOLEAN NOT NULL DEFAULT FALSE; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='approved_at') THEN ALTER TABLE tasks ADD COLUMN approved_at TIMESTAMPTZ; END IF; END $$;"))
            # task rate audit and tx links
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='hourly_rate_override') THEN ALTER TABLE tasks ADD COLUMN hourly_rate_override INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='cost_rate_override') THEN ALTER TABLE tasks ADD COLUMN cost_rate_override INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='bill_rate_override') THEN ALTER TABLE tasks ADD COLUMN bill_rate_override INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='applied_hourly_rate') THEN ALTER TABLE tasks ADD COLUMN applied_hourly_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='applied_cost_rate') THEN ALTER TABLE tasks ADD COLUMN applied_cost_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='applied_bill_rate') THEN ALTER TABLE tasks ADD COLUMN applied_bill_rate INTEGER; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='income_tx_id') THEN ALTER TABLE tasks ADD COLUMN income_tx_id TEXT; END IF; END $$;"))
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='expense_tx_id') THEN ALTER TABLE tasks ADD COLUMN expense_tx_id TEXT; END IF; END $$;"))
            # transactions.task_id
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='task_id') THEN ALTER TABLE transactions ADD COLUMN task_id TEXT; END IF; END $$;"))
            # user_profiles.openrouter_api_key
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='openrouter_api_key') THEN ALTER TABLE user_profiles ADD COLUMN openrouter_api_key TEXT; END IF; END $$;"))
            # registration_codes.created_by_user_id
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registration_codes' AND column_name='created_by_user_id') THEN ALTER TABLE registration_codes ADD COLUMN created_by_user_id TEXT; END IF; END $$;"))
            # users.invited_by_user_id (free-form link; no FK to avoid cross-bootstrap issues)
            conn.execute(_text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='invited_by_user_id') THEN ALTER TABLE users ADD COLUMN invited_by_user_id TEXT; END IF; END $$;"))
            # Multitenancy: organizations and organization_id columns
            conn.execute(_text("CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)"))
            for tbl in ('users','employees','projects','tasks','transactions'):
                conn.execute(_text(f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='{tbl}' AND column_name='organization_id') THEN ALTER TABLE {tbl} ADD COLUMN organization_id TEXT; END IF; END $$;"))
            conn.commit()
    except Exception as e:
        print(f"PostgreSQL schema ensure error: {e}")

_ensure_postgres_schema()

def _backfill_task_approvals():
    """One-time backfill: mark existing completed tasks as approved to preserve legacy semantics."""
    try:
        with engine.begin() as conn:
            # Only set approved for legacy records where approved is NULL; keep awaiting approvals (approved = FALSE) intact
            conn.execute(_text("UPDATE tasks SET approved = TRUE, approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP) WHERE done = TRUE AND approved IS NULL"))
    except Exception as e:
        print(f"Backfill approvals error: {e}")

def _backfill_transaction_org_ids():
    """One-time/backstop backfill: set transactions.organization_id from linked task if missing.
    Works for both SQLite and Postgres using correlated subquery.
    """
    try:
        with engine.begin() as conn:
            # From linked task
            conn.execute(_text(
                """
                UPDATE transactions
                SET organization_id = (
                    SELECT organization_id FROM tasks WHERE tasks.id = transactions.task_id
                )
                WHERE organization_id IS NULL AND task_id IS NOT NULL
                """
            ))
            # Fallback: from employee
            conn.execute(_text(
                """
                UPDATE transactions
                SET organization_id = (
                    SELECT organization_id FROM employees WHERE employees.id = transactions.employee_id
                )
                WHERE organization_id IS NULL AND employee_id IS NOT NULL
                """
            ))
    except Exception as e:
        print(f"Backfill tx org error: {e}")

app = FastAPI(title="Dashboard API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],  # React dev server
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
OPENROUTER_BASE = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-5-nano")

# Pending Telegram link state per chat: { chat_id: {"email": str, "ts": datetime.utcnow()} }
_PENDING_LINKS: dict[str, dict] = {}

@app.on_event("startup")
def startup_seed():
    # Ensure default registration code exists (first registrant becomes owner)
    db = next(get_db())
    try:
        crud.ensure_owner_and_code(db)
    finally:
        db.close()
    # Backfill: approve all already completed tasks (compatibility)
    _backfill_task_approvals()
    # Backfill: set org_id for transactions created from tasks earlier
    _backfill_transaction_org_ids()
    # Try to set Telegram webhook if configured; otherwise start long polling in background
    try:
        from config import settings as _cfg
        if _cfg.TELEGRAM_WEBHOOK_URL:
            set_webhook()
        else:
            _start_telegram_long_polling()
    except Exception:
        pass

@app.get("/")
async def root():
    return {"message": "Dashboard API is running"}

@app.get("/health")
async def health():
    return {"ok": True}

# --- Auth endpoints ---
@app.post("/api/auth/register", response_model=schemas.AuthResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # Invite code: treat empty/whitespace as absent
    raw_code = getattr(payload, "code", None)
    if isinstance(raw_code, str):
        raw_code = raw_code.strip()
    # Treat empty string as None
    if not raw_code:
        raw_code = None
    
    code = None
    if raw_code:
        code = (
            db.query(models.RegistrationCode)
            .filter(models.RegistrationCode.code == raw_code, models.RegistrationCode.is_active == True)
            .first()
        )
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

    # Determine role: if no users exist yet and no code provided -> make this user an owner
    # If no code -> создаём нового владельца с собственной организацией
    if not code:
        init_role = "owner"
    else:
        init_role = "user"
    # Determine organization_id
    org_id = None
    if init_role == "owner":
        # create organization for this owner
        org_id = crud.generate_id()
        try:
            db.execute(_text("INSERT INTO organizations (id, name) VALUES (:id, :name)"), {"id": org_id, "name": name or payload.email})
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create organization")
    else:
        # get inviter's organization via created_by_user_id
        inv_org = None
        if code and getattr(code, "created_by_user_id", None):
            inv_org = db.execute(_text("SELECT organization_id FROM users WHERE id = :id"), {"id": code.created_by_user_id}).scalar()
        if not inv_org:
            raise HTTPException(status_code=400, detail="Invalid invite: missing organization")
        org_id = inv_org

    user = crud.create_user(db, email=payload.email, password=payload.password, role=init_role, name=name)
    # set organization for user
    try:
        db.execute(_text("UPDATE users SET organization_id = :oid WHERE id = :uid"), {"oid": org_id, "uid": user.id})
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to assign organization")
    # Link invited_by_user_id if code has creator
    try:
        if code and getattr(code, "created_by_user_id", None):
            # set invited_by_user_id on user
            db.execute(_text("UPDATE users SET invited_by_user_id = :by WHERE id = :id"), {"by": code.created_by_user_id, "id": user.id})
            db.commit()
    except Exception:
        db.rollback()
    # Ensure employee record linked to this user
    emp = crud.ensure_employee_for_user(db, user, getattr(payload, "first_name", None), getattr(payload, "last_name", None))
    # set organization for employee
    try:
        db.execute(_text("UPDATE employees SET organization_id = :oid WHERE id = :eid"), {"oid": org_id, "eid": emp.id})
        db.commit()
    except Exception:
        db.rollback()

    token = crud.create_session(db, user.id)
    return {"user": crud.serialize_user(user), "token": token}

# --- Invite codes management (owner/admin) ---
@app.get("/api/invites", response_model=List[schemas.InviteCodeOut])
def list_invites(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user or user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.query(models.RegistrationCode).order_by(models.RegistrationCode.created_at.desc()).all()
    return [{"id": r.id, "code": r.code, "is_active": bool(r.is_active), "created_at": r.created_at} for r in rows]

@app.post("/api/invites", response_model=schemas.InviteCodeOut)
def create_invite(payload: schemas.InviteCodeCreate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user or user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    # If code provided, ensure unique; otherwise generate
    code = (payload.code or "").strip()
    if not code:
        import secrets, string
        alphabet = string.ascii_uppercase + string.digits
        code = "".join(secrets.choice(alphabet) for _ in range(8))
    existing = db.query(models.RegistrationCode).filter(models.RegistrationCode.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists")
    # Insert first, then set created_by_user_id via UPDATE for backward DBs
    rc = models.RegistrationCode(code=code, is_active=True)
    db.add(rc)
    db.commit()
    db.refresh(rc)
    # Try to set created_by_user_id if column exists
    try:
        db.execute(_text("UPDATE registration_codes SET created_by_user_id = :uid WHERE id = :rid"), {"uid": user.id, "rid": rc.id})
        db.commit()
    except Exception:
        db.rollback()
    return {"id": rc.id, "code": rc.code, "is_active": bool(rc.is_active), "created_at": rc.created_at}

@app.put("/api/invites/{invite_id}/deactivate", response_model=schemas.InviteCodeOut)
def deactivate_invite(invite_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user or user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    rc = db.query(models.RegistrationCode).filter(models.RegistrationCode.id == invite_id).first()
    if not rc:
        raise HTTPException(status_code=404, detail="Not found")
    rc.is_active = False
    db.commit()
    db.refresh(rc)
    return {"id": rc.id, "code": rc.code, "is_active": bool(rc.is_active), "created_at": rc.created_at}

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
        if user:
            # Owners/admins: вся организация
            if user.role in ("owner", "admin"):
                return (
                    db.query(models.Employee)
                    .filter(models.Employee.organization_id == user.organization_id)
                    .order_by(models.Employee.created_at.desc())
                    .all()
                )
            # Обычный пользователь: только собственная карточка
            emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
            return [emp] if emp else []
    # Без авторизации: пусто
    return []

@app.get("/api/employees/{employee_id}", response_model=schemas.Employee)
def get_employee(employee_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    employee = crud.get_employee(db, employee_id)
    if not employee or not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    if user.role in ("owner", "admin"):
        if employee.organization_id != user.organization_id:
            raise HTTPException(status_code=404, detail="Employee not found")
        return employee
    # Regular user: only own employee card
    if employee.user_id != user.id:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.post("/api/employees", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can create employees
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    emp = crud.create_employee(db, employee)
    # assign organization
    from sqlalchemy import text as _t
    db.execute(_t("UPDATE employees SET organization_id = :oid WHERE id = :id"), {"oid": user.organization_id, "id": emp.id})
    db.commit()
    return emp

@app.put("/api/employees/{employee_id}", response_model=schemas.Employee)
def update_employee(employee_id: str, employee: schemas.EmployeeUpdate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Non-admin users cannot change rate-related fields
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            # forbid direct changes to rates, revenue/salary and planned hours
            forbidden_fields = {"hourly_rate", "cost_hourly_rate", "bill_hourly_rate", "revenue", "salary", "planned_monthly_hours"}
            payload = employee.model_dump(exclude_unset=True)
            if any(f in payload for f in forbidden_fields):
                raise HTTPException(status_code=403, detail="Forbidden: insufficient permissions to modify these fields")
    # allow auto-recalc only for admins; for regular users, do not recalc rates implicitly
    allow_recalc = True
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if not user or user.role not in ("owner", "admin"):
            allow_recalc = False
    db_employee = crud.update_employee(db, employee_id, employee, allow_recalc=allow_recalc)
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
def delete_employee(employee_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can delete employees
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    if crud.delete_employee(db, employee_id):
        return {"message": "Employee deleted successfully"}
    raise HTTPException(status_code=404, detail="Employee not found")

# Project endpoints
@app.get("/api/projects", response_model=List[schemas.Project])
def get_projects(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user:
            if user.role in ("owner", "admin"):
                # Need to include computed fields like member_ids and member rate maps
                projects = (
                    db.query(models.Project)
                    .filter(models.Project.organization_id == user.organization_id)
                    .all()
                )
                for project in projects:
                    # Populate computed fields to satisfy response schema
                    project.member_ids = [m.employee_id for m in project.members]
                    project.member_rates = {m.employee_id: m.hourly_rate for m in project.members}
                    project.member_cost_rates = {m.employee_id: m.cost_hourly_rate for m in project.members}
                    project.member_bill_rates = {
                        m.employee_id: (m.bill_hourly_rate if m.bill_hourly_rate is not None else m.hourly_rate)
                        for m in project.members
                    }
                return projects
            return crud.list_projects_for_user(db, user)
    return []

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
def get_project(project_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    project = crud.get_project(db, project_id)
    if not project or not user:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role in ("owner", "admin"):
        if project.organization_id != user.organization_id:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    # Regular user: must be a member and same org
    emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.organization_id != emp.organization_id:
        raise HTTPException(status_code=404, detail="Project not found")
    is_member = any(m.employee_id == emp.id for m in project.members)
    if not is_member:
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
    # set tenant
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    pr = crud.create_project(db, project)
    # assign org
    from sqlalchemy import text as _t
    db.execute(_t("UPDATE projects SET organization_id = :oid WHERE id = :id"), {"oid": user.organization_id, "id": pr.id})
    db.commit()
    return pr

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
def add_project_member(project_id: str, member: schemas.ProjectMemberAdd, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can manage project members
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    if crud.add_project_member(db, project_id, member.employee_id):
        return {"message": "Member added successfully"}
    raise HTTPException(status_code=400, detail="Member already exists or invalid data")

@app.put("/api/projects/{project_id}/members/{employee_id}/rate", response_model=schemas.MessageResponse)
def set_project_member_rate(project_id: str, employee_id: str, hourly_rate: int | None = None, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can change member rates
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    crud.set_project_member_rate(db, project_id, employee_id, hourly_rate)
    return {"message": "Rate updated"}

@app.put("/api/projects/{project_id}/members/{employee_id}/rates", response_model=schemas.MessageResponse)
def set_project_member_rates(project_id: str, employee_id: str, cost_hourly_rate: int | None = None, bill_hourly_rate: int | None = None, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can change member rates
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    crud.set_project_member_rates(db, project_id, employee_id, cost_hourly_rate, bill_hourly_rate)
    return {"message": "Rates updated"}

@app.delete("/api/projects/{project_id}/members/{employee_id}", response_model=schemas.MessageResponse)
def remove_project_member(project_id: str, employee_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only admin/owner can manage project members
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = crud.get_user_by_token(db, token)
        if user and user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
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
    if not authorization or not authorization.startswith("Bearer "):
        return []
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        return []
    if user.role not in ("owner", "admin"):
        return []
    return db.query(models.Transaction).filter(models.Transaction.organization_id == user.organization_id).order_by(models.Transaction.date.desc()).all()

@app.get("/api/transactions/{transaction_id}", response_model=schemas.Transaction)
def get_transaction(transaction_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user or user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    transaction = crud.get_transaction(db, transaction_id)
    if not transaction or transaction.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@app.post("/api/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user or user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    tx = crud.create_transaction(db, transaction)
    # assign organization
    from sqlalchemy import text as _t
    db.execute(_t("UPDATE transactions SET organization_id = :oid WHERE id = :id"), {"oid": user.organization_id, "id": tx.id})
    db.commit()
    return tx

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
        if user:
            if user.role in ("owner", "admin"):
                return db.query(models.Task).filter(models.Task.organization_id == user.organization_id).order_by(models.Task.created_at.desc()).all()
            return crud.list_tasks_for_user(db, user)
    return []

@app.get("/api/tasks/{task_id}", response_model=schemas.Task)
def get_task(task_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    task = crud.get_task(db, task_id)
    if not task or not user:
        raise HTTPException(status_code=404, detail="Task not found")
    if user.role in ("owner", "admin"):
        if task.organization_id != user.organization_id:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    # regular user: must be assigned to them
    emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
    if not emp or task.assigned_to != emp.id:
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
    created = crud.create_task(db, task)
    # assign organization
    from sqlalchemy import text as _t
    if user:
        db.execute(_t("UPDATE tasks SET organization_id = :oid WHERE id = :id"), {"oid": user.organization_id, "id": created.id})
        db.commit()
    # Notify assignee via Telegram if chat linked
    try:
        if created.assigned_to:
            emp = db.query(models.Employee).filter(models.Employee.id == created.assigned_to).first()
            if emp and getattr(emp, 'telegram_chat_id', None):
                parts = []
                parts.append(f"Новая задача: <b>{created.content}</b>")
                if created.due_date:
                    parts.append(f"Срок: {created.due_date.isoformat()}")
                if created.priority:
                    parts.append(f"Приоритет: {created.priority}")
                if created.project_id:
                    proj = db.query(models.Project).filter(models.Project.id == created.project_id).first()
                    if proj:
                        parts.append(f"Проект: {proj.name}")
                text = "\n".join(parts)
                send_message(emp.telegram_chat_id, text)
    except Exception:
        pass
    return created

# --- Telegram webhook (optional) ---
@app.post("/api/telegram/webhook")
async def telegram_webhook(update: dict, x_telegram_bot_api_secret_token: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Incoming Telegram updates. Minimal handler to allow users to link their chat with employee.
    Security: require configured secret token header to match settings.TELEGRAM_WEBHOOK_SECRET.
    Commands:
      /start – greeting
      /link <email> – link this chat to employee by email
    """
    from config import settings
    if settings.TELEGRAM_WEBHOOK_SECRET and (x_telegram_bot_api_secret_token or "") != settings.TELEGRAM_WEBHOOK_SECRET:
        # ignore silently to avoid probing
        return {"ok": True}
    try:
        msg = (update.get("message") or update.get("edited_message") or {})
        chat = msg.get("chat") or {}
        chat_id = str(chat.get("id")) if chat.get("id") is not None else None
        text = (msg.get("text") or "").strip()
        if not chat_id:
            return {"ok": True}
        if text.startswith("/start"):
            send_message(chat_id, "Привет! Отправьте <b>/link email@example.com</b>, затем введите пароль от аккаунта — и бот свяжет чат. Пароль будет скрыт.")
            return {"ok": True}
        if text.startswith("/link"):
            parts = text.split()
            if len(parts) >= 2:
                email = parts[1].strip()
                user = crud.get_user_by_email(db, email)
                emp = db.query(models.Employee).filter(models.Employee.email == email).first()
                if not user or not emp:
                    send_message(chat_id, "Пользователь или сотрудник с таким email не найден. Обратитесь к администратору.")
                    return {"ok": True}
                _PENDING_LINKS[chat_id] = {"email": email, "ts": datetime.utcnow()}
                send_message(chat_id, "Введите пароль от аккаунта. Мы попытаемся скрыть это сообщение.")
                return {"ok": True}
            else:
                send_message(chat_id, "Использование: /link email@example.com")
                return {"ok": True}
        # Password step
        if chat_id in _PENDING_LINKS and text:
            pending = _PENDING_LINKS.pop(chat_id, None)
            if pending and (datetime.utcnow() - pending.get("ts", datetime.utcnow())).total_seconds() < 600:
                email = pending["email"]
                user = crud.get_user_by_email(db, email)
                if user and crud.verify_password(user, text):
                    emp = db.query(models.Employee).filter(models.Employee.email == email).first()
                    if emp:
                        try:
                            with engine.begin() as conn:
                                conn.execute(_text("UPDATE employees SET telegram_chat_id = :cid WHERE id = :id"), {"cid": chat_id, "id": emp.id})
                            mid = msg.get("message_id")
                            if mid is not None:
                                try:
                                    delete_message(chat_id, int(mid))
                                except Exception:
                                    pass
                            send_message(chat_id, f"Чат привязан к сотруднику: <b>{emp.name}</b>.")
                        except Exception:
                            pass
                else:
                    send_message(chat_id, "Неверный пароль. Повторите /link email и попробуйте снова.")
            return {"ok": True}
        return {"ok": True}
    except Exception:
        return {"ok": True}


# --- Long polling fallback (no webhook) ---
def _handle_update_dict(update: dict, db: Session):
    try:
        msg = (update.get("message") or update.get("edited_message") or {})
        chat = msg.get("chat") or {}
        chat_id = str(chat.get("id")) if chat.get("id") is not None else None
        text = (msg.get("text") or "").strip()
        if not chat_id:
            return
        if text.startswith("/start"):
            send_message(chat_id, "Привет! Отправьте <b>/link email@example.com</b>, затем введите пароль от аккаунта — и бот свяжет чат. Пароль будет скрыт.")
            return
        if text.startswith("/link"):
            parts = text.split()
            if len(parts) >= 2:
                email = parts[1].strip()
                user = crud.get_user_by_email(db, email)
                emp = db.query(models.Employee).filter(models.Employee.email == email).first()
                if not user or not emp:
                    send_message(chat_id, "Пользователь или сотрудник с таким email не найден. Обратитесь к администратору.")
                    return
                _PENDING_LINKS[chat_id] = {"email": email, "ts": datetime.utcnow()}
                send_message(chat_id, "Введите пароль от аккаунта. Мы попытаемся скрыть это сообщение.")
                return
            else:
                send_message(chat_id, "Использование: /link email@example.com")
                return
        # Password step for long polling
        if chat_id in _PENDING_LINKS and text:
            pending = _PENDING_LINKS.pop(chat_id, None)
            if pending and (datetime.utcnow() - pending.get("ts", datetime.utcnow())).total_seconds() < 600:
                email = pending["email"]
                user = crud.get_user_by_email(db, email)
                if user and crud.verify_password(user, text):
                    emp = db.query(models.Employee).filter(models.Employee.email == email).first()
                    with engine.begin() as conn:
                        conn.execute(_text("UPDATE employees SET telegram_chat_id = :cid WHERE id = :id"), {"cid": chat_id, "id": emp.id})
                    mid = msg.get("message_id")
                    if mid is not None:
                        try:
                            delete_message(chat_id, int(mid))
                        except Exception:
                            pass
                    send_message(chat_id, f"Чат привязан к сотруднику: <b>{emp.name}</b>.")
                else:
                    send_message(chat_id, "Неверный пароль. Повторите /link email и попробуйте снова.")
            return
    except Exception:
        pass


def _start_telegram_long_polling():
    import threading
    import time
    stop_flag = {"stop": False}

    def worker():
        last_update_id = None
        while not stop_flag["stop"]:
            try:
                updates = get_updates(offset=(last_update_id + 1) if last_update_id else None, timeout=25)
                if updates:
                    db = next(get_db())
                    try:
                        for u in updates:
                            uid = u.get("update_id")
                            if isinstance(uid, int):
                                last_update_id = uid
                            _handle_update_dict(u, db)
                    finally:
                        db.close()
                else:
                    time.sleep(1)
            except Exception:
                time.sleep(3)

    t = threading.Thread(target=worker, name="tg-long-poll", daemon=True)
    t.start()

# --- Telegram diagnostics (safe, no auth for simplicity in dev) ---
@app.get("/api/telegram/webhook-info")
def telegram_webhook_info():
    info = get_webhook_info()
    return info or {"ok": False}

@app.post("/api/telegram/set-webhook")
def telegram_set_webhook():
    ok = set_webhook()
    return {"ok": bool(ok)}

@app.post("/api/telegram/delete-webhook")
def telegram_delete_webhook(drop_pending_updates: bool = True):
    ok = delete_webhook(drop_pending_updates)
    return {"ok": bool(ok)}

@app.post("/api/telegram/test-message")
def telegram_test_message(chat_id: str, text: str = "Проверка связи от бота"):
    ok = send_message(chat_id, text)
    return {"ok": bool(ok)}

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
            # restrict fields: allow assigned employee to update hours_spent, done, and work_status (for Kanban moves)
            allowed = schemas.TaskUpdate(
                hours_spent=task.hours_spent,
                done=task.done,
                work_status=task.work_status,
            )
            task = allowed
    # Apply update
    db_task = crud.update_task(db, task_id, task)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Handle approval semantics after update
    try:
        # Determine actor role and whether approved was explicitly provided
        is_admin = False
        has_approved_explicit = False
        approved_value = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]
            user = crud.get_user_by_token(db, token)
            is_admin = bool(user and user.role in ("owner", "admin"))
        try:
            payload = task.model_dump(exclude_unset=True)
            if "approved" in payload:
                has_approved_explicit = True
                approved_value = payload.get("approved")
        except Exception:
            has_approved_explicit = False

        # Apply approval logic based on done status and explicit approved setting
        from sqlalchemy import text as _text
        if has_approved_explicit:
            # Approved was explicitly set in request - respect it
            if is_admin and approved_value is True:
                # Admin explicitly marked approved
                with engine.begin() as conn:
                    conn.execute(_text("UPDATE tasks SET approved = TRUE, approved_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": task_id})
            elif approved_value is False:
                # Explicitly set to false (moving to open/awaiting)
                with engine.begin() as conn:
                    conn.execute(_text("UPDATE tasks SET approved = FALSE, approved_at = NULL WHERE id = :id"), {"id": task_id})
        elif getattr(db_task, "done", False) and not has_approved_explicit:
            # Done=true but approved not explicitly set - apply default logic
            if not is_admin:
                # Non-admin completion -> awaiting approval
                with engine.begin() as conn:
                    conn.execute(_text("UPDATE tasks SET approved = FALSE, approved_at = NULL WHERE id = :id"), {"id": task_id})
        
        # Refresh task after any approval changes
        if has_approved_explicit or (getattr(db_task, "done", False) and not has_approved_explicit):
            db_task = crud.get_task(db, task_id)
    except Exception:
        pass
    # If task is done and approved -> ensure finance records are generated (idempotent)
    try:
        if getattr(db_task, "done", False) and bool(getattr(db_task, "approved", False)):
            crud.generate_task_finance_if_needed(db, task_id)
            # refresh once more to return updated links
            db_task = crud.get_task(db, task_id)
    except Exception:
        pass
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

    # If admin clicks on awaiting (done=true, approved=false) -> approve and generate finance; do not flip done
    if is_admin and current.done and not (getattr(current, "approved", False) or False):
        try:
            with engine.begin() as conn:
                # NOW() for postgres; CURRENT_TIMESTAMP works both
                conn.execute(_text("UPDATE tasks SET approved = TRUE, approved_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": task_id})
            # generate finance on approval
            approved = crud.generate_task_finance_if_needed(db, task_id)
            return approved or crud.get_task(db, task_id)
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
                    conn.execute(_text("UPDATE tasks SET approved = TRUE, approved_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": task_id})
                # generate finance immediately for admin self-completion
                crud.generate_task_finance_if_needed(db, task_id)
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
    # Reading list is strictly personal for any role
    if not authorization or not authorization.startswith("Bearer "):
        return []
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        return []
    return (
        db.query(models.ReadingItem)
        .filter(models.ReadingItem.user_id == user.id)
        .order_by(models.ReadingItem.added_date.desc())
        .all()
    )

@app.get("/api/reading/{item_id}", response_model=schemas.ReadingItem)
def get_reading_item(item_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only owner can fetch
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    item = crud.get_reading_item(db, item_id)
    if not item or not user or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return item

@app.post("/api/reading", response_model=schemas.ReadingItem)
def create_reading_item(item: schemas.ReadingItemCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return crud.create_reading_item(db, item, user_id=user.id)

@app.put("/api/reading/{item_id}", response_model=schemas.ReadingItem)
def update_reading_item(item_id: str, item: schemas.ReadingItemUpdate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Only owner can update
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    existing = crud.get_reading_item(db, item_id)
    if not existing or not user or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reading item not found")
    db_item = crud.update_reading_item(db, item_id, item)
    return db_item

@app.put("/api/reading/{item_id}/reading", response_model=schemas.ReadingItem)
def mark_as_reading(item_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    existing = crud.get_reading_item(db, item_id)
    if not existing or not user or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reading item not found")
    db_item = crud.mark_reading_item_as_reading(db, item_id)
    return db_item

@app.put("/api/reading/{item_id}/completed", response_model=schemas.ReadingItem)
def mark_as_completed(item_id: str, notes: str = None, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    existing = crud.get_reading_item(db, item_id)
    if not existing or not user or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reading item not found")
    db_item = crud.mark_reading_item_as_completed(db, item_id, notes)
    return db_item

@app.delete("/api/reading/{item_id}", response_model=schemas.MessageResponse)
def delete_reading_item(item_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    existing = crud.get_reading_item(db, item_id)
    if not existing or not user or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reading item not found")
    if crud.delete_reading_item(db, item_id):
        return {"message": "Reading item deleted successfully"}
    raise HTTPException(status_code=404, detail="Reading item not found")

# Note endpoints
@app.get("/api/notes", response_model=List[schemas.Note])
def get_notes(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Auth required; show only own notes + shared notes from others (for any role)
    if not authorization or not authorization.startswith("Bearer "):
        return []
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        return []
    return (
        db.query(models.Note)
        .filter((models.Note.user_id == user.id) | (models.Note.shared == True))
        .order_by(models.Note.date.desc())
        .all()
    )

@app.get("/api/notes/{note_id}", response_model=schemas.Note)
def get_note(note_id: str, db: Session = Depends(get_db)):
    note = crud.get_note(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.post("/api/notes", response_model=schemas.Note)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return crud.create_note(db, note, user_id=user.id)

@app.put("/api/notes/{note_id}", response_model=schemas.Note)
def update_note(note_id: str, note: schemas.NoteUpdate, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Auth required; only owner can update; admin/owner can change 'shared'
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    n = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not user or not n:
        raise HTTPException(status_code=404, detail="Note not found")
    if user.role not in ("owner", "admin"):
        if n.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        # Non-admin cannot change shared flag
        if getattr(note, 'shared', None) is not None:
            raise HTTPException(status_code=403, detail="Only admin can change share state")
    db_note = crud.update_note(db, note_id, note)
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note

@app.delete("/api/notes/{note_id}", response_model=schemas.MessageResponse)
def delete_note(note_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    # Auth required; only owner or admin can delete
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    n = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not user or not n:
        raise HTTPException(status_code=404, detail="Note not found")
    if user.role not in ("owner", "admin") and n.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
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

def _llm_call_for_user(db: Optional[Session], prompt: str, auth_header: Optional[str]) -> str:
    """Route to OpenRouter when user profile has a key, else fallback to Ollama."""
    key: Optional[str] = None
    try:
        if db is not None and auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            user = crud.get_user_by_token(db, token)
            if user and user.profile and getattr(user.profile, "openrouter_api_key", None):
                key = user.profile.openrouter_api_key
    except Exception:
        key = None
    if key:
        try:
            print(f"[llm] routing: openrouter model={DEFAULT_OPENROUTER_MODEL}")
            r = requests.post(
                f"{OPENROUTER_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "AI Life Dashboard",
                    "Content-Type": "application/json",
                },
                json={
                    "model": DEFAULT_OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": prompt},
                    ],
                },
                timeout=120,
            )
            if r.ok:
                j = r.json()
                if isinstance(j, dict) and j.get("choices"):
                    return j["choices"][0]["message"]["content"]
            else:
                try:
                    print(f"[llm] openrouter error {r.status_code}: {r.text[:200]}")
                except Exception:
                    print(f"[llm] openrouter error {r.status_code}")
        except Exception:
            print(f"[llm] openrouter exception: {e}")
        print("[llm] fallback: ollama")
    else:
        print("[llm] routing: ollama (no per-user OpenRouter key)")
    return _call_ollama(prompt)

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
    """Parse common Russian/ISO date expressions without LLM.
    Supports: сегодня/завтра/послезавтра, "через N дней", dd.mm.yyyy, dd/mm/yyyy,
    ISO yyyy-mm-dd, yyyy-mm (-> first day), yyyy.
    """
    t = (text or "").strip().lower()
    if not t:
        return None
    today = date.today()
    if t in ("сегодня", "today"):
        return today
    if t in ("завтра", "tomorrow"):
        return today + timedelta(days=1)
    if t in ("послезавтра",):
        return today + timedelta(days=2)

    # через N дней
    m = re.search(r"через\s+(\d+)\s+дн", t)
    if m:
        try:
            return today + timedelta(days=int(m.group(1)))
        except Exception:
            pass

    # dd.mm.yyyy or dd/mm/yyyy
    for sep in (".", "/"):
        parts = t.split(sep)
        if len(parts) == 3 and all(parts):
            try:
                d, mm, y = int(parts[0]), int(parts[1]), int(parts[2])
                return date(y, mm, d)
            except Exception:
                pass

    # ISO yyyy-mm-dd
    try:
        if re.match(r"^\d{4}-\d{2}-\d{2}$", t):
            return datetime.fromisoformat(t).date()
    except Exception:
        pass

    # yyyy-mm -> first day of month
    m2 = re.match(r"^(\d{4})-(\d{1,2})$", t)
    if m2:
        try:
            y, mm = int(m2.group(1)), int(m2.group(2))
            return date(y, mm, 1)
        except Exception:
            pass

    # yyyy (year only) -> Jan 1st
    if re.match(r"^\d{4}$", t):
        try:
            return date(int(t), 1, 1)
        except Exception:
            pass

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
def ai_command(payload: schemas.AICommandRequest, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    system = (
        "Ты помощник-оператор. Преобразуй текст пользователя в JSON с полями: "
        "intent (add_task|update_task|toggle_task|delete_task|summary|overdue|finance|"
        "employee_add|employee_update|employee_status|employee_delete|employee_info|employee_stats|employee_profit|"
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
        "Для goal_* используй title, description, period, start_date, end_date, status, progress, tags. "
        "Для employee_profit добавь поля name и опционально month (YYYY-MM) или year (YYYY) для периода. Только JSON."
    )
    user = payload.query
    uid = payload.user_id or None
    prompt = f"{system}\nUSER: {user}\nJSON:"
    raw = _llm_call_for_user(db, prompt, authorization)
    # Persist user prompt if chat_id provided and user resolved
    try:
        uid = payload.user_id
        if not uid and authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]
            u = crud.get_user_by_token(db, token)
            uid = u.id if u else None
        if uid and payload.chat_id:
            # ensure session belongs to user
            s = crud.get_chat_session(db, uid, payload.chat_id)
            if s:
                crud.add_chat_message(db, s.id, "user", user)
    except Exception:
        pass
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
        # Очистить in-memory контекст
        if payload.user_id:
            USER_CTX.pop(payload.user_id, None)
        # При наличии chat_id — очистить историю сообщений текущей сессии на сервере
        try:
            uid_clear = payload.user_id
            if not uid_clear and authorization and authorization.startswith("Bearer "):
                token = authorization.split(" ", 1)[1]
                u = crud.get_user_by_token(db, token)
                uid_clear = u.id if u else None
            if uid_clear and payload.chat_id:
                s = crud.get_chat_session(db, uid_clear, payload.chat_id)
                if s:
                    crud.clear_chat_messages(db, uid_clear, s.id)
        except Exception:
            pass
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

    def _extract_year(text: str) -> Optional[int]:
        try:
            m = re.search(r"\b(20\d{2})\b", (text or ""))
            if m:
                return int(m.group(1))
        except Exception:
            pass
        return None

    def _period_from_query(text: str) -> tuple[Optional[date], Optional[date], Optional[str]]:
        """Return (start_date, end_date, label) parsed from text by month or year. None means all time."""
        month = _extract_month_yyyy_mm(text)
        if month:
            y, m = month.split("-")
            y, m = int(y), int(m)
            start = date(y, m, 1)
            if m == 12:
                end = date(y, 12, 31)
            else:
                end = date(y, m + 1, 1) - timedelta(days=1)
            return start, end, f"{y}-{m:02d}"
        yr = _extract_year(text)
        if yr:
            return date(yr, 1, 1), date(yr, 12, 31), str(yr)
        return None, None, None

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

    if intent == "employee_profit":
        # Resolve employee
        name = data.get("name") or data.get("assignee")
        emp = crud.find_employee_by_name(db, name or "") if name else None
        if not emp and uid:
            ctx = _get_user_ctx(uid)
            last_emp_id = ctx.get("last_employee_id")
            if last_emp_id:
                emp = db.query(models.Employee).filter(models.Employee.id == last_emp_id).first()
        if not emp:
            return {"result": {"summary": "Сотрудник не найден", "actions": [], "created_task_ids": []}}
        # Period
        start, end, label = _period_from_query(user)
        q = db.query(models.Transaction).filter(models.Transaction.employee_id == emp.id)
        if start:
            q = q.filter(models.Transaction.date >= start)
        if end:
            q = q.filter(models.Transaction.date <= end)
        rows = q.all()
        income = sum(float(tx.amount or 0.0) for tx in rows if (tx.transaction_type or "").lower()=="income")
        expense = sum(float(tx.amount or 0.0) for tx in rows if (tx.transaction_type or "").lower()=="expense")
        profit = income - expense
        lbl = f" за {label}" if label else ""
        facts = {"action":"employee_profit","name":emp.name,"income":round(income,2),"expense":round(expense,2),"profit":round(profit,2),"period":label}
        return {"result": {"summary": _nlg(facts) or f"Прибыль{lbl} по {emp.name}: {profit:.2f} руб. (выручка {income:.2f}, затраты {expense:.2f})", "actions": ["Аналитика прибыли сотрудника"], "created_task_ids": []}}

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
        # Telegram notify if assignee has linked chat
        try:
            if task.assigned_to:
                emp = db.query(models.Employee).filter(models.Employee.id == task.assigned_to).first()
                if emp and getattr(emp, 'telegram_chat_id', None):
                    parts = [f"Новая задача: <b>{task.content}</b>"]
                    if task.due_date:
                        parts.append(f"Срок: {task.due_date.isoformat()}")
                    if task.priority:
                        parts.append(f"Приоритет: {task.priority}")
                    if task.project_id:
                        proj = db.query(models.Project).filter(models.Project.id == task.project_id).first()
                        if proj:
                            parts.append(f"Проект: {proj.name}")
                    send_message(emp.telegram_chat_id, "\n".join(parts))
        except Exception:
            pass
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
        # helpers to sanitize LLM outputs
        def _as_str(v) -> Optional[str]:
            if v is None:
                return None
            if isinstance(v, str):
                return v
            if isinstance(v, (int, float)):
                return str(v)
            if isinstance(v, list):
                # join first few scalar parts
                parts = [str(x) for x in v if isinstance(x, (str, int, float))]
                return " ".join(parts) if parts else None
            if isinstance(v, dict):
                for key in ("title", "name", "text", "value"):
                    if key in v and isinstance(v[key], (str, int, float)):
                        return str(v[key])
                # fallback: first scalar value
                for x in v.values():
                    if isinstance(x, (str, int, float)):
                        return str(x)
            return None
        def _as_list_str(v) -> list[str]:
            if v is None:
                return []
            if isinstance(v, list):
                out = []
                for x in v:
                    s = _as_str(x)
                    if s:
                        out.append(s)
                return out
            s = _as_str(v)
            return [s] if s else []
        if intent == "goal_add":
            period = data.get("period") or _extract_goal_period(user) or "quarterly"
            title = _as_str(data.get("title")) or _as_str(data.get("content")) or "Цель"
            description = _as_str(data.get("description"))
            tags = _as_list_str(data.get("tags"))
            prog_raw = data.get("progress")
            try:
                progress_val = int(prog_raw) if prog_raw not in (None, "", []) else 0
            except Exception:
                progress_val = 0
            try:
                g = crud.create_goal(db, GoalCreate(
                    title=title,
                    description=description,
                    period=period,
                    start_date=_parse_date(str(data.get("start_date") or "")) or _parse_date(user) or date.today(),
                    end_date=_parse_date(str(data.get("end_date") or "")) or date.today(),
                    status=_as_str(data.get("status")) or "active",
                    progress=progress_val,
                    tags=tags,
                ))
            except Exception as e:
                return {"result": {"summary": f"Не удалось создать цель: {e}", "actions": [], "created_task_ids": []}}
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
            try:
                crud.update_goal(db, target.id, GoalUpdate(
                    title=_as_str(data.get("title")),
                    description=_as_str(data.get("description")),
                    period=data.get("period") or _extract_goal_period(user),
                    start_date=_parse_date(str(data.get("start_date") or "")) or _parse_date(user),
                    end_date=_parse_date(str(data.get("end_date") or "")) or _parse_date(user),
                    status=_as_str(data.get("status")),
                    progress=(int(data.get("progress")) if isinstance(data.get("progress"), (int, str)) and str(data.get("progress")).strip() != "" else None),
                    tags=_as_list_str(data.get("tags")),
                ))
            except Exception as e:
                return {"result": {"summary": f"Не удалось обновить цель: {e}", "actions": [], "created_task_ids": []}}
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

    # Heuristic: employee stats/profit questions without explicit intent (last referenced employee)
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
        # Profit heuristic
        if re.search(r"прибыл|маржин|выручк", t):
            ctx = _get_user_ctx(payload.user_id) if payload.user_id else {}
            emp_id = ctx.get("last_employee_id")
            if emp_id:
                emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
                if emp:
                    start, end, label = _period_from_query(user)
                    q = db.query(models.Transaction).filter(models.Transaction.employee_id == emp.id)
                    if start: q = q.filter(models.Transaction.date >= start)
                    if end: q = q.filter(models.Transaction.date <= end)
                    rows = q.all()
                    income = sum(float(tx.amount or 0.0) for tx in rows if (tx.transaction_type or "").lower()=="income")
                    expense = sum(float(tx.amount or 0.0) for tx in rows if (tx.transaction_type or "").lower()=="expense")
                    profit = income - expense
                    lbl = f" за {label}" if label else ""
                    return {"result": {"summary": f"Прибыль{lbl} по {emp.name}: {profit:.2f} руб. (выручка {income:.2f}, затраты {expense:.2f})", "actions": ["Аналитика прибыли сотрудника (эвристика)"] , "created_task_ids": []}}
    except Exception:
        pass

    # fallback: просто эхо-ответ
    # Save assistant summary to chat if available
    try:
        uid = payload.user_id
        if not uid and authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]
            user = crud.get_user_by_token(db, token)
            uid = user.id if user else None
        if uid and payload.chat_id:
            s = crud.get_chat_session(db, uid, payload.chat_id)
            if s:
                crud.add_chat_message(db, s.id, "assistant", (raw or "").strip()[:4000])
    except Exception:
        pass
    return {"result": {"summary": raw.strip()[:800], "actions": [], "created_task_ids": []}}

@app.post("/api/ai/chat", response_model=schemas.MessageResponse)
def ai_chat(payload: schemas.AICommandRequest, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    """Свободный чат без JSON-команд. Возвращает обычный текстовый ответ модели."""
    reply = _llm_call_for_user(db, payload.query, authorization)
    # persist both user and assistant messages if chat_id provided
    try:
        uid = payload.user_id
        if not uid and authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]
            user = crud.get_user_by_token(db, token)
            uid = user.id if user else None
        if uid and payload.chat_id:
            s = crud.get_chat_session(db, uid, payload.chat_id)
            if s:
                crud.add_chat_message(db, s.id, "user", payload.query)
                crud.add_chat_message(db, s.id, "assistant", (reply or "").strip()[:4000])
    except Exception:
        pass
    return {"message": (reply or "").strip()[:4000]}

# --- Chat sessions API ---
from fastapi import Path

def _auth_user(db: Session, authorization: Optional[str]) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    user = crud.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

@app.get("/api/chat/sessions", response_model=List[schemas.ChatSessionOut])
def list_sessions(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _auth_user(db, authorization)
    return crud.list_chat_sessions(db, user.id)

@app.post("/api/chat/sessions", response_model=schemas.ChatSessionOut)
def create_session(payload: schemas.ChatSessionCreate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _auth_user(db, authorization)
    return crud.create_chat_session(db, user.id, payload.title)

@app.put("/api/chat/sessions/{session_id}", response_model=schemas.ChatSessionOut)
def rename_session(session_id: str, payload: schemas.ChatSessionUpdate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _auth_user(db, authorization)
    s = crud.rename_chat_session(db, user.id, session_id, (payload.title or None))
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return s

@app.delete("/api/chat/sessions/{session_id}", response_model=schemas.MessageResponse)
def remove_session(session_id: str, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _auth_user(db, authorization)
    ok = crud.delete_chat_session(db, user.id, session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

@app.get("/api/chat/sessions/{session_id}/messages", response_model=List[schemas.ChatMessageOut])
def list_messages(session_id: str, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _auth_user(db, authorization)
    return crud.list_chat_messages(db, user.id, session_id)

@app.delete("/api/chat/sessions/{session_id}/messages", response_model=schemas.MessageResponse)
def clear_messages(session_id: str, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _auth_user(db, authorization)
    ok = crud.clear_chat_messages(db, user.id, session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 