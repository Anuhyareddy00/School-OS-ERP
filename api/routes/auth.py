from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.security import hash_password, verify_password, create_access_token
from services import store
from services.db import db, is_db_enabled

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    role: str  # ADMIN/TEACHER/STUDENT/PARENT


class LoginIn(BaseModel):
    email: str  # email or admissionNo
    password: str


@router.post("/register")
async def register(body: RegisterIn):
    role = body.role.upper()
    if role not in ["ADMIN", "TEACHER", "STUDENT", "PARENT"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    email = body.email.lower()
    password_hash = hash_password(body.password)

    if is_db_enabled():
        existing = await db.user.find_unique(where={"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        user = await db.user.create(
            data={
                "name": body.name,
                "email": email,
                "password": password_hash,
                "role": role,
            }
        )
        return {"id": user.id, "email": user.email, "role": user.role}

    for u in store.users.values():
        if u["email"].lower() == email:
            raise HTTPException(status_code=400, detail="Email already exists")

    user_id = store.new_id()
    store.users[user_id] = {
        "id": user_id,
        "name": body.name,
        "email": email,
        "password": password_hash,
        "role": role,
    }
    return {"id": user_id, "email": email, "role": role}


@router.post("/login")
async def login(body: LoginIn):
    identifier = body.email.strip()
    email = identifier.lower()

    if is_db_enabled():
        user = await db.user.find_unique(where={"email": email})
        if not user and "@" not in identifier:
            student = await db.student.find_unique(where={"admissionNo": identifier.upper()})
            if student and student.studentUserId:
                user = await db.user.find_unique(where={"id": student.studentUserId})
        if not user or not verify_password(body.password, user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token(
            {"sub": user.id, "role": user.role, "email": user.email, "name": user.name}
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "name": user.name,
        }

    user = None
    for u in store.users.values():
        if u["email"] == email:
            user = u
            break
    if not user and "@" not in identifier:
        student = next(
            (s for s in store.students.values() if s.get("admissionNo", "").upper() == identifier.upper()),
            None,
        )
        if student:
            uid = store.student_user_links.get(student["id"])
            user = store.users.get(uid) if uid else None
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        {"sub": user["id"], "role": user["role"], "email": user["email"], "name": user["name"]}
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "name": user["name"],
    }
