# Bangla Bazar Server

The REST API behind the Bangla Bazar store (customer site) and admin panel. It handles
products, carts, orders, payments, users, roles, coupons, reviews and in-app notifications.

---

## Tech stack and why we chose it

| Technology | What it does here | Why we chose it |
| --- | --- | --- |
| **Node.js + Express** | HTTP server and routing | Small, well known and flexible. Express middleware makes auth, validation and rate limiting easy to plug in per route. |
| **TypeScript** | Language | Catches mistakes at compile time and keeps request, model and service shapes in sync across a large codebase. |
| **MongoDB + Mongoose** | Database and models | Product data is naturally document-shaped (variants, attributes, images). Mongoose adds schemas, indexes and transactions on top. |
| **Zod** | Request validation | One schema both validates the request and gives the TypeScript type, so the two never drift apart. |
| **Redis + BullMQ** | Background jobs, OTPs, rate limits | Slow work (emails, notifications, stock alerts) runs in the background so API responses stay fast. Redis also gives shared rate limits across servers. |
| **Socket.IO** | Live notifications | Pushes new notifications to the browser instantly instead of making the client poll. |
| **JWT + bcrypt** | Login and passwords | Stateless access tokens plus a refresh-token cookie. bcrypt hashes passwords safely. |
| **SSLCommerz** | Online payments | The most widely used payment gateway in Bangladesh (cards, bKash, Nagad and more). |
| **Cloudinary** | Image storage | Hosts and resizes product images, so the server stores no files itself. |
| **Nodemailer** | Email | Order emails, OTP codes and password resets over any SMTP provider. SMS OTPs are only logged for now (no provider wired yet). |
| **Winston** | Logging | Leveled logs with daily rotating files. |
| **Helmet, CORS, express-rate-limit** | Security | Safe HTTP headers, only trusted front-ends allowed, brute-force protection on login and OTP. |
| **Docker + Nginx** | Deployment | Same image runs everywhere. Nginx sits in front as a reverse proxy. |

---

## Architecture

```
Store / Admin (browser)
        │  HTTPS (REST + Socket.IO)
        ▼
     Nginx
        ▼
 ┌─────────────────────── Express app ───────────────────────┐
 │ helmet → cors → json → cookies → rate limit               │
 │        ▼                                                  │
 │ /api/v1 router → module routes                            │
 │        ▼                                                  │
 │ checkAuth → checkPermission → validateRequest (Zod)       │
 │        ▼                                                  │
 │ controller → service → Mongoose model                     │
 │        ▼                                                  │
 │ globalErrorHandler (one error format for every route)     │
 └───────────────────────────────────────────────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
     MongoDB          Redis (BullMQ queues,     Cloudinary,
                      OTPs, rate limits)        SSLCommerz,
                            │                   Email / SMS
                            ▼
                   Workers (emails, inbox
                   notifications, alerts)
```

### Folder structure

```
src/
├── server.ts            Starts DB, workers, HTTP server and Socket.IO; graceful shutdown
├── app.ts               Express app and global middleware
├── socket.ts            Socket.IO setup (token auth, user/staff rooms)
├── redis.ts             Redis connection
├── scripts/             Seed and migration scripts
└── app/
    ├── config/          Reads environment variables in one place
    ├── routes/          Mounts every module under /api/v1
    ├── modules/         One folder per feature (see below)
    ├── middleware/      Auth, permissions, validation, rate limit, errors
    ├── constants/       Permission list for role-based access
    ├── queues/          BullMQ queues and workers
    ├── realtime/        Socket.IO emit helpers
    ├── builder/         QueryBuilder for search, filter, sort, paginate
    ├── errors/          AppError and error converters
    ├── templates/       Email templates
    └── utils/           Small helpers (email, SMS, upload, money, dates)
```

### How a module is built

Every feature in `src/app/modules/<name>/` follows the same pattern:

| File | Job |
| --- | --- |
| `*.routes.ts` | URLs plus the middleware chain (auth, permission, validation) |
| `*.validation.ts` | Zod schemas for the request body and query |
| `*.controller.ts` | Reads the request, calls the service, sends the response |
| `*.services.ts` | Business logic and database work |
| `*.model.ts` | Mongoose schema and indexes |
| `*.interface.ts` | TypeScript types |
| `*.constant.ts` | Fixed values for the module |

Modules: `address`, `attribute`, `auth`, `cart`, `category`, `contact`, `coupon`, `currency`,
`dashboard`, `notification`, `order`, `payment`, `product`, `review`, `roles`, `settings`, `users`.

---

## How it works

- **Auth.** Login returns a short-lived access token plus a refresh token in an httpOnly
  cookie. `checkAuth` checks the token on every protected route.
- **Roles and permissions.** Permissions are defined in code
  (`src/app/constants/permissions.ts`). Roles in the database group them. `checkPermission`
  guards admin routes. A superAdmin can do everything.
- **Orders.** Placing an order runs in a MongoDB transaction: stock, coupon and order are
  saved together or not at all. Prices, delivery fees and discounts are always worked out on
  the server, never trusted from the request.
- **Payments.** The order is created first, then SSLCommerz opens a payment page. An order is
  marked paid only after the server checks the payment with SSLCommerz directly. What the
  browser sends back is never trusted.
- **Background jobs.** Emails and notifications go onto BullMQ queues after the database
  write succeeds. If Redis is down, the order still goes through and only the notice is lost.
- **Notifications.** Workers save an inbox row, then push it live over Socket.IO to the user
  or to staff.
- **Errors.** Every error goes through `globalErrorHandler`, so clients always get the same
  JSON shape.

---

## Deployment

- `Dockerfile` builds a small production image (multi-stage, runs as non-root).
- `docker-compose.yml` runs the app with Redis and a `/health` health check.
- `deploy/nginx/` has the reverse proxy config.
- GitHub Actions builds the image and deploys it to the server.
