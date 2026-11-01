"""SQLAlchemy models — one class per table from SCHEMA.md."""
import enum
import uuid

from sqlalchemy import (Boolean, Column, DateTime, Enum, ForeignKey, Integer,
                         Numeric, String, Text, UniqueConstraint, func)
from sqlalchemy.orm import relationship

from app.database import Base


def short_id():
    return uuid.uuid4().hex[:16]


class RoleEnum(str, enum.Enum):
    buyer = "buyer"
    seller = "seller"
    admin = "admin"


class SellerStatusEnum(str, enum.Enum):
    none = "none"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class OrderStatusEnum(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)  # null if the user only uses Google sign-in
    google_id = Column(String, unique=True, nullable=True, index=True)
    name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.buyer)
    seller_status = Column(Enum(SellerStatusEnum), nullable=False, default=SellerStatusEnum.none)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    seller_profile = relationship("Seller", back_populates="user", uselist=False)


class Seller(Base):
    __tablename__ = "sellers"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    shop_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="seller_profile")
    products = relationship("Product", back_populates="seller")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock_qty = Column(Integer, nullable=False, default=0)
    category = Column(String, nullable=True, index=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    seller = relationship("Seller", back_populates="products")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(Enum(OrderStatusEnum), nullable=False, default=OrderStatusEnum.pending)
    total_amount = Column(Numeric(10, 2), nullable=False)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("order_item_id", name="one_review_per_purchase"),)

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False, unique=True)
    rating = Column(Integer, nullable=False)  # 1-5, checked in the API layer
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RoomDesign(Base):
    __tablename__ = "room_designs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    share_token = Column(String, unique=True, nullable=False, default=short_id, index=True)
    name = Column(String, nullable=False, default="My Room")
    budget = Column(Numeric(10, 2), nullable=True)
    layout_json = Column(Text, nullable=False)  # JSON string: positions, items, dimensions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
