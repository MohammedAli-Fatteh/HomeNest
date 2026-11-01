# HomeNest

HomeNest is a furniture e-commerce platform for planning and buying furniture for your home. It has a browsable storefront, real sellers and an admin approval flow, an atomic checkout with Razorpay payment, product reviews, and a budget-aware Room Planner with shareable layouts.

## Live links
- **Frontend (GitHub Pages):** https://mohammedali-fatteh.github.io/HomeNest/
- **Backend API (Render):** https://homenest-api-60l2.onrender.com

## Tech stack

**Frontend**
- HTML5, CSS3 (vanilla, CSS variables, light and dark themes)
- Vanilla JavaScript (no framework), with a small API client in `js/api.js`

**Backend** (in `backend/`)
- Python, FastAPI, SQLAlchemy
- PostgreSQL in production (Neon), SQLite for local testing
- JWT authentication, bcrypt password hashing
- Google sign-in (token verified on the server)
- Razorpay payments with server-side signature verification

## Project structure

```
HomeNest/
├── index.html          # single-page app: all pages live here
├── css/style.css       # design system, themes, responsive layout
├── js/
│   ├── api.js          # all calls to the backend
│   ├── app.js          # routing, auth, seller and admin dashboards
│   ├── products.js     # product grid, product page, reviews
│   ├── cart.js         # cart and checkout
│   ├── planner.js      # Room Planner (drag, touch, budget suggestions, share links)
│   └── store.js, wishlist.js, sellers.js, reviews.js
├── data/products.json  # demo catalog, used to seed the database
├── backend/            # FastAPI backend (see backend/DEPLOY.md)
│   ├── app/            # routers, models, security, payments
│   ├── scripts/seed_demo_data.py
│   └── requirements.txt
└── render.yaml         # Render deployment config (rootDir: backend)
```

## Key features
- **Accounts:** email and password sign-up, Google sign-in, session restore on reload.
- **Sellers:** sign up as a seller, wait for admin approval, then add, edit and delete their own products and stock, and see orders for their products.
- **Admin:** approve or reject seller applications.
- **Checkout:** stock is locked and reduced in one database transaction, so two buyers can't both buy the last unit. Cancelling an unpaid order restores stock.
- **Reviews:** only buyers with a paid purchase can review, once per purchase. Ratings are averaged from real reviews.
- **Room Planner:** drag furniture in a room (touch supported), get budget-based product suggestions, and save a layout with a share link.

## Run locally

Frontend: from the `HomeNest` folder, run `python -m http.server 5500` and open `http://127.0.0.1:5500`.

Backend: see `backend/DEPLOY.md`. In short, create a venv in `backend/` with Python 3.12, install `requirements.txt`, set `DATABASE_URL=sqlite:///./homenest.db` in `backend/.env`, run `uvicorn app.main:app --reload`, then `python -m scripts.seed_demo_data` to load demo products.

Point the frontend at your backend by setting `window.HOMENEST_API_BASE` in `index.html`.

## Notes and limitations
- Payments run in **mock mode** until real Razorpay test keys are added. The order flow is complete, but no real payment popup opens.
- Google sign-in stays hidden until `window.HOMENEST_GOOGLE_CLIENT_ID` is set.
- The free Render service sleeps when idle, so the first request can take up to a minute.
- Stored data is in Neon, not in the browser. Cart and wishlist are still kept in the browser.