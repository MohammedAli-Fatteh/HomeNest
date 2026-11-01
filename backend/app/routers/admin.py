"""Admin-only: approve or reject sellers who signed up and are waiting for review."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Seller, SellerStatusEnum, User
from app.schemas import PendingSellerOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/sellers/pending", response_model=list[PendingSellerOut])
def list_pending_sellers(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    pending_users = db.query(User).filter(User.seller_status == SellerStatusEnum.pending).all()
    out = []
    for u in pending_users:
        seller = db.query(Seller).filter(Seller.user_id == u.id).first()
        out.append(PendingSellerOut(
            user_id=u.id, name=u.name, email=u.email,
            shop_name=seller.shop_name if seller else None,
            description=seller.description if seller else None,
        ))
    return out


def _set_seller_status(db: Session, user_id: int, new_status: SellerStatusEnum) -> User:
    user = db.query(User).get(user_id)
    if user is None or user.role.value != "seller":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No pending seller with that id")
    user.seller_status = new_status
    db.commit()
    return user


@router.post("/sellers/{user_id}/approve")
def approve_seller(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = _set_seller_status(db, user_id, SellerStatusEnum.approved)
    return {"user_id": user.id, "seller_status": user.seller_status.value}


@router.post("/sellers/{user_id}/reject")
def reject_seller(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = _set_seller_status(db, user_id, SellerStatusEnum.rejected)
    return {"user_id": user.id, "seller_status": user.seller_status.value}
