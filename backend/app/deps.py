"""Shared FastAPI dependencies: 'who is making this request', 'are they allowed here'."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RoleEnum, SellerStatusEnum, User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in")
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.query(User).get(int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


def require_approved_seller(user: User = Depends(get_current_user)) -> User:
    if user.role != RoleEnum.seller or user.seller_status != SellerStatusEnum.approved:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Seller account not approved yet")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != RoleEnum.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return user


def require_seller_signup(user: User = Depends(get_current_user)) -> User:
    """For routes any seller can use before approval (e.g. filling in shop details) —
    just needs to have signed up as a seller, pending or approved."""
    if user.role != RoleEnum.seller:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only seller accounts can do this")
    return user
