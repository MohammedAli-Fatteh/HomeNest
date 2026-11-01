"""Product reviews — a buyer can only review something they actually bought and paid
for, and only once per purchase (the DB has a unique constraint on order_item_id as a
second line of defense, in case two requests race)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import OrderItem, OrderStatusEnum, Product, Review, User
from app.schemas import ProductReviewsOut, ReviewCreate, ReviewOut

router = APIRouter(tags=["reviews"])


@router.post("/products/{product_id}/reviews", response_model=ReviewOut)
def create_review(product_id: int, body: ReviewCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order_item = db.query(OrderItem).filter(OrderItem.id == body.order_item_id).first()
    if order_item is None or order_item.product_id != product_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That purchase was not found for this product")
    if order_item.order.buyer_id != user.id:
        # Not "that's not your order" — don't confirm the order_item exists to someone
        # probing IDs that aren't theirs.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That purchase was not found for this product")
    if order_item.order.status != OrderStatusEnum.paid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can only review a purchase that has been paid for")

    review = Review(
        product_id=product_id, buyer_id=user.id, order_item_id=body.order_item_id,
        rating=body.rating, comment=body.comment,
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You've already reviewed this purchase")
    db.refresh(review)

    return ReviewOut(
        id=review.id, buyer_name=user.name, rating=review.rating,
        comment=review.comment, created_at=review.created_at.isoformat(),
    )


@router.get("/products/{product_id}/reviews", response_model=ProductReviewsOut)
def list_reviews(product_id: int, db: Session = Depends(get_db)):
    if db.query(Product).get(product_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    reviews = db.query(Review).filter(Review.product_id == product_id).order_by(Review.created_at.desc()).all()
    average = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else None

    out = []
    for r in reviews:
        buyer = db.query(User).get(r.buyer_id)
        out.append(ReviewOut(
            id=r.id, buyer_name=buyer.name if buyer else "Unknown",
            rating=r.rating, comment=r.comment, created_at=r.created_at.isoformat(),
        ))

    return ProductReviewsOut(average_rating=average, review_count=len(reviews), reviews=out)
