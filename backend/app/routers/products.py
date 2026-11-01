"""Public storefront browsing — no login needed, anyone can see what's for sale.
Also attaches the seller's shop name and a REAL average rating computed from the
reviews table (not a stored/fake number) to every product shown here."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, Review, Seller
from app.schemas import ProductOut

router = APIRouter(prefix="/products", tags=["products"])


def _with_extras(product: Product, db: Session) -> ProductOut:
    seller = db.query(Seller).get(product.seller_id)
    reviews = db.query(Review).filter(Review.product_id == product.id).all()
    rating_avg = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else None
    out = ProductOut.model_validate(product)
    out.seller_name = seller.shop_name if seller else None
    out.rating_avg = rating_avg
    out.review_count = len(reviews)
    return out


@router.get("", response_model=list[ProductOut])
def list_products(category: str | None = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(Product)
    if category:
        q = q.filter(Product.category == category)
    return [_with_extras(p, db) for p in q.all()]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).get(product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return _with_extras(product, db)
