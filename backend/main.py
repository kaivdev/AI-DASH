from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import os

import models
import schemas
import crud
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

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

    user = crud.create_user(db, email=payload.email, password=payload.password, role="user")
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
def get_employees(db: Session = Depends(get_db)):
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
def get_projects(db: Session = Depends(get_db)):
    return crud.get_projects(db)

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.post("/api/projects", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, project)

@app.put("/api/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: str, project: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = crud.update_project(db, project_id, project)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.delete("/api/projects/{project_id}", response_model=schemas.MessageResponse)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    if crud.delete_project(db, project_id):
        return {"message": "Project deleted successfully"}
    raise HTTPException(status_code=404, detail="Project not found")

@app.post("/api/projects/{project_id}/members", response_model=schemas.MessageResponse)
def add_project_member(project_id: str, member: schemas.ProjectMemberAdd, db: Session = Depends(get_db)):
    if crud.add_project_member(db, project_id, member.employee_id):
        return {"message": "Member added successfully"}
    raise HTTPException(status_code=400, detail="Member already exists or invalid data")

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
def get_transactions(db: Session = Depends(get_db)):
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
def get_tasks(db: Session = Depends(get_db)):
    return crud.get_tasks(db)

@app.get("/api/tasks/{task_id}", response_model=schemas.Task)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/api/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, task)

@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: str, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = crud.update_task(db, task_id, task)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.put("/api/tasks/{task_id}/toggle", response_model=schemas.Task)
def toggle_task(task_id: str, db: Session = Depends(get_db)):
    db_task = crud.toggle_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.delete("/api/tasks/{task_id}", response_model=schemas.MessageResponse)
def delete_task(task_id: str, db: Session = Depends(get_db)):
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
def get_reading_items(db: Session = Depends(get_db)):
    return crud.get_reading_items(db)

@app.get("/api/reading/{item_id}", response_model=schemas.ReadingItem)
def get_reading_item(item_id: str, db: Session = Depends(get_db)):
    item = crud.get_reading_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Reading item not found")
    return item

@app.post("/api/reading", response_model=schemas.ReadingItem)
def create_reading_item(item: schemas.ReadingItemCreate, db: Session = Depends(get_db)):
    return crud.create_reading_item(db, item)

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
def get_notes(db: Session = Depends(get_db)):
    return crud.get_notes(db)

@app.get("/api/notes/{note_id}", response_model=schemas.Note)
def get_note(note_id: str, db: Session = Depends(get_db)):
    note = crud.get_note(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.post("/api/notes", response_model=schemas.Note)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db)):
    return crud.create_note(db, note)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 