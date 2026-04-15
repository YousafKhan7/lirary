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

Open `index.html` in a browser with internet access.

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
