from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime

# Employee schemas
class EmployeeBase(BaseModel):
    name: str
    position: str
    email: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    salary: Optional[float] = None
    revenue: Optional[float] = None
    current_status: str
    status_tag: Optional[str] = None
    status_date: date
    hourly_rate: Optional[int] = None  # legacy
    cost_hourly_rate: Optional[int] = None
    bill_hourly_rate: Optional[int] = None
    planned_monthly_hours: Optional[int] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    email: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    salary: Optional[float] = None
    revenue: Optional[float] = None
    current_status: Optional[str] = None
    status_tag: Optional[str] = None
    status_date: Optional[date] = None
    hourly_rate: Optional[int] = None
    cost_hourly_rate: Optional[int] = None
    bill_hourly_rate: Optional[int] = None
    planned_monthly_hours: Optional[int] = None

class EmployeeStatusUpdate(BaseModel):
    current_status: str
    status_tag: Optional[str] = None

class Employee(EmployeeBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Optional avatar URL from linked user profile
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

# Employee statistics
class EmployeeStats(BaseModel):
    total_hours: float
    total_revenue: float
    total_salary_cost: float
    active_projects_count: int
    completed_tasks: int
    in_progress_tasks: int
    actual_hourly_rate: float
    revenue_per_hour: float
    profit_margin: float
    period_label: str

class EmployeeStatsRequest(BaseModel):
    date_from: Optional[str] = None  # YYYY-MM-DD format
    date_to: Optional[str] = None    # YYYY-MM-DD format
    period_type: Optional[str] = None  # 'month', 'quarter', 'custom'

# Project schemas
class ProjectLinkBase(BaseModel):
    title: str
    url: str
    link_type: str

class ProjectLinkCreate(ProjectLinkBase):
    pass

class ProjectLink(ProjectLinkBase):
    id: str
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    status: str = "active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class Project(ProjectBase):
    id: str
    links: List[ProjectLink] = []
    member_ids: List[str] = []
    member_rates: dict[str, int | None] = {}
    # optional detailed rates per member (new)
    member_cost_rates: dict[str, int | None] = {}
    member_bill_rates: dict[str, int | None] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    transaction_type: str  # income, expense
    amount: float
    date: date
    category: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []
    employee_id: Optional[str] = None
    project_id: Optional[str] = None
    task_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    transaction_type: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    employee_id: Optional[str] = None
    project_id: Optional[str] = None

class Transaction(TransactionBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Task schemas
class TaskBase(BaseModel):
    content: str
    priority: str  # L, M, H
    due_date: Optional[date] = None
    done: bool = False
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    hours_spent: float = 0.0
    billable: bool = True
    hourly_rate_override: Optional[int] = None
    cost_rate_override: Optional[int] = None
    bill_rate_override: Optional[int] = None
    work_status: Optional[str] = None  # in_progress, paused

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    content: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    done: Optional[bool] = None
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    hours_spent: Optional[float] = None
    billable: Optional[bool] = None
    hourly_rate_override: Optional[int] = None
    cost_rate_override: Optional[int] = None
    bill_rate_override: Optional[int] = None
    work_status: Optional[str] = None
    approved: Optional[bool] = None

class Task(TaskBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    applied_hourly_rate: Optional[int] = None
    applied_cost_rate: Optional[int] = None
    applied_bill_rate: Optional[int] = None
    approved: Optional[bool] = None
    approved_at: Optional[datetime] = None
    work_status: Optional[str] = None
    income_tx_id: Optional[str] = None
    expense_tx_id: Optional[str] = None

    class Config:
        from_attributes = True

# Goal schemas
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    period: str  # monthly, quarterly, yearly
    start_date: date
    end_date: date
    status: str = "active"
    progress: int = Field(default=0, ge=0, le=100)
    tags: List[str] = []

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    period: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    tags: Optional[List[str]] = None

class Goal(GoalBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ReadingItem schemas
class ReadingItemBase(BaseModel):
    title: str
    url: Optional[str] = None
    content: Optional[str] = None
    item_type: str  # article, book, video, podcast, course, other
    status: str = "to_read"
    priority: str  # L, M, H
    tags: List[str] = []
    added_date: date
    completed_date: Optional[date] = None
    notes: Optional[str] = None

class ReadingItemCreate(ReadingItemBase):
    pass

class ReadingItemUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    item_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = None
    added_date: Optional[date] = None
    completed_date: Optional[date] = None
    notes: Optional[str] = None

class ReadingItem(ReadingItemBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Note schemas
class NoteBase(BaseModel):
    date: date
    title: Optional[str] = None
    content: str
    tags: List[str] = []
    shared: bool = False

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    date: Optional[date] = None
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    shared: Optional[bool] = None

class Note(NoteBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Response schemas
class MessageResponse(BaseModel):
    message: str

class ProjectMemberAdd(BaseModel):
    employee_id: str

class ProjectLinkAdd(BaseModel):
    title: str
    url: str
    link_type: str

# --- Auth schemas ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    # Accept both snake_case and camelCase from frontend (confirm_password or confirmPassword)
    confirm_password: str = Field(..., alias="confirmPassword")
    code: Optional[str] = Field(None, description="Registration code, empty string treated as None")
    # Accept both naming styles for convenience
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")

    # pydantic v2: allow population by field name in addition to alias
    model_config = {"populate_by_name": True}
    
    @field_validator('code')
    @classmethod
    def empty_string_to_none(cls, v):
        # Convert empty or whitespace-only strings to None
        if isinstance(v, str) and not v.strip():
            return None
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserProfileOut(BaseModel):
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    telegram: Optional[str] = None
    github: Optional[str] = None
    twitter: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None
    # whether user has configured an OpenRouter key (masked; actual key is never returned)
    has_openrouter_key: bool = False

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    role: str
    profile: Optional[UserProfileOut] = None

class AuthResponse(BaseModel):
    user: UserOut
    token: str

class MeResponse(UserOut):
    pass

class UserProfileUpdate(BaseModel):
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None
    telegram: Optional[str] = None
    github: Optional[str] = None
    twitter: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None
    # Optional: set or clear per-user OpenRouter API key
    openrouter_api_key: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile: Optional[UserProfileUpdate] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# --- Invite codes ---
class InviteCodeOut(BaseModel):
    id: int
    code: str
    is_active: bool
    created_at: datetime

class InviteCodeCreate(BaseModel):
    code: str | None = None

# --- User Tags schemas ---
class UserTagBase(BaseModel):
    tag_value: str
    tag_type: str

class UserTagCreate(UserTagBase):
    pass

class UserTagUpdate(BaseModel):
    tag_value: Optional[str] = None
    tag_type: Optional[str] = None

class UserTag(UserTagBase):
    id: str
    user_id: str
    usage_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserTagsResponse(BaseModel):
    tags: List[UserTag]

# --- AI command schemas ---
class AICommandRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    chat_id: Optional[str] = None

class AICommandResult(BaseModel):
    summary: str
    actions: List[str] = []
    created_task_ids: List[str] = []

class AIChatResponse(BaseModel):
    result: AICommandResult 

# --- Chat session schemas ---
class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionOut(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = None

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None 