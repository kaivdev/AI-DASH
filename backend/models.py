from sqlalchemy import Column, Integer, String, Boolean, Float, Date, DateTime, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from typing import List
from uuid import uuid4

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    email = Column(String, nullable=True)
    # Telegram private chat id for bot notifications (string to be db-agnostic)
    telegram_chat_id = Column(String, nullable=True)
    salary = Column(Float, nullable=True)
    revenue = Column(Float, nullable=True)
    current_status = Column(String, nullable=False)
    status_tag = Column(String, nullable=True)
    status_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Legacy: single hourly rate in RUB (integer, no kopecks)
    hourly_rate = Column(Integer, nullable=True)
    # New: separate rates
    cost_hourly_rate = Column(Integer, nullable=True)  # фактическая стоимость часа сотрудника
    bill_hourly_rate = Column(Integer, nullable=True)  # сколько берем с клиента за час
    # Per-employee planned working hours per month (used for salary -> cost rate calc)
    planned_monthly_hours = Column(Integer, nullable=True)
    # Link to app user (optional, unique per user)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=True)
    # Tenant scoping
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="employee")
    tasks = relationship("Task", back_populates="assigned_employee")
    # Delete project membership rows when employee is deleted to avoid FK NULL updates
    project_memberships = relationship(
        "ProjectMember",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    status = Column(String, nullable=False, default="active")  # active, completed, paused, cancelled
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Tenant scoping
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    
    # Relationships
    links = relationship("ProjectLink", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project")

class ProjectLink(Base):
    __tablename__ = "project_links"
    
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    link_type = Column(String, nullable=False)  # repo, docs, design, other
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="links")

class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    # Legacy: project-specific hourly rate (treated as BILL rate)
    hourly_rate = Column(Integer, nullable=True)
    # New separate rates per project member
    cost_hourly_rate = Column(Integer, nullable=True)
    bill_hourly_rate = Column(Integer, nullable=True)
    
    __table_args__ = (
        UniqueConstraint("project_id", "employee_id", name="uq_project_members_pair"),
    )
    
    # Relationships
    project = relationship("Project", back_populates="members")
    employee = relationship("Employee", back_populates="project_memberships")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True)
    transaction_type = Column(String, nullable=False)  # income, expense
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String, nullable=True)
    description = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Tenant scoping
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    
    # Relationships
    employee = relationship("Employee", back_populates="transactions")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True)
    content = Column(String, nullable=False)
    priority = Column(String, nullable=False)  # L, M, H
    due_date = Column(Date, nullable=True)
    done = Column(Boolean, default=False, nullable=False)
    assigned_to = Column(String, ForeignKey("employees.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # New: time tracking and rates
    hours_spent = Column(Float, nullable=False, default=0.0)
    billable = Column(Boolean, nullable=False, default=True)
    # Legacy single override
    hourly_rate_override = Column(Integer, nullable=True)
    # New separate overrides
    cost_rate_override = Column(Integer, nullable=True)
    bill_rate_override = Column(Integer, nullable=True)
    applied_hourly_rate = Column(Integer, nullable=True)
    # New: separate applied rates for audit
    applied_cost_rate = Column(Integer, nullable=True)
    applied_bill_rate = Column(Integer, nullable=True)
    # New: admin approval for completion
    approved = Column(Boolean, nullable=False, default=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    # New: work status for employees
    work_status = Column(String, nullable=True)  # in_progress, paused
    # Link created finance transactions
    income_tx_id = Column(String, nullable=True)
    expense_tx_id = Column(String, nullable=True)
    # Tenant scoping
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    
    # Relationships
    assigned_employee = relationship("Employee", back_populates="tasks")
    project = relationship("Project", back_populates="tasks")

class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    period = Column(String, nullable=False)  # monthly, quarterly, yearly
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="active")  # active, completed, paused
    progress = Column(Integer, default=0, nullable=False)  # 0-100
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Owner user id (scoping)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)

class ReadingItem(Base):
    __tablename__ = "reading_items"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    item_type = Column(String, nullable=False)  # article, book, video, podcast, course, other
    status = Column(String, nullable=False, default="to_read")  # to_read, reading, completed, archived
    priority = Column(String, nullable=False)  # L, M, H
    tags = Column(JSON, default=list)
    added_date = Column(Date, nullable=False)
    completed_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Owner user id (scoping)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(String, primary_key=True)
    date = Column(Date, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    tags = Column(JSON, default=list)
    # Share with all employees
    shared = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Owner user id (scoping)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)

# --- Auth models ---
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="user")  # user, owner, admin
    password_salt = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Tenant scoping
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    position = Column(String, nullable=True)
    company = Column(String, nullable=True)
    website = Column(String, nullable=True)
    telegram = Column(String, nullable=True)
    github = Column(String, nullable=True)
    twitter = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    locale = Column(String, nullable=True)
    # Per-user OpenRouter API key (secret); not returned in API responses
    openrouter_api_key = Column(String, nullable=True)

    user = relationship("User", back_populates="profile")

class RegistrationCode(Base):
    __tablename__ = "registration_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    # кто создал код (владелец/админ)
    created_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Session(Base):
    __tablename__ = "sessions"

    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 

# Доп: привязка, кто пригласил пользователя (для исторической связи)
from sqlalchemy import ForeignKey as _FK
setattr(__import__(__name__), 'User_invited_by_marker', True)

class _UserInviteMixin:
    invited_by_user_id = Column(String, _FK("users.id"), nullable=True)

# --- Chat models ---
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True)  # uuid
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True)  # uuid
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages") 