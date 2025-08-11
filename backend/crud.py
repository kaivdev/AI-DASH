from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
import uuid
from datetime import date, datetime
import hashlib
import os

import models
import schemas

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
        }
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "profile": profile_dict,
    }

def ensure_user_profile(db: Session, user_id: str) -> models.UserProfile:
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if not profile:
        profile = models.UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

# Seed owner and registration code
OWNER_EMAIL = "kaivasfilm@yandex.ru"
OWNER_PASSWORD = "zXsWqaed321"
DEFAULT_CODE = "667788"

def ensure_owner_and_code(db: Session) -> None:
    # registration code
    code = db.query(models.RegistrationCode).filter(models.RegistrationCode.code == DEFAULT_CODE).first()
    if not code:
        db.add(models.RegistrationCode(code=DEFAULT_CODE, is_active=True))
        db.commit()
    # owner user
    user = db.query(models.User).filter(models.User.email == OWNER_EMAIL).first()
    if not user:
        salt = uuid.uuid4().hex
        password_hash = hash_password(OWNER_PASSWORD, salt)
        owner = models.User(
            id=generate_id(),
            email=OWNER_EMAIL,
            name="Owner",
            role="owner",
            password_salt=salt,
            password_hash=password_hash,
        )
        db.add(owner)
        db.commit()
        ensure_user_profile(db, owner.id)

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

# Employee CRUD
def get_employees(db: Session) -> List[models.Employee]:
    return db.query(models.Employee).all()

def find_employee_by_name(db: Session, name: str) -> Optional[models.Employee]:
    if not name:
        return None
    # simple case-insensitive containment
    q = db.query(models.Employee).filter(models.Employee.name.ilike(f"%{name}%")).first()
    return q

def get_employee(db: Session, employee_id: str) -> Optional[models.Employee]:
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def create_employee(db: Session, employee: schemas.EmployeeCreate) -> models.Employee:
    db_employee = models.Employee(
        id=generate_id(),
        **employee.model_dump()
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: str, employee: schemas.EmployeeUpdate) -> Optional[models.Employee]:
    db_employee = get_employee(db, employee_id)
    if db_employee:
        update_data = employee.model_dump(exclude_unset=True)
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
    if db_employee:
        db.delete(db_employee)
        db.commit()
        return True
    return False

# Project CRUD
def get_projects(db: Session) -> List[models.Project]:
    projects = db.query(models.Project).all()
    # Add member_ids to each project
    for project in projects:
        project.member_ids = [m.employee_id for m in project.members]
    return projects

def get_project(db: Session, project_id: str) -> Optional[models.Project]:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project:
        project.member_ids = [m.employee_id for m in project.members]
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
    inc = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))
        .filter(models.Transaction.transaction_type == "income")
        .filter(func.strftime('%Y', models.Transaction.date) == str(year))
        .filter(func.strftime('%m', models.Transaction.date) == f"{month:02d}")
        .scalar()
    )
    exp = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))
        .filter(models.Transaction.transaction_type == "expense")
        .filter(func.strftime('%Y', models.Transaction.date) == str(year))
        .filter(func.strftime('%m', models.Transaction.date) == f"{month:02d}")
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

def create_goal(db: Session, goal: schemas.GoalCreate) -> models.Goal:
    db_goal = models.Goal(
        id=generate_id(),
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

def create_reading_item(db: Session, item: schemas.ReadingItemCreate) -> models.ReadingItem:
    db_item = models.ReadingItem(
        id=generate_id(),
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

def create_note(db: Session, note: schemas.NoteCreate) -> models.Note:
    db_note = models.Note(
        id=generate_id(),
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
        for k, v in profile_patch.items():
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