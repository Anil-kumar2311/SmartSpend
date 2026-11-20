# SmartSpend AI

SmartSpend AI is a React dashboard with a Node/Express API for authenticated, user-owned finance data and privacy-conscious AI-assisted insights.

## What is implemented

- Email/password registration and login with bcrypt password hashing and an HTTP-only JWT session cookie.
- MongoDB-backed transactions and monthly budgets, scoped to the authenticated user and stored as integer paise.
- Rule-first merchant categorization, confidence values, AI category validation, and user-specific merchant corrections.
- Receipt image OCR and structured extraction. OCR suggestions are not saved until a user reviews and confirms them.
- Personal spending summaries, budget forecasts from actual transaction history, and cautious savings recommendations.
- Optional OpenAI-backed qualitative copy. When the API key is absent or the provider fails, deterministic calculations and rule-based fallbacks remain available.

## Setup

Requirements: Node.js 20.18+ and MongoDB.

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and `WEB_ORIGIN` to the frontend origin (without a path or trailing slash). Optionally set `OPENAI_API_KEY`.
3. Install packages with `npm install`.
4. Start the API with `npm run api:dev`.
5. In another terminal, run `npm run dev`.

The Vite development server proxies `/api` requests to `http://localhost:4000`. The API does not start without a MongoDB URI and strong JWT secret. OpenAI credentials are only read by the API and must never be added to frontend environment variables.

## Tests and build

- `npm test` runs deterministic tests for categorization, response schemas, OCR extraction, spending analysis, forecasting, savings recommendations, and service fallbacks.
- `npm run build` builds the web application.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/transactions`, `POST /api/transactions`, `DELETE /api/transactions/:id`
- `GET /api/budgets/:month`, `PUT /api/budgets/:month`
- `POST /api/ai/categorize`, `POST /api/ai/merchant-rules`
- `POST /api/ai/receipt-scan` (multipart field `receipt`, JPEG/PNG/WebP, 5 MB maximum)
- `GET /api/ai/insights?month=YYYY-MM`

The API derives analytics from the requesting user's database records only. AI-generated prose cannot supply financial amounts; all monetary figures are calculated by backend services. Missing budgets and insufficient history are reported as unavailable rather than filled with estimates.

## Production deployment

- Build the frontend with `npm run build` and serve `dist/` from a static host. If the API is on a different origin, set `VITE_API_BASE_URL` to its base URL when building; keep the frontend and API same-site so the `SameSite=Lax` session cookie is sent.
- For a single Node service, configure the deployment build command to run `npm ci && npm run build` and the start command as `npm start` from the repository root. The Express server serves the generated `dist/` app, including client-side routes, while keeping `/api` requests on the API. Building the frontend is required; without `dist/index.html`, the service runs as an API only.
- Configure the API's `MONGODB_URI`, `JWT_SECRET`, `WEB_ORIGIN`, and `NODE_ENV=production`, then start it with `npm run api:start`. The API refuses to start without MongoDB and a valid production frontend origin.
- Route `/api` to the API service and serve the frontend application fallback for client routes. Terminate TLS at the hosting platform or reverse proxy.
- `/api/health` is a readiness check and returns HTTP 503 when MongoDB is disconnected. API responses are marked `Cache-Control: no-store`.
- Database indexes are declared in the Mongoose models and created during API startup. The database user needs index-creation permissions; existing databases should be checked for duplicate values before applying unique indexes.

The transaction-list endpoint currently loads all transactions for the signed-in user. This preserves complete client-side filtering and dashboard totals, but very large accounts should move to server-side pagination and aggregation before scaling to high-volume use.

When `OPENAI_API_KEY` is configured, unknown merchant categorization sends the entered description and merchant name to the provider. Spending/savings narrative requests send server-calculated category aggregates, not account credentials or transaction IDs. With no key, local merchant rules and deterministic analysis remain active.
