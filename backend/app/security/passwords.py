import re
from passlib.context import CryptContext
from fastapi import HTTPException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def validate_password_strength(password: str) -> None:
    if len(password) < 10:
        raise HTTPException(status_code=400, detail="Password too short")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must include uppercase")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must include lowercase")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must include a digit")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(status_code=400, detail="Password must include a symbol")
