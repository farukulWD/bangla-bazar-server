
Bangla Bazar Server Documentation - Updated backend


Introduction: 

This is ready api backend for Bangla Bazar admin and frontend built with node.js, express, mongoose, and mongodb for database. 


Tech and Packages we use in this project:

    1. Node.js framework Express.js.
    2. Mongodb use for database .
    3. Mongoose for all schema validation and database connection.
    4. JsonwebToken for create jsonwebtoken.
    5. BcryptJs for password encryption.
    6. Day.js for data format.
    7. Dotenv for use environment variable.
    8. Nodemon for run on dev server.
    9. Cors and Body parser

Getting Started & Installation:

For getting started with the template you have to follow the below procedure. First navigate to the Bangla Bazar-server directory.

Step 1 : Configure your .env file:

Within the project directory you'll find a .env.example file just rename it as .env and paste your Mongo_Uri and JWT_SECRET.

Step 2 : Running the project:

    ⦁	First npm install for install all packages latest version.
    ⦁	npm run start:dev for run in development mode.
    ⦁	npm run data:import for manually import all data into your database, this will run seed.js file and all sample data in utils file will
            imported to your database.


Folder Structure & Customization:

⦁   In index.js file you will find all declared api endpoint for different route.

⦁   In seed.js file you will find all created model for manually imported into database.

⦁   /config : This folder contain auth for signInToken, isAdmin and isAuth middleware.

⦁   /models: This folder contain all model create with mongoose schema validation.

⦁   /routes: This folder contain all route like admin, category, product, coupon, user, userOrder route. 

⦁  /controller: This folder contain all different route controller function.

⦁  /utils : This folder contain admin, user, product and category sample data.



Configuration & Deployment:

We use heroku for hosting this server if you want to hosting on heroku just follow their documentation, You can also hosting this any other hosting services.

Roles & Permissions:

Permissions are declared in code (src/app/constants/permissions.ts); the grants that
reference them are rows in the roles collection. Nothing keeps the two in step on its
own, so:

    ⦁	npm run seed:superadmin — creates the first superAdmin from SUPERADMIN_NAME /
            SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD. No HTTP route can create one, and role
            writes are gated behind superAdmin, so a fresh database needs this first.
    ⦁	npm run seed:roles — creates the baseline roles (admin, catalog-manager, support).
            Existing roles are skipped; --force overwrites their permissions.
    ⦁	npm run sync:permissions — run this after adding or removing a permission. It grants
            newly declared permissions to the full-access "admin" role and prunes retired keys
            from every role (a stale key makes the next edit of that role fail validation).
            Add -- --dry-run to see the diff without writing.


Cart & Orders:

The cart and order modules live in src/app/modules/cart and src/app/modules/order and are
mounted at /api/v1/carts and /api/v1/orders.

    ⦁	Placing an order runs in a MongoDB transaction, so MONGO_URI must point at a replica
            set. Atlas is one; a standalone local mongod is not, and checkout will fail there
            with a message saying so. To run one locally:
                mongod --dbpath <your path> --replSet rs0
                mongosh --eval 'rs.initiate()'
            There is deliberately no non-transactional fallback: it could leave an order whose
            stock never moved, or stock moved for an order that was never written.
    ⦁	Coupons: POST /api/v1/orders accepts an optional couponCode. Only the code is sent —
            what it is worth is settled server-side inside the placement transaction via
            couponServices.applyCoupon, which checks the status, the start/end window and the
            minimum spend. A rejected code fails the whole placement; no order is created.
            The terms are snapshotted onto the order (code, title, discountType, discountValue)
            alongside the money in `discount`, so an invoice still explains itself after the
            coupon is edited or deleted. Codes are case-insensitive.
            POST /api/v1/coupons/apply previews a discount at checkout without placing anything.
    ⦁	A coupon is applied to the items subtotal, and the free-delivery threshold is then
            judged on the discounted amount — so a coupon cannot be stacked to cross a
            threshold it just dropped the basket below. Flip that by passing view.subtotal
            instead of view.subtotal - discount to resolveShipping in order.services.ts.
    ⦁	Delivery fees and the free-delivery threshold are constants in
            src/app/modules/order/order.constant.ts, never read from the request body.
            GET /api/v1/orders/options serves them to the client.
    ⦁	Order status moves along ORDER_STATUS_FLOW in that same file — one map that decides
            both what comes next and whether an order can still be cancelled.
    ⦁	Cancelling restores stock and decrements sales. It is idempotent: the update requires
            stockRestoredAt to be null and sets it in the same operation.
    ⦁	Confirmation emails, status notices and low-stock alerts run on the "orders" BullMQ
            queue, so they need REDIS_URL. They are all enqueued after the
            transaction commits and never block a placed order: if Redis is unreachable the
            enqueue gives up after 2s, logs, and the order still returns 201 with stock
            decremented and the cart cleared. Only the notices are lost.
    ⦁	GET /api/v1/orders/:id/invoice returns the billed record of one order as a JSON
            download, built per request and behind the same ownership check as GET /:id — the
            owner or staff with can_view_orders, nobody else.
            It is deliberately NOT uploaded anywhere. An invoice carries the customer's name,
            phone and address, and a public object-store URL for that is both enumerable
            (invoice numbers are sequential) and hard to retract, since a deleted object can
            still be served from a CDN edge for as long as it stays cached.
    ⦁	GET /api/v1/orders/export downloads a CSV. It takes the same query parameters as
            GET /api/v1/orders and splits by the same rule: staff export everything the filter
            selects, a customer exports only their own orders. Rows are streamed off a cursor,
            so memory does not grow with the export; above ORDER_EXPORT_MAX matching orders it
            refuses with a 400 rather than returning a silently truncated file.
            One row per line item. Order-level totals appear on each order's first row only,
            so a SUM over order_total counts every order once. The file opens with a BOM so
            Excel reads it as UTF-8, and any cell starting with = + - or @ is prefixed with a
            quote so a spreadsheet treats it as text rather than a formula.
            Unlike the product bulk export this is synchronous and needs no Cloudinary.


Behaviour when Redis is down:

    ⦁	The API stays up. Routes that do not touch Redis are unaffected.
    ⦁	Rate limiting falls back to an in-process memory store (see
            src/app/middleware/rateLimit.ts). The limits still apply, but per process rather
            than cluster-wide, and counts restart. The alternatives were both worse: surfacing
            the store error kills the endpoint, and express-rate-limit's `passOnStoreError`
            waives the limit outright — which on the OTP and login limiters would mean
            unlimited code guesses and unlimited SMS spend for the length of the outage.
    ⦁	After a store failure the limiter stays on memory for 30s before retrying Redis, so a
            dead server is not re-dialled on every request. It logs once per transition.
    ⦁	BullMQ reconnects forever rather than rejecting, so every enqueue and every limiter
            call is bounded by a timeout. Without those, a request would hang instead of
            degrading — which is what used to surface as an unhandledRejection and take the
            server down with it.
