"""Cart -> order, with a real atomic transaction, plus Razorpay payment verification.

The important part is checkout(): it is ONE database transaction that (1) locks every
product row being bought, (2) checks every item actually has enough stock, (3) creates
the order and its line items, and (4) reduces stock — all four steps commit together or
none of them do. If two buyers try to buy the last unit of something at the same instant,
the row lock means the second one is made to wait, re-reads the now-updated stock, and
correctly fails instead of both succeeding and leaving stock at -1.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Order, OrderItem, OrderStatusEnum, Product, Review, User
from app.razorpay_client import create_razorpay_order, verify_payment_signature
from app.schemas import CheckoutRequest, CheckoutResponse, OrderItemLineOut, OrderOut, VerifyPaymentRequest
from app.config import settings

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(body: CheckoutRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Lock every product row involved, in a fixed order (by id), BEFORE reading any of
    # them. Locking in a consistent order across all requests is what prevents a
    # deadlock when two buyers check out overlapping carts at the same time.
    product_ids = sorted({line.product_id for line in body.items})
    products = {
        p.id: p
        for p in db.query(Product).filter(Product.id.in_(product_ids)).with_for_update().all()
    }

    total = 0.0
    order_items_to_create = []
    for line in body.items:
        product = products.get(line.product_id)
        if product is None:
            db.rollback()
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {line.product_id} not found")
        if product.stock_qty < line.quantity:
            db.rollback()
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Only {product.stock_qty} left of '{product.name}', you asked for {line.quantity}",
            )
        line_total = float(product.price) * line.quantity
        total += line_total
        order_items_to_create.append((product, line.quantity))

    # Everything below happens in the same transaction as the locks above.
    order = Order(buyer_id=user.id, status=OrderStatusEnum.pending, total_amount=total)
    db.add(order)
    db.flush()  # gets order.id without committing yet

    for product, quantity in order_items_to_create:
        db.add(OrderItem(
            order_id=order.id, product_id=product.id, seller_id=product.seller_id,
            quantity=quantity, price_at_purchase=product.price,
        ))
        product.stock_qty -= quantity  # reserved now; restored if payment is cancelled/fails

    razorpay_order = create_razorpay_order(total, receipt=f"order_{order.id}")
    order.razorpay_order_id = razorpay_order["id"]

    db.commit()  # <-- single commit: order + all order_items + all stock changes together
    db.refresh(order)

    return CheckoutResponse(
        order_id=order.id,
        razorpay_order_id=order.razorpay_order_id,
        razorpay_key_id=settings.razorpay_key_id or "mock_key",
        amount_paise=int(round(total * 100)),
    )


@router.post("/verify-payment")
def verify_payment(body: VerifyPaymentRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == body.order_id, Order.buyer_id == user.id).first()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order.status != OrderStatusEnum.pending:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Order is already {order.status.value}")

    ok = verify_payment_signature(order.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment could not be verified")

    order.status = OrderStatusEnum.paid
    order.razorpay_payment_id = body.razorpay_payment_id
    db.commit()
    return {"order_id": order.id, "status": order.status.value}


@router.post("/{order_id}/cancel")
def cancel_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Only an unpaid order can be cancelled. Restoring stock is its own atomic
    transaction — the compensating action for the one that reserved it in checkout()."""
    order = db.query(Order).filter(Order.id == order_id, Order.buyer_id == user.id).with_for_update().first()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order.status != OrderStatusEnum.pending:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot cancel an order that is already {order.status.value}")

    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
        if product:
            product.stock_qty += item.quantity

    order.status = OrderStatusEnum.cancelled
    db.commit()
    return {"order_id": order.id, "status": order.status.value}


def _to_order_out(order: Order, db: Session) -> OrderOut:
    items = [
        OrderItemLineOut(
            id=i.id,
            product_id=i.product_id,
            product_name=db.query(Product).get(i.product_id).name,
            quantity=i.quantity, price_at_purchase=float(i.price_at_purchase),
            reviewed=db.query(Review).filter(Review.order_item_id == i.id).first() is not None,
        )
        for i in order.items
    ]
    return OrderOut(
        id=order.id, status=order.status.value, total_amount=float(order.total_amount),
        created_at=order.created_at.isoformat() if order.created_at else datetime.now(timezone.utc).isoformat(),
        items=items,
    )


@router.get("/my", response_model=list[OrderOut])
def my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.buyer_id == user.id).order_by(Order.created_at.desc()).all()
    return [_to_order_out(o, db) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.buyer_id == user.id).first()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return _to_order_out(order, db)
