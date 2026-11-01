"""Everything a seller does for their own shop: set up their profile, manage their own
products and stock, and see orders placed for their products."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_approved_seller, require_seller_signup
from app.models import Order, OrderItem, Product, Seller, User
from app.schemas import (ProductCreate, ProductOut, ProductUpdate,
                          SellerOrderItemOut, SellerOut, SellerProfileRequest)

router = APIRouter(prefix="/seller", tags=["seller"])


def _get_own_seller_row(db: Session, user: User) -> Seller:
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if seller is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Set up your shop profile first (POST /seller/profile)")
    return seller


@router.post("/profile", response_model=SellerOut)
def set_profile(body: SellerProfileRequest, user: User = Depends(require_seller_signup), db: Session = Depends(get_db)):
    """A seller fills this in once, right after signup (even before admin approval)."""
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if seller is None:
        seller = Seller(user_id=user.id, shop_name=body.shop_name, description=body.description)
        db.add(seller)
    else:
        seller.shop_name = body.shop_name
        seller.description = body.description
    db.commit()
    db.refresh(seller)
    return seller


@router.get("/products", response_model=list[ProductOut])
def list_my_products(user: User = Depends(require_approved_seller), db: Session = Depends(get_db)):
    seller = _get_own_seller_row(db, user)
    return db.query(Product).filter(Product.seller_id == seller.id).all()


@router.post("/products", response_model=ProductOut)
def create_product(body: ProductCreate, user: User = Depends(require_approved_seller), db: Session = Depends(get_db)):
    seller = _get_own_seller_row(db, user)
    product = Product(seller_id=seller.id, **body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _get_own_product(db: Session, user: User, product_id: int) -> Product:
    seller = _get_own_seller_row(db, user)
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if product is None:
        # Same error whether the product doesn't exist or belongs to someone else —
        # don't reveal that a product ID belongs to another seller.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, body: ProductUpdate, user: User = Depends(require_approved_seller), db: Session = Depends(get_db)):
    product = _get_own_product(db, user, product_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}")
def delete_product(product_id: int, user: User = Depends(require_approved_seller), db: Session = Depends(get_db)):
    product = _get_own_product(db, user, product_id)
    db.delete(product)
    db.commit()
    return {"deleted": product_id}


@router.get("/orders", response_model=list[SellerOrderItemOut])
def my_orders(user: User = Depends(require_approved_seller), db: Session = Depends(get_db)):
    """Every order line that includes one of this seller's products — one row per
    product per order, so a single order split across sellers only shows each seller
    their own part of it."""
    seller = _get_own_seller_row(db, user)
    rows = (
        db.query(OrderItem, Order, Product)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(OrderItem.seller_id == seller.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        SellerOrderItemOut(
            order_id=order.id, order_status=order.status.value, product_id=product.id,
            product_name=product.name, quantity=item.quantity, price_at_purchase=float(item.price_at_purchase),
        )
        for item, order, product in rows
    ]
