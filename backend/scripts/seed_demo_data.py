"""One-off script: creates a few approved demo sellers and loads real products into
your database, reusing the names/prices/images from HomeNest's old demo catalog
(data/products.json). Safe to run multiple times — it skips sellers that already exist.

Run from the backend/ folder of your HomeNest repo, with your .env already set up:
    python -m scripts.seed_demo_data
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models import Product, RoleEnum, Seller, SellerStatusEnum, User
from app.security import hash_password

# This script lives at <repo root>/backend/scripts/seed_demo_data.py, and the
# frontend's demo catalog lives at <repo root>/data/products.json — three levels up
# from this file, then into data/. Edit this line if your repo layout differs.
CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "products.json"

CATEGORY_MAP = {
    "living-room": "living-room", "bedroom": "bedroom", "kitchen": "kitchen",
    "lighting": "lighting", "curtains": "curtains", "carpets": "carpets",
}


def get_or_create_seller(db, shop_name: str) -> Seller:
    existing = db.query(Seller).filter(Seller.shop_name == shop_name).first()
    if existing:
        return existing

    email = f"{shop_name.lower().replace(' ', '')}@demo-seller.homenest.com"
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            name=shop_name, email=email, password_hash=hash_password("demo-password-123"),
            role=RoleEnum.seller, seller_status=SellerStatusEnum.approved,
        )
        db.add(user)
        db.flush()
    seller = Seller(user_id=user.id, shop_name=shop_name, description="Demo seller, seeded for testing")
    db.add(seller)
    db.flush()
    return seller


def main():
    if not CATALOG_PATH.exists():
        print(f"Could not find {CATALOG_PATH} — edit CATALOG_PATH at the top of this script.")
        return

    catalog = json.loads(CATALOG_PATH.read_text())
    db = SessionLocal()
    created, skipped = 0, 0

    for item in catalog:
        seller = get_or_create_seller(db, item.get("seller", "Demo Seller"))
        already = (
            db.query(Product)
            .filter(Product.seller_id == seller.id, Product.name == item["name"])
            .first()
        )
        if already:
            skipped += 1
            continue
        db.add(Product(
            seller_id=seller.id,
            name=item["name"],
            description=item.get("description", ""),
            price=item["price"],
            stock_qty=15,
            category=CATEGORY_MAP.get(item.get("category"), item.get("category")),
            image_url=item.get("image"),
        ))
        created += 1

    db.commit()
    db.close()
    print(f"Done. Created {created} products, skipped {skipped} already-seeded ones.")


if __name__ == "__main__":
    main()
