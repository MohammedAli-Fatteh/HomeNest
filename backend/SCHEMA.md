# HomeNest Database Schema — Phase 1

## users
- id (PK)
- email (unique)
- password_hash (nullable — null if the user only ever signs in with Google)
- google_id (nullable, unique)
- name
- role: 'buyer' | 'seller' | 'admin'
- seller_status: 'none' | 'pending' | 'approved' | 'rejected'   (only meaningful when role='seller')
- created_at

## sellers  (one row per approved seller, extra business info)
- id (PK)
- user_id (FK -> users.id, unique)
- shop_name
- description
- created_at

## products
- id (PK)
- seller_id (FK -> sellers.id)
- name
- description
- price
- stock_qty          -- this is what order placement locks and reduces
- category
- image_url
- created_at

## orders
- id (PK)
- buyer_id (FK -> users.id)
- status: 'pending' | 'paid' | 'failed' | 'cancelled'
- total_amount
- razorpay_order_id (nullable)
- razorpay_payment_id (nullable)
- created_at

## order_items  (snapshot of what was bought — price_at_purchase protects history
##               even if the seller changes the price later)
- id (PK)
- order_id (FK -> orders.id)
- product_id (FK -> products.id)
- seller_id (FK -> sellers.id)      -- duplicated here so a seller's dashboard query is a single simple lookup
- quantity
- price_at_purchase

## reviews
- id (PK)
- product_id (FK -> products.id)
- buyer_id (FK -> users.id)
- order_item_id (FK -> order_items.id, unique)   -- proves they actually bought it; one review per purchase
- rating (1-5)
- comment
- created_at

## room_designs
- id (PK)
- user_id (FK -> users.id, nullable)   -- nullable so a design can still be shared/viewed if the planner is used as a guest
- share_token (unique, random string)  -- the shareable link is /designs/<share_token>
- name
- budget
- layout_json          -- the actual room layout (positions, items, room dimensions)
- created_at

---

## Why this shape
- **order_items, not just a list on orders** — this is what makes "proper transactions" real and
  checkable: placing an order is one DB transaction that (1) reads each product's stock_qty with a
  lock, (2) fails the whole order if any item is out of stock, (3) inserts the order + order_items,
  (4) decrements stock_qty. All four steps succeed together or none do.
- **seller_id on order_items** — without this, "show a seller their orders" would need a 3-table join
  every time. With it, it's one indexed lookup — the kind of tradeoff you can explain in an interview.
- **price_at_purchase** — if a seller changes a price next week, old orders still show what the buyer
  actually paid.
- **order_item_id on reviews** — guarantees a review only exists for a real, completed purchase, and
  caps it at one review per purchase (not one per product — two if you bought it twice).
- **share_token on room_designs** — a random, unguessable string, not the numeric id, so the share link
  can't be edited by a stranger to view someone else's design.
