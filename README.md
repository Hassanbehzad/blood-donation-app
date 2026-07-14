# Blood Donation & Donor Management System

A web app for registering donors, searching donors by blood group/city,
and managing blood requests.

## Stack
- Frontend: React (single HTML file, no build step needed)
- Backend: Node.js + Express
- Database: SQLite (better-sqlite3) — no separate DB server needed

## How to run

### 1. Start the backend
```
cd backend
npm install
node server.js
```
This starts the API server at `http://localhost:5000` and creates a
`blood_donation.db` file automatically on first run.

### 2. Open the frontend
Just open `frontend/index.html` directly in your browser (double-click it,
or right-click → Open with browser). It talks to the backend at
`localhost:5000`, so the backend must be running first.

## Features
- Dashboard: live stats (total donors, available donors, pending requests,
  total donations, donors by blood group)
- Donor registration: name, blood group, phone, email, city, last donation date
- Donor search/list: filter by blood group and city, toggle availability, remove
- Blood requests: submit a request (patient, blood group, hospital, urgency),
  view all requests, mark fulfilled/cancelled

## API endpoints (backend/server.js)
- `POST /api/donors`, `GET /api/donors`, `PUT /api/donors/:id`, `DELETE /api/donors/:id`
- `POST /api/requests`, `GET /api/requests`, `PUT /api/requests/:id`, `DELETE /api/requests/:id`
- `POST /api/donations`, `GET /api/donations`
- `GET /api/stats`

## Notes for submission
- This is a single responsive web app (works on both desktop and mobile
  browsers) rather than a separate native mobile app, to fit the timeline.
- All data is stored locally in `blood_donation.db` — back this file up if
  you want to keep demo data between runs.
