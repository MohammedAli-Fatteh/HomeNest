"""Wraps the Razorpay SDK. If no real API keys are set (local dev/testing), this falls
back to a clearly-labeled mock so you can build and test the whole order flow without a
Razorpay account yet — swap in real test-mode keys later and nothing else changes."""
import hashlib
import hmac
import uuid

from app.config import settings

MOCK_MODE = not settings.razorpay_key_id or not settings.razorpay_key_secret


def create_razorpay_order(amount_rupees: float, receipt: str) -> dict:
    """Returns {'id': razorpay_order_id}. Amount is in rupees; Razorpay itself wants paise."""
    amount_paise = int(round(amount_rupees * 100))
    if MOCK_MODE:
        return {"id": f"order_mock_{uuid.uuid4().hex[:14]}"}

    import razorpay
    client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
    return client.order.create({"amount": amount_paise, "currency": "INR", "receipt": receipt})


def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    """Checks the payment really came from Razorpay (not someone calling our API directly
    claiming 'I paid'). Razorpay signs order_id + '|' + payment_id with our secret key using
    HMAC-SHA256; we recompute it ourselves and the two must match exactly."""
    if MOCK_MODE:
        # In mock mode there's no real Razorpay to sign anything, so the test/demo flow
        # sends back the literal string "mock_signature" to mean "pretend this succeeded".
        return razorpay_signature == "mock_signature"

    message = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
    expected = hmac.new(settings.razorpay_key_secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)
