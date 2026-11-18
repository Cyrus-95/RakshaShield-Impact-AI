# RakshaShield MVP

Scam awareness app with Gemini analysis, Safety Mode, a simulated Family Guardian and an Evidence Locker.

## Tech
- Frontend: plain HTML/CSS/JS in `public/` (`index.html` base prototype, `mvp.js` + `mvp.css` new features)
- Backend: Node.js + Express, `@google/genai` (Gemini), `dotenv`
- Storage: browser LocalStorage only (no database, no auth)

## Folder structure
```
server/server.js   Express API: GET /api/health, POST /api/analyse
public/index.html  Existing UI (+ Family and Locker views)
public/mvp.js      AI analysis flow, Safety Mode, family alerts, locker
public/mvp.css     Styles for the new parts
.env.example       Copy to .env
```

## Setup
1. Install Node.js 18+.
2. `npm install`
3. Get a key at https://aistudio.google.com/apikey
4. `cp .env.example .env` and set `GEMINI_API_KEY` (backend only; never in frontend code).
5. `npm start` then open http://localhost:3000 (do not open the HTML file directly; the API needs the server).

## Test it
1. Check page: paste "Someone called me claiming to be from CBI. They said my Aadhaar is linked to a criminal case. They told me not to tell my family and demanded that I transfer money for verification." and press Analyse.
2. HIGH result: Open Safety Mode, tick the checklist, press "Alert My Trusted Person", pick Rajesh, confirm.
3. Family Guardian: switch to Rajesh, open the alert, Mark as seen, Acknowledge, Mark resolved.
4. Switch back to Demo User: the status is updated.
5. Save Incident, then open Evidence Locker: add notes, change status, delete.
6. Also try: empty input, a normal bank notification, an ambiguous message, and stop the server or remove the key to see the error plus labelled demo mode.

## Simulated, not real
Family alerts are LocalStorage entries shown when you switch member. No SMS, WhatsApp, calls, bank blocking or police contact.
