# Library Management Portal

Supabase-backed library management frontend for:

- Admin login
- Manager login
- Student registration
- Unique student code from the database
- Fee status tracking
- Monthly expense entry
- Monthly income and profit display

## Files

- `index.html` contains the UI
- `styles.css` contains the styling
- `app.js` contains the frontend logic
- `supabase-config.js` contains the Supabase project URL and publishable key

## Current Supabase setup

This app is already configured to use your Supabase project through `supabase-config.js`.

Only these frontend values are used:

- project URL
- publishable key

Do not place these in frontend files:

- `sb_secret_...`
- `service_role`
- database password

## How to run

Option 1:

Open `index.html` in a browser with internet access.

Option 2:

Run a simple local server:

```powershell
cd D:\library
python -m http.server 5500
```

Then open:

`http://localhost:5500`

The page loads the Supabase JavaScript client from CDN, then connects to your Supabase project.

## Login behavior

- Admin can register students, update fee status, add expenses, and view monthly profit.
- Manager can only register students.

The app reads the role from `public.user_roles` after login.

## Database tables used

- `public.students`
- `public.fee_payments`
- `public.expenses`
- `public.user_roles`

## Month format used by the app

The frontend converts month inputs like `2026-04` into database dates like `2026-04-01`.

That matches the schema you created for:

- `fee_payments.fee_month`
- `expenses.expense_month`

## If you change projects later

Update only `supabase-config.js` with the new:

- `url`
- `publishableKey`

## Push to GitHub

This project already has a local Git repository and an initial commit.

Create a new empty repository on GitHub first, then run:

```powershell
cd D:\library
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

If GitHub asks for credentials over HTTPS, use your GitHub username and a personal access token if needed.

## Deploy to Netlify

This project already includes `netlify.toml` with:

- publish directory: `.`

In Netlify:

1. Add new project
2. Import from existing repository
3. Choose your GitHub repo
4. Keep base directory empty
5. Keep build command empty
6. Publish directory should be `.` or read automatically from `netlify.toml`
7. Deploy

No Netlify secret keys are required for this frontend.
