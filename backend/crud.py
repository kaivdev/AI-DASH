from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
import uuid
from datetime import date, datetime
import hashlib
import os
import math

import models
import schemas
from config import settings

def generate_id() -> str:
    """Generate unique ID for entities"""
    return str(uuid.uuid4())

# Password helpers
def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

def serialize_user(user: models.User) -> dict:
    profile = user.profile
    profile_dict = None
    if profile:
        profile_dict = {
            "avatar_url": profile.avatar_url,
            "bio": profile.bio,
            "phone": profile.phone,
            "position": profile.position,
            "company": profile.company,
            "website": profile.website,
            "telegram": profile.telegram,
            "github": profile.github,
            "twitter": profile.twitter,
            "timezone": profile.timezone,
            "locale": profile.locale,
            # do not leak secrets; only indicate presence
            "has_openrouter_key": bool(getattr(profile, "openrouter_api_key", None)),
        }
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "profile": profile_dict,
    }

# Ensure user profile exists
def ensure_user_profile(db: Session, user_id: str) -> models.UserProfile:
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if profile:
        return profile
    profile = models.UserProfile(user_id=user_id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

# --- Helpers for rates/time ---
def _round_hours(hours: float, step: float = 1.0) -> float:
    """Return whole hours only (no fractions)."""
    if hours is None:
        return 0.0
    try:
        return float(int(max(0.0, float(hours))))
    except Exception:
        return 0.0

def _resolve_rates(db: Session, task: models.Task) -> tuple[Optional[int], Optional[int]]:
    """
    Resolve (cost_rate, bill_rate) for a task.
    - cost_rate: task.override (legacy, treated as cost if set) -> employee.cost_hourly_rate -> employee.hourly_rate (legacy)
    - bill_rate: task.override (legacy, if set we use the same) -> project_member.hourly_rate (treated as BILL) -> employee.bill_hourly_rate -> employee.hourly_rate (legacy)
    """
    # separate overrides have priority; legacy override applies to both
    o_cost = getattr(task, "cost_rate_override", None)
    o_bill = getattr(task, "bill_rate_override", None)
    override = int(task.hourly_rate_override) if getattr(task, "hourly_rate_override", None) is not None else None
    emp = None
    if task.assigned_to:
        emp = db.query(models.Employee).filter(models.Employee.id == task.assigned_to).first()
    # cost: task override -> project member cost -> employee cost
    cost_rate: Optional[int] = int(o_cost) if o_cost is not None else (override if override is not None else None)
    if task.project_id and task.assigned_to and cost_rate is None:
        pm = (
            db.query(models.ProjectMember)
            .filter(
                models.ProjectMember.project_id == task.project_id,
                models.ProjectMember.employee_id == task.assigned_to,
            )
            .first()
        )
        if pm:
            if getattr(pm, "cost_hourly_rate", None) is not None:
                cost_rate = int(pm.cost_hourly_rate)
    if cost_rate is None and emp is not None:
        if getattr(emp, "cost_hourly_rate", None) is not None:
            cost_rate = int(emp.cost_hourly_rate)
        elif getattr(emp, "hourly_rate", None) is not None:
            cost_rate = int(emp.hourly_rate)

    # bill: task override -> project member bill (or legacy hourly) -> employee bill
    bill_rate: Optional[int] = int(o_bill) if o_bill is not None else (override if override is not None else None)
    if bill_rate is None and task.project_id and task.assigned_to:
        pm = (
            db.query(models.ProjectMember)
            .filter(
                models.ProjectMember.project_id == task.project_id,
                models.ProjectMember.employee_id == task.assigned_to,
            )
            .first()
        )
        if pm:
            if getattr(pm, "bill_hourly_rate", None) is not None:
                bill_rate = int(pm.bill_hourly_rate)
            elif getattr(pm, "hourly_rate", None) is not None:
                bill_rate = int(pm.hourly_rate)
    if bill_rate is None and emp is not None:
        if getattr(emp, "bill_hourly_rate", None) is not None:
            bill_rate = int(emp.bill_hourly_rate)
        elif getattr(emp, "hourly_rate", None) is not None:
            bill_rate = int(emp.hourly_rate)
    return cost_rate, bill_rate

# Seed default registration code (but do NOT auto-create owner; first registrant will become owner)
DEFAULT_CODE = "667788"

def ensure_owner_and_code(db: Session) -> None:
    # Ensure at least one active registration code exists for initial setup
    code = db.query(models.RegistrationCode).filter(models.RegistrationCode.code == DEFAULT_CODE).first()
    if not code:
        db.add(models.RegistrationCode(code=DEFAULT_CODE, is_active=True))
        db.commit()

# Auth CRUD
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, email: str, password: str, role: str = "user", name: Optional[str] = None) -> models.User:
    salt = uuid.uuid4().hex
    password_hash = hash_password(password, salt)
    db_user = models.User(
        id=generate_id(),
        email=email,
        name=name,
        role=role,
        password_salt=salt,
        password_hash=password_hash,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    ensure_user_profile(db, db_user.id)
    return db_user

def verify_password(user: models.User, password: str) -> bool:
    return user.password_hash == hash_password(password, user.password_salt)

def create_session(db: Session, user_id: str) -> str:
    token = uuid.uuid4().hex + uuid.uuid4().hex
    db_sess = models.Session(token=token, user_id=user_id)
    db.add(db_sess)
    db.commit()
    return token

def get_user_by_token(db: Session, token: str) -> Optional[models.User]:
    sess = db.query(models.Session).filter(models.Session.token == token).first()
    if not sess:
        return None
    return db.query(models.User).filter(models.User.id == sess.user_id).first()

# Link user to employee (create if missing)
def ensure_employee_for_user(db: Session, user: models.User, first_name: Optional[str], last_name: Optional[str]) -> models.Employee:
    emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
    if emp:
        return emp
    full_name = (f"{first_name or ''} {last_name or ''}".strip()) or (user.name or user.email)
    emp = models.Employee(
        id=generate_id(),
        name=full_name,
        position="Specialist",
        email=user.email,
        salary=None,
        revenue=None,
        current_status="active",
        status_tag=None,
        status_date=date.today(),
        hourly_rate=None,
        user_id=user.id,
    )
    db.add(emp)
    db.commit()
    return emp

# --- Chat sessions/messages ---
def create_chat_session(db: Session, user_id: str, title: Optional[str] = None) -> models.ChatSession:
    s = models.ChatSession(id=generate_id(), user_id=user_id, title=title)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

def list_chat_sessions(db: Session, user_id: str) -> list[models.ChatSession]:
    return (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == user_id)
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )

def rename_chat_session(db: Session, user_id: str, session_id: str, title: Optional[str]) -> Optional[models.ChatSession]:
    s = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user_id).first()
    if not s:
        return None
    s.title = title
    db.commit()
    db.refresh(s)
    return s

def delete_chat_session(db: Session, user_id: str, session_id: str) -> bool:
    s = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user_id).first()
    if not s:
        return False
    db.delete(s)
    db.commit()
    return True

def get_chat_session(db: Session, user_id: str, session_id: str) -> Optional[models.ChatSession]:
    return db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == user_id).first()

def add_chat_message(db: Session, session_id: str, role: str, content: str) -> models.ChatMessage:
    m = models.ChatMessage(id=generate_id(), session_id=session_id, role=role, content=content)
    db.add(m)
    # update session.updated_at
    s = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if s:
        s.updated_at = func.now()
    db.commit()
    db.refresh(m)
    return m

def list_chat_messages(db: Session, user_id: str, session_id: str) -> list[models.ChatMessage]:
    s = get_chat_session(db, user_id, session_id)
    if not s:
        return []
    return (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )

def clear_chat_messages(db: Session, user_id: str, session_id: str) -> bool:
    s = get_chat_session(db, user_id, session_id)
    if not s:
        return False
    db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).delete()
    db.commit()
    return True

# Employee CRUD
def get_employees(db: Session) -> List[models.Employee]:
    return db.query(models.Employee).order_by(models.Employee.created_at.desc()).all()

def find_employee_by_name(db: Session, name: str) -> Optional[models.Employee]:
    if not name:
        return None
    # simple case-insensitive containment
    q = db.query(models.Employee).filter(models.Employee.name.ilike(f"%{name}%")).first()
    return q

def get_employee(db: Session, employee_id: str) -> Optional[models.Employee]:
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def create_employee(db: Session, employee: schemas.EmployeeCreate) -> models.Employee:
    data = employee.model_dump()
    # Auto-calc cost_hourly_rate from salary if provided and no explicit cost rate
    sal = data.get("salary")
    if sal is not None and data.get("cost_hourly_rate") is None:
        try:
            # prefer per-employee planned hours if provided
            ph = data.get("planned_monthly_hours")
            hours = max(1, int(ph if ph is not None else settings.PLANNED_MONTHLY_HOURS))
        except Exception:
            hours = 160
        data["cost_hourly_rate"] = int(round(float(sal) / float(hours)))
    db_employee = models.Employee(
        id=generate_id(),
        **data
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: str, employee: schemas.EmployeeUpdate, allow_recalc: bool = True) -> Optional[models.Employee]:
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    update_data = employee.model_dump(exclude_unset=True)

    # If salary is updated and cost_hourly_rate not explicitly passed -> recalc
    if (
        allow_recalc
        and "salary" in update_data
        and "cost_hourly_rate" not in update_data
        and update_data.get("salary") is not None
    ):
        try:
            # consider updated planned_monthly_hours if provided in same patch, else existing value, else global default
            if (
                "planned_monthly_hours" in update_data
                and update_data.get("planned_monthly_hours") is not None
            ):
                hours_source = update_data.get("planned_monthly_hours")
            else:
                hours_source = getattr(db_employee, "planned_monthly_hours", None)
            hours = max(1, int(hours_source if hours_source is not None else settings.PLANNED_MONTHLY_HOURS))
        except Exception:
            hours = 160
        try:
            update_data["cost_hourly_rate"] = int(round(float(update_data["salary"]) / float(hours)))
        except Exception:
            pass
    # If only planned_monthly_hours changes and salary exists, recalc cost unless explicitly provided
    elif (
        allow_recalc
        and ("planned_monthly_hours" in update_data)
        and (update_data.get("planned_monthly_hours") is not None)
        and ("cost_hourly_rate" not in update_data)
        and (getattr(db_employee, "salary", None) is not None)
    ):
        try:
            hours = max(1, int(update_data.get("planned_monthly_hours")))
            update_data["cost_hourly_rate"] = int(round(float(db_employee.salary) / float(hours)))
        except Exception:
            pass

    for field, value in update_data.items():
        setattr(db_employee, field, value)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee_status(db: Session, employee_id: str, status_update: schemas.EmployeeStatusUpdate) -> Optional[models.Employee]:
    db_employee = get_employee(db, employee_id)
    if db_employee:
        db_employee.current_status = status_update.current_status
        db_employee.status_tag = status_update.status_tag
        db_employee.status_date = date.today()
        db.commit()
        db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: str) -> bool:
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return False
    try:
        # 1) Remove project memberships to avoid setting FK to NULL (NOT NULL constraint)
        db.query(models.ProjectMember).filter(models.ProjectMember.employee_id == employee_id).delete(synchronize_session=False)
        # 2) Nullify references in tasks and transactions
        db.query(models.Task).filter(models.Task.assigned_to == employee_id).update({models.Task.assigned_to: None}, synchronize_session=False)
        db.query(models.Transaction).filter(models.Transaction.employee_id == employee_id).update({models.Transaction.employee_id: None}, synchronize_session=False)
        db.flush()

        # 3) Finally delete the employee
        db.delete(db_employee)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise

# Project CRUD
def get_projects(db: Session) -> List[models.Project]:
    projects = db.query(models.Project).all()
    # Add member_ids and member_rates to each project
    for project in projects:
        project.member_ids = [m.employee_id for m in project.members]
        # legacy single-rate map (treated as bill rate in old UI)
        project.member_rates = {m.employee_id: m.hourly_rate for m in project.members}
        # new detailed maps
        project.member_cost_rates = {m.employee_id: m.cost_hourly_rate for m in project.members}
        project.member_bill_rates = {
            m.employee_id: (m.bill_hourly_rate if m.bill_hourly_rate is not None else m.hourly_rate)
            for m in project.members
        }
    return projects

# Scoping helpers
def list_projects_for_user(db: Session, user: models.User) -> List[models.Project]:
    if user.role in ("owner", "admin"):
        return get_projects(db)
    # For regular users: projects where user's employee record is a member
    emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
    if not emp:
        return []
    projects = (
        db.query(models.Project)
        .join(models.ProjectMember, models.ProjectMember.project_id == models.Project.id)
        .filter(models.ProjectMember.employee_id == emp.id)
        .all()
    )
    for project in projects:
        project.member_ids = [m.employee_id for m in project.members]
        project.member_rates = {m.employee_id: m.hourly_rate for m in project.members}
        project.member_cost_rates = {m.employee_id: m.cost_hourly_rate for m in project.members}
        project.member_bill_rates = {
            m.employee_id: (m.bill_hourly_rate if m.bill_hourly_rate is not None else m.hourly_rate)
            for m in project.members
        }
    return projects

def list_tasks_for_user(db: Session, user: models.User) -> List[models.Task]:
    if user.role in ("owner", "admin"):
        return get_tasks(db)
    emp = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
    if not emp:
        return []
    # only tasks assigned directly to the employee
    return (
        db.query(models.Task)
        .filter(models.Task.assigned_to == emp.id)
        .order_by(models.Task.created_at.desc())
        .all()
    )

def get_project(db: Session, project_id: str) -> Optional[models.Project]:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project:
        project.member_ids = [m.employee_id for m in project.members]
        project.member_rates = {m.employee_id: m.hourly_rate for m in project.members}
        project.member_cost_rates = {m.employee_id: m.cost_hourly_rate for m in project.members}
        project.member_bill_rates = {
            m.employee_id: (m.bill_hourly_rate if m.bill_hourly_rate is not None else m.hourly_rate)
            for m in project.members
        }
    return project

def create_project(db: Session, project: schemas.ProjectCreate) -> models.Project:
    db_project = models.Project(
        id=generate_id(),
        **project.model_dump()
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    db_project.member_ids = []
    return db_project

def update_project(db: Session, project_id: str, project: schemas.ProjectUpdate) -> Optional[models.Project]:
    db_project = get_project(db, project_id)
    if db_project:
        update_data = project.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_project, field, value)
        db.commit()
        db.refresh(db_project)
        db_project.member_ids = [m.employee_id for m in db_project.members]
    return db_project

def delete_project(db: Session, project_id: str) -> bool:
    db_project = get_project(db, project_id)
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False

def add_project_member(db: Session, project_id: str, employee_id: str) -> bool:
    # Check if member already exists
    existing = db.query(models.ProjectMember).filter(
        and_(models.ProjectMember.project_id == project_id, 
             models.ProjectMember.employee_id == employee_id)
    ).first()
    if not existing:
        db_member = models.ProjectMember(project_id=project_id, employee_id=employee_id)
        db.add(db_member)
        db.commit()
        return True
    return False

def set_project_member_rate(db: Session, project_id: str, employee_id: str, hourly_rate: Optional[int]) -> bool:
    member = db.query(models.ProjectMember).filter(
        and_(models.ProjectMember.project_id == project_id,
             models.ProjectMember.employee_id == employee_id)
    ).first()
    if not member:
        # Create membership if missing
        member = models.ProjectMember(project_id=project_id, employee_id=employee_id)
        db.add(member)
        db.commit()
        db.refresh(member)
    member.hourly_rate = int(hourly_rate) if hourly_rate is not None else None
    db.commit()
    return True

def set_project_member_rates(db: Session, project_id: str, employee_id: str, cost_hourly_rate: Optional[int], bill_hourly_rate: Optional[int]) -> bool:
    member = db.query(models.ProjectMember).filter(
        and_(models.ProjectMember.project_id == project_id,
             models.ProjectMember.employee_id == employee_id)
    ).first()
    if not member:
        member = models.ProjectMember(project_id=project_id, employee_id=employee_id)
        db.add(member)
        db.commit()
        db.refresh(member)
    member.cost_hourly_rate = int(cost_hourly_rate) if cost_hourly_rate is not None else None
    member.bill_hourly_rate = int(bill_hourly_rate) if bill_hourly_rate is not None else None
    db.commit()
    return True

def remove_project_member(db: Session, project_id: str, employee_id: str) -> bool:
    db_member = db.query(models.ProjectMember).filter(
        and_(models.ProjectMember.project_id == project_id, 
             models.ProjectMember.employee_id == employee_id)
    ).first()
    if db_member:
        db.delete(db_member)
        db.commit()
        return True
    return False

def add_project_link(db: Session, project_id: str, link: schemas.ProjectLinkAdd) -> models.ProjectLink:
    db_link = models.ProjectLink(
        id=generate_id(),
        project_id=project_id,
        **link.model_dump()
    )
    db.add(db_link)
    db.commit()
    db.refresh(db_link)
    return db_link

def remove_project_link(db: Session, project_id: str, link_id: str) -> bool:
    db_link = db.query(models.ProjectLink).filter(
        and_(models.ProjectLink.project_id == project_id, 
             models.ProjectLink.id == link_id)
    ).first()
    if db_link:
        db.delete(db_link)
        db.commit()
        return True
    return False

# Transaction CRUD
def get_transactions(db: Session) -> List[models.Transaction]:
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()

def finance_summary_month(db: Session, year: int, month: int) -> dict:
    # DB-agnostic filter by date range
    from datetime import date as _date, timedelta as _timedelta
    start = _date(year, month, 1)
    if month == 12:
        end = _date(year + 1, 1, 1)
    else:
        end = _date(year, month + 1, 1)
    inc = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))
        .filter(models.Transaction.transaction_type == "income")
        .filter(models.Transaction.date >= start)
        .filter(models.Transaction.date < end)
        .scalar()
    )
    exp = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))
        .filter(models.Transaction.transaction_type == "expense")
        .filter(models.Transaction.date >= start)
        .filter(models.Transaction.date < end)
        .scalar()
    )
    return {"income": float(inc or 0), "expense": float(exp or 0), "balance": float((inc or 0) - (exp or 0))}

def get_transaction(db: Session, transaction_id: str) -> Optional[models.Transaction]:
    return db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()

def create_transaction(db: Session, transaction: schemas.TransactionCreate) -> models.Transaction:
    db_transaction = models.Transaction(
        id=generate_id(),
        **transaction.model_dump()
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def update_transaction(db: Session, transaction_id: str, transaction: schemas.TransactionUpdate) -> Optional[models.Transaction]:
    db_transaction = get_transaction(db, transaction_id)
    if db_transaction:
        update_data = transaction.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_transaction, field, value)
        db.commit()
        db.refresh(db_transaction)
    return db_transaction

def delete_transaction(db: Session, transaction_id: str) -> bool:
    db_transaction = get_transaction(db, transaction_id)
    if db_transaction:
        db.delete(db_transaction)
        db.commit()
        return True
    return False

# Task CRUD
def get_tasks(db: Session) -> List[models.Task]:
    return db.query(models.Task).order_by(models.Task.created_at.desc()).all()

def find_task_by_text(db: Session, text: str) -> Optional[models.Task]:
    if not text:
        return None
    return db.query(models.Task).filter(models.Task.content.ilike(f"%{text}%")).first()

def list_overdue_tasks(db: Session) -> List[models.Task]:
    today = date.today()
    return (
        db.query(models.Task)
        .filter(models.Task.due_date.isnot(None))
        .filter(models.Task.due_date < today)
        .filter(models.Task.done == False)
        .order_by(models.Task.due_date.asc())
        .all()
    )

def create_task_simple(db: Session, content: str, priority: str = "M", due_date: Optional[date] = None, assigned_to: Optional[str] = None, project_id: Optional[str] = None) -> models.Task:
    db_task = models.Task(
        id=generate_id(),
        content=content,
        priority=priority,
        due_date=due_date,
        done=False,
        assigned_to=assigned_to,
        project_id=project_id,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task(db: Session, task_id: str) -> Optional[models.Task]:
    return db.query(models.Task).filter(models.Task.id == task_id).first()

def create_task(db: Session, task: schemas.TaskCreate) -> models.Task:
    db_task = models.Task(
        id=generate_id(),
        **task.model_dump()
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: str, task: schemas.TaskUpdate) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if db_task:
        update_data = task.model_dump(exclude_unset=True)
        
        # Special handling for None/null values that need to be explicitly set
        # Only for fields that were explicitly provided in the request
        task_dict_with_unset = task.model_dump()  # Get all fields including None values
        task_dict_exclude_unset = task.model_dump(exclude_unset=True)  # Get only set fields
        
        # Only handle null values for fields that were explicitly set in the request
        for field_name in ['work_status']:  # Only work_status needs special null handling for Kanban
            if field_name in task_dict_exclude_unset and task_dict_with_unset[field_name] is None:
                update_data[field_name] = None
        
        for field, value in update_data.items():
            setattr(db_task, field, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def toggle_task(db: Session, task_id: str) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if db_task:
        db_task.done = not db_task.done
        db.commit()
        db.refresh(db_task)
    return db_task

def generate_task_finance_if_needed(db: Session, task_id: str) -> Optional[models.Task]:
    """When task is approved as completed, generate finance records once and set applied rates.
    Idempotent: will not create duplicate transactions if ids already set.
    """
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    if not db_task.done:
        return db_task
    # If already generated, skip
    already_has_any = bool(getattr(db_task, "income_tx_id", None) or getattr(db_task, "expense_tx_id", None))
    # Always set applied rates for audit (may be useful even if no transactions)
    cost_rate, bill_rate = _resolve_rates(db, db_task)
    db_task.applied_hourly_rate = bill_rate or cost_rate
    db_task.applied_cost_rate = cost_rate
    db_task.applied_bill_rate = bill_rate
    if not already_has_any and db_task.billable and (db_task.hours_spent or 0) > 0:
        hours = _round_hours(db_task.hours_spent or 0.0)
        # Expense (cost)
        if cost_rate:
            exp_amount = float(cost_rate) * float(hours)
            exp_tx = models.Transaction(
                id=generate_id(),
                transaction_type="expense",
                amount=exp_amount,
                date=date.today(),
                category="Почасовая оплата (себестоимость)",
                description=f"Задача: {db_task.content}",
                employee_id=db_task.assigned_to,
                project_id=db_task.project_id,
                task_id=db_task.id,
            )
            # ensure tenant scoping for finance records generated from tasks
            try:
                exp_tx.organization_id = getattr(db_task, "organization_id", None)
            except Exception:
                pass
            db.add(exp_tx)
            db_task.expense_tx_id = exp_tx.id
        # Income (billing)
        if bill_rate:
            inc_amount = float(bill_rate) * float(hours)
            inc_tx = models.Transaction(
                id=generate_id(),
                transaction_type="income",
                amount=inc_amount,
                date=date.today(),
                category="Выручка за часы",
                description=f"Задача: {db_task.content}",
                employee_id=db_task.assigned_to,
                project_id=db_task.project_id,
                task_id=db_task.id,
            )
            # ensure tenant scoping for finance records generated from tasks
            try:
                inc_tx.organization_id = getattr(db_task, "organization_id", None)
            except Exception:
                pass
            db.add(inc_tx)
            db_task.income_tx_id = inc_tx.id
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: str) -> bool:
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False

# Goal CRUD
def get_goals(db: Session) -> List[models.Goal]:
    return db.query(models.Goal).order_by(models.Goal.created_at.desc()).all()

def get_goal(db: Session, goal_id: str) -> Optional[models.Goal]:
    return db.query(models.Goal).filter(models.Goal.id == goal_id).first()

def create_goal(db: Session, goal: schemas.GoalCreate, user_id: Optional[str] = None) -> models.Goal:
    db_goal = models.Goal(
        id=generate_id(),
        user_id=user_id,
        **goal.model_dump()
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

def update_goal(db: Session, goal_id: str, goal: schemas.GoalUpdate) -> Optional[models.Goal]:
    db_goal = get_goal(db, goal_id)
    if db_goal:
        update_data = goal.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_goal, field, value)
        db.commit()
        db.refresh(db_goal)
    return db_goal

def update_goal_progress(db: Session, goal_id: str, progress: int) -> Optional[models.Goal]:
    db_goal = get_goal(db, goal_id)
    if db_goal:
        db_goal.progress = max(0, min(100, progress))
        db.commit()
        db.refresh(db_goal)
    return db_goal

def delete_goal(db: Session, goal_id: str) -> bool:
    db_goal = get_goal(db, goal_id)
    if db_goal:
        db.delete(db_goal)
        db.commit()
        return True
    return False

# ReadingItem CRUD
def get_reading_items(db: Session) -> List[models.ReadingItem]:
    return db.query(models.ReadingItem).order_by(models.ReadingItem.added_date.desc()).all()

def get_reading_item(db: Session, item_id: str) -> Optional[models.ReadingItem]:
    return db.query(models.ReadingItem).filter(models.ReadingItem.id == item_id).first()

def create_reading_item(db: Session, item: schemas.ReadingItemCreate, user_id: Optional[str] = None) -> models.ReadingItem:
    db_item = models.ReadingItem(
        id=generate_id(),
        user_id=user_id,
        **item.model_dump()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_reading_item(db: Session, item_id: str, item: schemas.ReadingItemUpdate) -> Optional[models.ReadingItem]:
    db_item = get_reading_item(db, item_id)
    if db_item:
        update_data = item.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_item, field, value)
        db.commit()
        db.refresh(db_item)
    return db_item

def mark_reading_item_as_reading(db: Session, item_id: str) -> Optional[models.ReadingItem]:
    db_item = get_reading_item(db, item_id)
    if db_item:
        db_item.status = "reading"
        db.commit()
        db.refresh(db_item)
    return db_item

def mark_reading_item_as_completed(db: Session, item_id: str, notes: Optional[str] = None) -> Optional[models.ReadingItem]:
    db_item = get_reading_item(db, item_id)
    if db_item:
        db_item.status = "completed"
        db_item.completed_date = date.today()
        if notes:
            db_item.notes = notes
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_reading_item(db: Session, item_id: str) -> bool:
    db_item = get_reading_item(db, item_id)
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False

# Note CRUD
def get_notes(db: Session) -> List[models.Note]:
    return db.query(models.Note).order_by(models.Note.date.desc()).all()

def get_note(db: Session, note_id: str) -> Optional[models.Note]:
    return db.query(models.Note).filter(models.Note.id == note_id).first()

def create_note(db: Session, note: schemas.NoteCreate, user_id: Optional[str] = None) -> models.Note:
    db_note = models.Note(
        id=generate_id(),
        user_id=user_id,
        **note.model_dump()
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

def update_note(db: Session, note_id: str, note: schemas.NoteUpdate) -> Optional[models.Note]:
    db_note = get_note(db, note_id)
    if db_note:
        update_data = note.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_note, field, value)
        db.commit()
        db.refresh(db_note)
    return db_note

def delete_note(db: Session, note_id: str) -> bool:
    db_note = get_note(db, note_id)
    if db_note:
        db.delete(db_note)
        db.commit()
        return True
    return False 

def update_user_profile(db: Session, user_id: str, name: Optional[str], profile_patch: Optional[dict] = None) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
    if name is not None:
        user.name = name
    if profile_patch:
        profile = ensure_user_profile(db, user.id)
        # Handle secret update explicitly; allow clearing via empty string/null
        if "openrouter_api_key" in profile_patch:
            v = profile_patch.get("openrouter_api_key")
            if v is None or (isinstance(v, str) and v.strip() == ""):
                profile.openrouter_api_key = None
            else:
                profile.openrouter_api_key = str(v).strip()
        # Apply other public fields
        for k, v in profile_patch.items():
            if k == "openrouter_api_key":
                continue
            setattr(profile, k, v)
    db.commit()
    db.refresh(user)
    return user

def change_user_password(db: Session, user_id: str, current_password: str, new_password: str) -> bool:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False
    if not verify_password(user, current_password):
        return False
    new_salt = uuid.uuid4().hex
    user.password_salt = new_salt
    user.password_hash = hash_password(new_password, new_salt)
    db.commit()
    return True

def delete_session(db: Session, token: str) -> None:
    sess = db.query(models.Session).filter(models.Session.token == token).first()
    if sess:
        db.delete(sess)
        db.commit() 