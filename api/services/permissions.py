from fastapi import HTTPException, status

def require_role(user: dict, roles: list[str]):
    if user["role"] not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
