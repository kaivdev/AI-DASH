from sqlalchemy import Column, Integer, String, Boolean, Float, Date, DateTime, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from typing import List

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    email = Column(String, nullable=True)
    salary = Column(Float, nullable=True)
    revenue = Column(Float, nullable=True)
    current_status = Column(String, nullable=False)
    status_tag = Column(String, nullable=True)
    status_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # New: hourly rate in RUB (integer, no kopecks)
    hourly_rate = Column(Integer, nullable=True)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="employee")
    tasks = relationship("Task", back_populates="assigned_employee")
    project_memberships = relationship("ProjectMember", back_populates="employee")

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
    # New: project-specific hourly rate (RUB)
    hourly_rate = Column(Integer, nullable=True)
    
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
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
    hourly_rate_override = Column(Integer, nullable=True)
    applied_hourly_rate = Column(Integer, nullable=True)
    
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

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(String, primary_key=True)
    date = Column(Date, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

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

    user = relationship("User", back_populates="profile")

class RegistrationCode(Base):
    __tablename__ = "registration_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Session(Base):
    __tablename__ = "sessions"

    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 