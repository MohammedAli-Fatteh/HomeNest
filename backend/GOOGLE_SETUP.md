# Setting up real Google sign-in (not needed to keep testing with /docs)

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project (any name, e.g. "HomeNest").
3. Click "Create Credentials" -> "OAuth client ID" -> type "Web application".
4. Under "Authorized JavaScript origins" add your frontend's URL
   (e.g. http://localhost:5500 for local testing, and your real Netlify URL later).
5. Copy the "Client ID" it gives you (ends in .apps.googleusercontent.com) into
   GOOGLE_CLIENT_ID in your .env file.
6. On the frontend, add Google's sign-in button script and button div (see Google's
   "Sign In With Google" HTML/JS docs — about 10 lines of code). When a user signs in,
   Google calls your JS callback with a credential string — send that as id_token to
   POST /auth/google exactly like /auth/login, and you get back the same access_token
   + user shape.

You can finish and test everything else (signup, login, products, orders) without doing
this step — only the "Sign in with Google" button needs it.

---

# Creating the first admin account (Phase 3)

There is deliberately no signup route for admin — a student project where anyone could
sign up as admin would be a real security bug. Create the first admin directly once,
after your real database is set up:

```python
# run this once, e.g. in a one-off script or `python -c "..."`
from app.database import SessionLocal
from app.models import User, RoleEnum
from app.security import hash_password

db = SessionLocal()
admin = User(
    name="Admin",
    email="admin@homenest.com",
    password_hash=hash_password("choose-a-real-password-here"),
    role=RoleEnum.admin,
)
db.add(admin)
db.commit()
db.close()
```

Then log in as normal with POST /auth/login using that email and password.
