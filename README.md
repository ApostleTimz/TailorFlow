# TailorFlow

Tailoring business management: customers, measurements, orders, payments, expenses and stock.

**Stack:** React + Tailwind CSS + Framer Motion (frontend), Node.js + Express + Sequelize (backend), PostgreSQL.

## Project structure

- `frontend/` — React + Vite UI. Application code lives in `frontend/src/`; production build is written to `frontend/dist/`.
- `backend/` — Express API, Sequelize models, migrations, routes, tests, and local uploads in `backend/uploads/`.
- Root — install/build/start scripts, `.env.example`, `Dockerfile`, and documentation.

## Run locally

1. Install Node 18+ and PostgreSQL, then create the database: `createdb tailorflow`.
2. Copy `.env.example` to `backend/.env` and set `DATABASE_URL` to your PostgreSQL connection string.
3. Run `npm run install:all`.
4. Open two terminals and run `npm run dev:backend` and `npm run dev:frontend`; open http://localhost:5173.

Tables are created automatically for the initial launch. Database changes are also recorded in `schema_migrations`; add future additive SQL migrations in `backend/src/migrations.js`. Migrations run at backend startup. Local development can set `DB_SYNC=true` for initial table creation; the default is `false` and production should keep it off so schema changes come only from reviewed migrations. Back up the database before applying production migrations.

## Email setup

Set `APP_URL` to the public app origin. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` for verification and password reset emails. Local development without SMTP prints the verification code and reset links to the backend terminal. Production fails account email requests if SMTP is not configured. Verification codes expire after 10 minutes; reset links expire after one hour.

Registration creates the business owner. Production always requires email verification before sign-in. Local development also requires verification by default; set `REQUIRE_EMAIL_VERIFICATION=false` to skip it locally. New owners receive a 6-digit code by email and must enter it before signing in; the code is printed in the backend terminal when SMTP is unset. The owner can create staff accounts from **Staff**; staff accounts belong to that owner’s business and share its scoped customer/order workspace. Set an initial password and deliver it to staff securely.

## WhatsApp order notifications

When an order is created, TailorFlow sends the customer a WhatsApp message with the garments and the agreed delivery date. If money is still owed, the remaining balance (total minus payments) is included; if the order is fully paid, the message omits the balance entirely. The message uses the Meta WhatsApp Cloud API and an approved template, so the customer must have opted in to receive WhatsApp messages and their saved phone number must include the correct country code (local numbers are prefixed with `WHATSAPP_DEFAULT_COUNTRY_CODE`).

In Meta Business Manager, create a WhatsApp Business number, get its Phone Number ID and a temporary/long-lived access token, then create and approve both templates below with the language in `WHATSAPP_TEMPLATE_LANGUAGE`:

`order_confirmation` (or `WHATSAPP_TEMPLATE_NAME`) for orders with a balance:

> Hi {{1}}, your order {{2}} is confirmed. Garments: {{3}}. Balance: {{4}}. Delivery date: {{5}}.

`order_paid_confirmation` (or `WHATSAPP_PAID_TEMPLATE_NAME`) for fully paid orders:

> Hi {{1}}, your order {{2}} is confirmed. Garments: {{3}}. Delivery date: {{4}}.

Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in `backend/.env`. Without them, development prints the message to the backend terminal; production logs that delivery is not configured. Delivery is fire-and-forget: a provider failure, missing phone number or missing credentials never blocks or rolls back the order. There is no retry queue yet, so failed messages must be resent manually.

## Measurement design images

When taking measurements, the tailor can attach up to three JPEG, PNG or WebP images (2 MB each) to that measurement version. Images are stored on disk under `UPLOAD_DIR` (default `backend/uploads`) and are only downloadable through authenticated, business-scoped routes. Saved images can be viewed or removed from the customer’s measurement history. Point `UPLOAD_DIR` at a persistent volume in production; local uploads are ignored by Git.

## Security notes

The backend validates every write with Zod regardless of frontend checks: real calendar dates, phone/WhatsApp numbers, payment and inventory amounts, passwords (including a common-password denylist and bcrypt's 72-byte limit), measurement values, and bounded date ranges for the calendar. Search terms escape SQL `LIKE` wildcards, and all queries remain scoped to the authenticated business.

Sessions use HS256 JWTs with issuer/audience claims, no hardcoded fallback secret, and a backend-side token version that is rotated on password reset. Verification and reset tokens are purpose-bound, hashed, and single-use; an unverified account gets the same sign-in error as a bad password. Failed sign-ins are rate limited per IP and email, other API routes have a separate limit, authenticated responses are `no-store`, and state-changing requests must come from the configured `APP_URL` origin. Security-relevant events are written to the audit log.

Production requires `NODE_ENV=production`, a strong random `JWT_SECRET`, an HTTPS `APP_URL`, and database TLS with certificate verification (set `DATABASE_SSL_CA` if you use a private CA). A missing or weak secret, invalid `APP_URL`, or invalid `TRUST_PROXY` stops startup. Local development generates an ephemeral secret when `JWT_SECRET` is unset, so sessions are invalidated on restart.

## Aiven PostgreSQL setup

Download the project CA certificate from the Aiven service overview and save it as `backend/certs/aiven-ca.pem`. Set `DATABASE_SSL=true` and `DATABASE_SSL_CA=certs/aiven-ca.pem`; keep `sslmode` out of `DATABASE_URL` so the Node client uses the configured CA instead of overriding it.

For a fresh database, run the backend once with `DB_SYNC=true` to create base tables, then set `DB_SYNC=false` permanently. Migrations are tracked in `schema_migrations` and run automatically on startup; reruns only apply migrations that have not been recorded.

## Deployment (single service)

`npm run install:all && npm run build && npm start` serves the API and built site from one Express process. Or use the included `Dockerfile`.

Set `NODE_ENV=production`, a random `JWT_SECRET` of at least 32 characters (see security notes), `DATABASE_URL`, an HTTPS `APP_URL`, `DB_SYNC=false`, SMTP settings, WhatsApp settings if order notifications are enabled, `DATABASE_SSL=true` with `DATABASE_SSL_CA` if needed, `UPLOAD_DIR` on a persistent volume, and `TRUST_PROXY` to the exact number of trusted proxy hops. Serve over HTTPS (login cookies are secure in production).

## Tests

Run the backend unit suite with `npm --prefix backend test`. It uses Node’s built-in test runner and needs no separate test framework.

## Features

- One owner account per business, email verification, password reset, and owner-managed staff accounts.
- Customers, search, archive/restore, and male/female measurement templates with immutable dated versions and up to three design images per version.
- Orders with multiple garments, due dates, payments, production stages, and printable receipts (browser **Print / Save PDF**), with optional WhatsApp order confirmations.
- Month calendar for order due dates, expense tracking, and inventory with reorder thresholds.
- Dashboard insights with 6- and 12-month charts for transactions, expenses, orders, and customers gained.
- Tenant-scoped records, password hashing, httpOnly cookie sessions, input validation, rate-limited auth, security headers, cross-site write blocking, and audit log.

## Before collecting customer information

The Privacy and Terms pages are included in the app. They are launch drafts: replace the operator identity and contact placeholders, confirm retention/deletion and hosting details, and have the terms checked for the jurisdictions where you operate before collecting customer details.
