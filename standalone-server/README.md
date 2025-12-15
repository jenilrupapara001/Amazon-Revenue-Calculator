# FBA Backend (Standalone)

Minimal Express + MongoDB backend extracted from the main app so you can host separately (e.g., Render).

## Endpoints
- `POST /api/auth/login`
- `GET /api/fees/:type` (`referral`, `closing`, `shipping`, `storage`, `mappings`, `nodemaps`, `refund`)
- `POST /api/fees/:type` (upsert)
- `DELETE /api/fees/:type/:id`
- `DELETE /api/fees/:type/all`
- `GET /api/asins`
- `POST /api/asins/bulk`
- `PUT /api/asins/:id`
- `DELETE /api/asins/:id`
- `DELETE /api/asins`
- `GET /api/mappings` / `POST /api/mappings` / `DELETE /api/mappings/:id` / `DELETE /api/mappings/all`
- `GET /api/nodemaps` / `POST /api/nodemaps` / `DELETE /api/nodemaps/:id` / `DELETE /api/nodemaps/all`

Seeded admin user: `info@easysell.in` / `Easysell@123`

## Environment
Set these env vars:
- `MONGO_URL` (required) e.g. `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority&appName=Easysell`
- `DB_NAME` (default: `fba_calculator_pro`)
- `PORT` (Render provides)

## Run locally
```bash
cd standalone-server
npm install
MONGO_URL="<your-uri>" npm start
```

## Deploy to Render
- Create a Web Service pointing to this folder (or separate repo).
- Build command: `npm install`
- Start command: `npm start`
- Env: set `MONGO_URL`, `DB_NAME` (optional). Render sets `PORT`.
- Ensure your MongoDB IP allowlist includes Render egress (or allow 0.0.0.0/0 temporarily).

