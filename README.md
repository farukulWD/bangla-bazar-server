
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
    ⦁	Customers read their own orders through the /my surfaces — GET /api/v1/orders/my,
            /my/stats and /my/export. These are always scoped to the caller, so a staff member
            hitting them sees their own orders rather than the store's.
            The unprefixed GET /api/v1/orders, /stats and /export are store-wide and gated by
            can_view_orders. Scope is passed in from the route rather than inferred from the
            caller, so the routes file shows which surface serves whom; the service re-checks
            the permission anyway, so dropping a gate downgrades the answer to the caller's own
            orders instead of leaking the store.
            GET /api/v1/orders/:id and /:id/invoice stay dual — a single order is unambiguous,
            and ownership is a condition of the query. A customer asking for someone else's
            order gets 404, not 403: saying "forbidden" would confirm it exists.
    ⦁	GET /api/v1/orders/export downloads a CSV. It takes the same query parameters as
            GET /api/v1/orders and splits by the same rule: staff export everything the filter
            selects, /my/export covers a customer's own. Rows are streamed off a cursor,
            so memory does not grow with the export; above ORDER_EXPORT_MAX matching orders it
            refuses with a 400 rather than returning a silently truncated file.
            One row per line item. Order-level totals appear on each order's first row only,
            so a SUM over order_total counts every order once. The file opens with a BOM so
            Excel reads it as UTF-8, and any cell starting with = + - or @ is prefixed with a
            quote so a spreadsheet treats it as text rather than a formula.
            Unlike the product bulk export this is synchronous and needs no Cloudinary.


Payments (SSLCommerz):

The payment module lives in src/app/modules/payment and is mounted at /api/v1/payments. It
covers online payment only; cash on delivery still settles itself when an order is marked
delivered.

    ⦁	The order comes first. POST /api/v1/orders places the order exactly as it always
            did — stock reserved in the placement transaction, paymentStatus "pending" — with
            paymentMethod "sslcommerz". POST /api/v1/payments/init then opens a gateway session
            for that order and returns a GatewayPageURL to redirect the customer to.
            Init is the caller's own order or nothing: ownership is a condition of the query and
            there is no staff bypass, so nobody starts a payment on someone else's order.
    ⦁	Nothing the browser posts back is trusted. SSLCommerz redirects the customer to
            success_url with a form body saying status=VALID and an amount — an unauthenticated
            cross-site POST that anyone can forge. It is treated as nothing more than a hint
            that a val_id may now exist. The only thing that marks an order paid is our own
            outbound call to the validator API, authenticated with the store password.
            Paid needs all four: the validator says VALID or VALIDATED, and the tran_id, the
            currency and the amount all match the Payment row. VALIDATED is a success too — it
            is what the loser of the redirect/IPN race sees.
    ⦁	The amount is compared against the snapshot taken at init, never against
            store_amount. store_amount is what SSLCommerz will settle after their fee and is
            legitimately smaller than what was charged; comparing against it accepts every
            payment at a discount.
    ⦁	A validated payment whose figures disagree becomes "mismatched", not "failed". The
            order stays unpaid, the disagreeing field is logged, and a human resolves it —
            auto-failing would destroy the evidence.
    ⦁	The success redirect and the IPN run the same settle concurrently and are made safe
            by a compare-and-set, not a read-then-write: the update only matches a payment still
            in "initiated" or "pending", so the loser changes nothing and reports the state the
            winner left. The same guard is why a late cancel or fail callback cannot downgrade a
            payment that already settled as paid. tran_id carries a unique index, and val_id a
            unique partial one, so one gateway transaction can never settle two rows.
    ⦁	tran_id is random, never the invoice number. Invoices are sequential and printed on
            customer-facing pages, and the callback routes cannot be authenticated, so the id
            itself has to be the unguessable part.
    ⦁	SSL_IPN_ALLOWED_IPS restricts the IPN endpoint to the addresses in the merchant
            panel, and fails closed when empty. It is defence in depth only — the source IP is
            read from X-Forwarded-For and is therefore spoofable. SSL_IPN_ALLOW_ANY_IP=true
            waives it for tunnelled local development and must be false in production; the
            server logs a warning if it is not. Rejections log the offending address so it can
            be pasted straight into the env.
    ⦁	SERVER_PUBLIC_URL is where the gateway reaches us, so it must be publicly resolvable
            — in development a tunnel (cloudflared tunnel --url http://localhost:5055). config
            reads process.env once at import, so changing it needs a server restart.
    ⦁	Every attempt is its own Payment row; there is deliberately no unique index on the
            order. A customer who cancels at the gateway keeps an order that is still
            paymentStatus "pending" and can simply pay again, and only the attempt is marked
            cancelled — which also stops a back-button press ringing "your payment failed".
            paymentStatus "failed" stays a deliberate staff action through
            PATCH /api/v1/orders/:id/payment.
    ⦁	If the money is collected but the order refuses the transition — already paid by
            another attempt, or cancelled underneath us — the payment is flagged duplicate:true
            and logged rather than rolled back. That is a possible double collection and needs a
            person, probably a refund.
    ⦁	Known gap: an abandoned payment holds stock. placeOrder decrements stock whatever the
            payment method, so a customer who opens a gateway page and never pays leaves a
            pending order sitting on that stock, and nothing reclaims it. Triage it with
            GET /api/v1/payments?status=pending&to=<yesterday> and cancel through
            POST /api/v1/orders/:id/cancel, which restores stock correctly. The "expired" state
            and PAYMENT_EXPIRE_AFTER_MINUTES exist so a sweeper can be added additively; it was
            left out because the timeout is a product decision (a bKash OTP round-trip is
            genuinely minutes) and because cancelOrder needs a caller to attribute the change
            to, which a scheduled job does not have.
    ⦁	Admin surfaces — GET /api/v1/payments and /:id — are gated by can_view_orders rather
            than a permission of their own. A payment is a facet of an order, and anyone who can
            already read every order's payment status gains nothing from the tran_id behind it.
            A PermissionModule.Payment belongs with gateway-initiated refunds, which are a
            genuinely new capability and are not implemented. Customers read their own through
            GET /api/v1/payments/my and /my/:orderId, which return a narrower view: no tran_id,
            no gateway identifiers, and never the session key.
    ⦁	Refunds are not automated. Marking an order refunded is still
            PATCH /api/v1/orders/:id/payment; the money is moved in the SSLCommerz panel.


Notifications:

The notification module lives in src/app/modules/notification and is mounted at
/api/v1/notifications. It is an in-app inbox only — no email, no SMS, no device push.
Order mail is a separate concern and still goes out from src/app/queues/orders.worker.ts.

    ⦁	A producer never writes a row. It calls notify() from
            notification.emit.ts, which enqueues onto the `inbox` queue; the worker resolves
            recipients, renders the copy and writes. notify() returns void, never throws and is
            never awaited, so a dead Redis cannot fail a checkout. Call it *after* the
            transaction commits, or a rolled-back write still rings the bell.
    ⦁	What each event says lives in one place, notification.catalog.ts: the recipient,
            the copy per audience, the client link, and the dedupe key. TNotifyInput is a
            discriminated union with one member per event, so a call site that drifts from its
            renderer is a compile error rather than a blank notification. A render that returns
            null means that case needs no bell — order.status does this for `pending`.
    ⦁	Audiences are `customer` and `staff`, and one account can hold both: a staff member
            who places an order is the customer of that order and a staff recipient of it.
            Every read is scoped by ?audience=, defaulting to the one matching the account
            type, so the badge and the list can never disagree.
    ⦁	Staff are addressed by permission, not by name — the recipient list is whoever
            currently holds it (order events use can_view_orders, low stock can_view_products,
            coupon expiry can_view_coupons). Whoever performed the action is filtered out of
            their own staff fan-out. There is deliberately no `notification` permission module:
            a notification is owned, so the routes take checkAuth alone and ownership is a
            condition of every query.
    ⦁	Delivery is idempotent. Every row carries a dedupeKey behind a unique
            {user, audience, dedupeKey} index, so a BullMQ retry writes the same key twice and
            the second insert is refused instead of ringing again. `audience` is part of that
            key for the dual-role case above.
    ⦁	Rows expire 90 days after they are written (a TTL index on createdAt). There is
            deliberately no delete endpoint — that TTL is the whole cleanup story.
    ⦁	Live delivery is Socket.IO, initialised in src/socket.ts against the same http
            server. The handshake takes an access token in socket.handshake.auth.token, not a
            cookie: the refresh cookie is scoped to /api/v1/auth and is never sent to
            /socket.io/. It shares its verifier with checkAuth (auth.verify.ts), so a deleted,
            deactivated or stale-token account cannot open a socket either. Clients join
            user:<id>, and staff also join `staff`. The event is `notification:new` and carries
            the same view the REST list returns. The check runs once, at connect — a password
            change does not close an already-open socket.
    ⦁	Live delivery is best effort on top of a row that is already committed. With no
            socket server the notification still persists; only the ping is lost. There is no
            Redis adapter yet, so a second server instance would not see the first one's
            publishes — add @socket.io/redis-adapter before scaling out.
    ⦁	The coupon-expiry warning is a BullMQ scheduler on the same queue, upserted on every
            boot (COUPON_EXPIRY_SWEEP_CRON, daily at 03:00). It warns about coupons that are
            visible, not deleted and within COUPON_EXPIRY_WARNING_DAYS of endTime. Re-running
            it is free: the dedupe key carries the expiry date, so a coupon rings once per
            expiry rather than once per sweep.


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
    ⦁	Notifications stop being written and no bell rings, but nothing that produces one
            fails: notify() is bounded and its failure is logged, not raised. The work is lost
            rather than retried — the inbox is a convenience on top of state that is already
            committed and readable over REST.
    ⦁	BullMQ reconnects forever rather than rejecting, so every enqueue and every limiter
            call is bounded by a timeout. Without those, a request would hang instead of
            degrading — which is what used to surface as an unhandledRejection and take the
            server down with it.
