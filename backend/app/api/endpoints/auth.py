from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# Mock DB
class User(BaseModel):
    username: str
    password: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    username: str

users_db = [
    User(username="admin", password="password", role="admin"),
    User(username="user", password="password", role="user"),
]

@router.post("/api/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = next((u for u in users_db if u.username == req.username and u.password == req.password), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return {"token": "mock-token-123", "role": user.role, "username": user.username}
