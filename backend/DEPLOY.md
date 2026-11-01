# Deploying HomeNest — backend on Render, frontend stays on Netlify

You don't need to move your frontend. Netlify hosts static sites (HTML/CSS/JS) well,
and Render is where the Python backend actually needs to run (real SQL, background
server process — not something Netlify or Firebase does). This is the standard,
free way to deploy exactly this kind of project.

## Part 1 — Deploy the backend to Render

1. This backend lives in a `backend/` folder inside your existing HomeNest repo
   (same repo as the frontend — a "monorepo"). Push it there: your repo's root
   should end up with `index.html`, `js/`, `css/`, `data/` (the frontend, already
   there) sitting next to a new `backend/` folder (this project) AND a
   `render.yaml` file at the very root of the repo (NOT inside `backend/` — Render
   requires it at the repo root to auto-detect the Blueprint). Both are included
   in this zip, already arranged in that exact layout.
2. Make sure `backend/.env` is in `.gitignore` (already added, inside
   `backend/.gitignore`) so your real secrets never get committed — only
   `backend/.env.example` (placeholders) should be in the repo.
3. Go to https://dashboard.render.com, sign up free (GitHub login is easiest).
4. Click **New +** → **Blueprint**, pick your HomeNest repo. Render reads the
   root-level `render.yaml`, sees `rootDir: backend` on the web service, and
   builds/runs everything from inside `backend/` automatically. It sets up both:
   - A free Postgres database (`homenest-db`)
   - A free web service (`homenest-api`) running your FastAPI app
   It also auto-generates `JWT_SECRET` and wires `DATABASE_URL` to the new database
   for you — you don't type either of those in.
5. Click **Apply**. First deploy takes a few minutes. When it's done, Render gives
   you a URL like `https://homenest-api.onrender.com`.
6. **Free tier note**: a free Render web service "spins down" after 15 minutes of
   no traffic, and the next request takes ~30–50 seconds to wake it back up. This
   is fine for a portfolio project, but mention it if you're demoing live — or open
   the URL yourself a minute before your interview to "wake it up" in advance.
7. **Important free-tier limit**: Render's free Postgres database is automatically
   **deleted after 90 days**. For a resume project you revisit occasionally, set a
   reminder to either upgrade it (a few dollars/month) or re-create and reseed it
   before then — otherwise your live demo will silently stop working one day with
   no warning.

## Part 2 — Seed your live database with demo products

Run the seed script once, pointed at your REAL Render database instead of your
local test one:

1. On the Render dashboard, open your `homenest-db` → copy its **External
   Database URL** (not the internal one — internal only works from inside Render).
2. On your own computer, inside the `backend` folder of your HomeNest repo:
   ```
   DATABASE_URL="<paste the external URL here>" python -m scripts.seed_demo_data
   ```
   (On Windows PowerShell: `$env:DATABASE_URL="..."; python -m scripts.seed_demo_data`)
3. This only needs to run once — re-running later is still safe, it skips
   anything already seeded (tested).

## Part 3 — Create your real admin account

There's no signup route for admin, by design (see GOOGLE_SETUP.md for why). Same
idea as the seed script — run this once against your live `DATABASE_URL`:

```python
# save as scripts/make_admin.py temporarily, or run inline with python -c
from app.database import SessionLocal
from app.models import User, RoleEnum
from app.security import hash_password

db = SessionLocal()
db.add(User(name="Admin", email="your-real-email@example.com",
            password_hash=hash_password("choose-a-real-password"), role=RoleEnum.admin))
db.commit()
```

## Part 4 — Point your frontend at the live backend

In `index.html`, change the one line:
```html
window.HOMENEST_API_BASE = 'http://127.0.0.1:8000';
```
to your real Render URL:
```html
window.HOMENEST_API_BASE = 'https://homenest-api.onrender.com';
```
Push that change to your HomeNest frontend repo — Netlify will redeploy it
automatically if it's already connected to your GitHub repo (which yours is,
since it's already live). If you deploy from a local folder instead, just drag
the updated folder onto Netlify's dashboard again.

## Part 5 — Real Google sign-in and Razorpay (optional, do later)

Both already work in a safe "mock"/disabled mode without these. When you're
ready for the real versions: GOOGLE_SETUP.md and RAZORPAY_SETUP.md (both already
in this project) have the exact steps — then just add the real keys as
environment variables in Render's dashboard (Settings → Environment) for
`GOOGLE_CLIENT_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. No code changes
needed; the backend already reads them from the environment.

## One security note worth knowing (not blocking, just be aware)

`app/main.py` currently allows requests from ANY website (`allow_origins=["*"]`),
which is how it's been built and tested this whole time. That's fine for a student
project and totally normal to leave as-is for your interview — but if you ever ask
"why would this be wrong in a real company," the honest answer is: it means any
website on the internet could make requests to your API using a logged-in user's
browser. Fixing it later is a one-line change — swap `["*"]` for
`["https://your-real-netlify-url.netlify.app"]`. Good thing to mention
proactively in an interview if asked about security tradeoffs you knowingly made.

## Before your interview: a quick checklist
- [ ] Backend deployed, `/health` on your Render URL returns `{"status":"ok"}`
- [ ] Demo products seeded
- [ ] Admin account created
- [ ] Frontend's `HOMENEST_API_BASE` points at the live Render URL, redeployed
- [ ] Opened the live site yourself once beforehand (wakes the free-tier server up)
