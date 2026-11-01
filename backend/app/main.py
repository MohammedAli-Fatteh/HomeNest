"""App entry point. Run with: uvicorn app.main:app --reload"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import admin, auth, auth_google, orders, products, reviews, room_designs, seller

Base.metadata.create_all(bind=engine)  # creates tables if they don't exist yet

app = FastAPI(title="HomeNest API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mohammedali-fatteh.github.io",  # live frontend (GitHub Pages)
        "http://127.0.0.1:5500",                 # local testing
        "http://localhost:5500",                 # local testing
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(auth_google.router)
app.include_router(seller.router)
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(reviews.router)
app.include_router(room_designs.router)


@app.get("/health")
def health():
    return {"status": "ok"}