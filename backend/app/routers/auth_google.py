"""Google sign-in. The frontend uses Google's own sign-in button, which gives it an
id_token (a signed credential) — this endpoint verifies that token with Google and then
logs the user in, creating an account automatically on first sign-in."""
from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import RoleEnum, SellerStatusEnum, User
from app.schemas import GoogleLoginRequest, TokenResponse
from app.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


def verify_google_token(token: str) -> dict:
    """Asks Google to confirm this token is real and get the email/name out of it.
    Split into its own function so tests can swap it out without calling Google."""
    try:
        return google_id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google token")


@router.post("/google", response_model=TokenResponse)
def google_login(body: GoogleLoginRequest, db: Session = Depends(get_db)):
    info = verify_google_token(body.id_token)
    google_id = info["sub"]
    email = info["email"]

    user = db.query(User).filter(User.google_id == google_id).first()
    if user is None:
        # Someone may have signed up earlier with email+password using the same email —
        # link the Google ID to that existing account instead of making a duplicate.
        user = db.query(User).filter(User.email == email).first()
        if user is not None:
            user.google_id = google_id
        else:
            user = User(
                name=info.get("name", email.split("@")[0]),
                email=email,
                google_id=google_id,
                role=RoleEnum.buyer,
                seller_status=SellerStatusEnum.none,
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=user)
