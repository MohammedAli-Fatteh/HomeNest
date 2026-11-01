"""Signup and email+password login. Google sign-in lives in auth_google.py (next phase)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RoleEnum, SellerStatusEnum, User
from app.schemas import LoginRequest, SignupRequest, TokenResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists")
    if body.role == RoleEnum.admin:
        # Admin accounts are never self-assigned at signup — they're created directly in the
        # database (or promoted by an existing admin). Otherwise anyone could sign up as admin.
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot sign up as admin")

    # Signing up as a seller doesn't make you one immediately — an admin must approve first.
    seller_status = SellerStatusEnum.pending if body.role == RoleEnum.seller else SellerStatusEnum.none

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        seller_status=seller_status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or user.password_hash is None or not verify_password(body.password, user.password_hash):
        # Same error for "no such user" and "wrong password" — don't reveal which one it was.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=user)


from app.deps import get_current_user  # noqa: E402  (placed here to avoid a circular import at module load time)
from app.schemas import UserOut


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    """So the frontend can restore a logged-in session on page reload using the saved
    token, without asking for the password again."""
    return user
