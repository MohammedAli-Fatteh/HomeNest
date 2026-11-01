# Deploying HomeNest

HomeNest runs in three places:

- **Frontend:** GitHub Pages, served from the `HomeNest` repo root.
- **Backend:** Render, a free web service built from the `backend/` folder.
- **Database:** Neon, a free serverless Postgres database.

The backend reads its database address from an environment variable called `DATABASE_URL`. This is the only link between Render and Neon.

## Before you start

You need:
- A GitHub account with the `HomeNest` repo pushed, including `render.yaml` at the repo root and the `backend/` folder.
- A Neon account (neon.tech), signed in with GitHub.
- A Render account (dashboard.render.com), signed in with GitHub.
- Python 3.12 on your computer, for seeding the database and creating the admin account.

## Part 1: Create the database on Neon

1. Create a project. Choose the **Asia Pacific (Singapore)** region if it's available, since it's closest to India.
2. Leave only **Postgres database** turned on.
3. Click **Connect** and copy the connection string. It starts with `postgresql://` and ends with `?sslmode=require`.
4. Keep the string private. Don't commit it to GitHub.

## Part 2: Deploy the backend on Render

1. Go to dashboard.render.com and click **New +** → **Blueprint**.
2. Choose the `HomeNest` repo and click **Connect**.
3. Give the blueprint a name, such as `HomeNest`.
4. Fill in the environment values:
   - `DATABASE_URL`: paste the Neon connection string.
   - Leave `GOOGLE_CLIENT_ID`, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` empty for now.
5. Click **Deploy Blueprint** and wait until the status shows **Live**.
6. Copy the service address shown at the top of the service page. It looks like `https://homenest-api-xxxx.onrender.com`.
7. Open the address with `/health` added. You should see `{"status":"ok"}`.

`render.yaml` sets `rootDir: backend`, so Render builds the backend from that folder. It also sets `PYTHON_VERSION` to 3.12, because the pinned packages don't build on Python 3.14.

## Part 3: Load demo data and create an admin

Run these from the `backend/` folder on your computer, with the venv active. Replace the placeholders with your Neon string and your own details.

Load the demo products:

```
$env:DATABASE_URL="PASTE_NEON_STRING_HERE"
python -m scripts.seed_demo_data
```

Create the admin account:

```
python -c "from app.database import SessionLocal; from app.models import User, RoleEnum; from app.security import hash_password; db=SessionLocal(); db.add(User(name='Admin', email='YOUR_EMAIL', password_hash=hash_password('YOUR_PASSWORD'), role=RoleEnum.admin)); db.commit(); print('admin created')"
```

Use a password you don't use anywhere else.

## Part 4: Connect the frontend

In `index.html`, make sure this line points at your Render address, with no trailing slash:

```
window.HOMENEST_API_BASE = 'https://homenest-api-xxxx.onrender.com';
```

Commit and push. GitHub Pages republishes the site automatically within a few minutes.

## Part 5: Check the live site

1. Open the GitHub Pages address.
2. Sign in with the admin account. You should see the welcome message.
3. Click the 🛡️ icon. The pending sellers panel should open.

If login fails with a network error, check that the frontend origin is listed in `backend/app/main.py` under `allow_origins`.

## Notes

- **Cold starts:** the free Render service sleeps after about 15 minutes with no traffic. The first request after that can take up to a minute. Open the health link a minute before a demo.
- **Database limits:** Neon's free plan scales to zero when idle and is limited in storage. It's fine for a portfolio project.
- **Secrets:** `DATABASE_URL`, `JWT_SECRET` and the Razorpay and Google keys live only in Render's environment settings. Never put them in the repo.
- **Payments and Google sign-in:** both run in safe mode until their keys are added. Setup steps are in `backend/RAZORPAY_SETUP.md` and `backend/GOOGLE_SETUP.md`.

## Local development

Frontend: from the `HomeNest` folder, run `python -m http.server 5500` and open `http://127.0.0.1:5500`.

Backend: in `backend/`, create a venv with Python 3.12, run `pip install -r requirements.txt`, set `DATABASE_URL=sqlite:///./homenest.db` in `backend/.env`, then run `uvicorn app.main:app --reload`.