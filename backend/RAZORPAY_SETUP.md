# Getting real Razorpay test-mode keys (not needed to keep testing right now)

Right now the backend runs in a built-in MOCK mode (see app/razorpay_client.py) so you
can test the whole checkout flow with no Razorpay account at all. When you're ready to
show the real payment popup on the frontend:

1. Sign up free at https://dashboard.razorpay.com/signup (test mode needs no business
   verification/KYC — that's only for going live with real payments).
2. Dashboard -> Settings -> API Keys -> "Generate Test Key". You get a Key Id (starts
   with rzp_test_) and a Key Secret.
3. Put them in your .env:
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=your-secret-here
4. NEVER commit the real .env file. Check your .gitignore includes `.env` before you
   push to GitHub — the Key Secret must never be public, even in test mode.
5. On the frontend, after calling POST /orders/checkout, use the razorpay_order_id and
   razorpay_key_id it returns with Razorpay's Checkout.js (their official JS snippet —
   about 15 lines) to open the real test payment popup. Use their published test card
   number 4111 1111 1111 1111, any future expiry, any CVV — it always "succeeds" and
   moves no real money.
6. Razorpay's popup gives you back razorpay_payment_id and razorpay_signature — send
   those plus your order_id to POST /orders/verify-payment exactly like in testing.

You can demo and explain the entire order flow (including "proper transactions") to
interviewers using mock mode alone — real keys only matter for showing the actual
payment popup on screen.
