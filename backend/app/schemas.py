"""Pydantic request/response shapes for the auth endpoints."""
from pydantic import BaseModel, EmailStr, Field

from app.models import RoleEnum, SellerStatusEnum


class SignupRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    role: RoleEnum = RoleEnum.buyer  # a signup can request 'seller'; buyer is the safe default


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str  # the credential string Google's sign-in button returns to the frontend


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    seller_status: SellerStatusEnum

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- Seller profile + products ----

class SellerProfileRequest(BaseModel):
    shop_name: str = Field(min_length=1)
    description: str | None = None


class SellerOut(BaseModel):
    id: int
    shop_name: str
    description: str | None
    user_id: int

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    price: float = Field(gt=0)
    stock_qty: int = Field(ge=0)
    category: str | None = None
    image_url: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    stock_qty: int | None = Field(default=None, ge=0)
    category: str | None = None
    image_url: str | None = None


class ProductOut(BaseModel):
    id: int
    seller_id: int
    name: str
    description: str | None
    price: float
    stock_qty: int
    category: str | None
    image_url: str | None
    seller_name: str | None = None       # filled in for public browsing; not needed in the seller's own dashboard
    rating_avg: float | None = None      # real average from the reviews table — null until someone reviews it
    review_count: int = 0

    class Config:
        from_attributes = True


class PendingSellerOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    shop_name: str | None
    description: str | None


class SellerOrderItemOut(BaseModel):
    order_id: int
    order_status: str
    product_id: int
    product_name: str
    quantity: int
    price_at_purchase: float


# ---- Orders ----

class CartLine(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class CheckoutRequest(BaseModel):
    items: list[CartLine] = Field(min_length=1)


class CheckoutResponse(BaseModel):
    order_id: int                 # our internal order id
    razorpay_order_id: str
    razorpay_key_id: str          # the PUBLIC key id — safe to send to the frontend
    amount_paise: int
    currency: str = "INR"


class VerifyPaymentRequest(BaseModel):
    order_id: int                 # our internal order id
    razorpay_payment_id: str
    razorpay_signature: str


class OrderItemLineOut(BaseModel):
    id: int                 # order_item id — needed to leave a review tied to this purchase
    product_id: int
    product_name: str
    quantity: int
    price_at_purchase: float
    reviewed: bool          # whether this specific purchase already has a review


class OrderOut(BaseModel):
    id: int
    status: str
    total_amount: float
    created_at: str
    items: list[OrderItemLineOut]


# ---- Reviews ----

class ReviewCreate(BaseModel):
    order_item_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewOut(BaseModel):
    id: int
    buyer_name: str
    rating: int
    comment: str | None
    created_at: str


class ProductReviewsOut(BaseModel):
    average_rating: float | None   # null if there are no reviews yet
    review_count: int
    reviews: list[ReviewOut]


# ---- Room Planner ----

class SaveDesignRequest(BaseModel):
    name: str = "My Room"
    budget: float | None = Field(default=None, ge=0)
    layout_json: str   # the frontend's own JSON (room size, item positions) — backend stores it as-is


class RoomDesignOut(BaseModel):
    id: int
    share_token: str
    name: str
    budget: float | None
    layout_json: str
    created_at: str


class SuggestRequest(BaseModel):
    budget: float = Field(gt=0)
    categories: list[str] = Field(min_length=1)  # in priority order, e.g. ["sofa","table","lamp"]


class SuggestedItem(BaseModel):
    category: str
    product: ProductOut


class SuggestResponse(BaseModel):
    suggestions: list[SuggestedItem]
    unfilled_categories: list[str]   # categories we couldn't afford anything for
    total_cost: float
    budget_remaining: float
