"""Room Planner backend: budget-aware furniture suggestions, and saving/sharing a
finished room design via a short link anyone can open (no login needed to view)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Product, RoomDesign, User
from app.schemas import (RoomDesignOut, SaveDesignRequest, SuggestedItem,
                          SuggestRequest, SuggestResponse)

router = APIRouter(prefix="/room-designs", tags=["room-planner"])


@router.post("/suggest", response_model=SuggestResponse)
def suggest(body: SuggestRequest, db: Session = Depends(get_db)):
    """Greedy budget allocation: go through the user's category list in the order they
    gave (their stated priority), and for each one spend as much of the REMAINING budget
    as possible — i.e. pick the most expensive product in that category we can still
    afford. This maximizes quality in the categories the user cares about most, rather
    than spreading the budget thin and evenly across everything."""
    remaining = body.budget
    suggestions, unfilled = [], []

    for category in body.categories:
        candidates = (
            db.query(Product)
            .filter(Product.category == category, Product.price <= remaining, Product.stock_qty > 0)
            .order_by(Product.price.desc())
            .first()
        )
        if candidates is None:
            unfilled.append(category)
            continue
        suggestions.append(SuggestedItem(category=category, product=candidates))
        remaining -= float(candidates.price)

    total_cost = body.budget - remaining
    return SuggestResponse(
        suggestions=suggestions, unfilled_categories=unfilled,
        total_cost=round(total_cost, 2), budget_remaining=round(remaining, 2),
    )


def _to_out(design: RoomDesign) -> RoomDesignOut:
    return RoomDesignOut(
        id=design.id, share_token=design.share_token, name=design.name,
        budget=float(design.budget) if design.budget is not None else None,
        layout_json=design.layout_json, created_at=design.created_at.isoformat(),
    )


@router.post("", response_model=RoomDesignOut)
def save_design(body: SaveDesignRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    design = RoomDesign(user_id=user.id, name=body.name, budget=body.budget, layout_json=body.layout_json)
    db.add(design)
    db.commit()
    db.refresh(design)
    return _to_out(design)


@router.get("/mine", response_model=list[RoomDesignOut])
def my_designs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    designs = db.query(RoomDesign).filter(RoomDesign.user_id == user.id).order_by(RoomDesign.created_at.desc()).all()
    return [_to_out(d) for d in designs]


@router.get("/{share_token}", response_model=RoomDesignOut)
def get_shared_design(share_token: str, db: Session = Depends(get_db)):
    """No login needed — this is the public link a student shares with classmates."""
    design = db.query(RoomDesign).filter(RoomDesign.share_token == share_token).first()
    if design is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No design found for that link")
    return _to_out(design)


@router.delete("/{design_id}")
def delete_design(design_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    design = db.query(RoomDesign).filter(RoomDesign.id == design_id, RoomDesign.user_id == user.id).first()
    if design is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found")
    db.delete(design)
    db.commit()
    return {"deleted": design_id}
