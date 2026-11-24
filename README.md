# KinvestBank website

React + Vite front end for KinvestBank. It talks to the backend in `kinvest-backend` (Node, Express, MongoDB).

## Requirements

- Node 20.19 or newer (or 22.12 or newer)
- The backend running (see its own README)

## Run it on your computer

```bash
npm install
cp .env.example .env     # then check VITE_API_URL
npm run dev
```

Open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the website with live reload |
| `npm run build` | Makes the production files in `dist/` |
| `npm run preview` | Shows the production build locally |
| `npm run lint` | Checks the code for problems |

## What it includes

- Public pages: home, business, loans (with an application form), contact and sign-up
- Sign-up confirmed by a 6-digit code emailed to the customer
- Account recovery by user ID and password
- Customer dashboard: balance, cards, transfers, top-ups, history and statistics
- Transfers confirmed with an emailed code, then the customer's password. An admin can also require a Cost of Transfer (COT) code and a Transfer Access Code (TAC) per customer
- Admin console at `/admin` for customers, balances, suspensions and transfer codes

## Settings

| Variable | Meaning |
| --- | --- |
| `VITE_API_URL` | Address of the backend, for example `http://localhost:5000` or your Render address |

Only variables that start with `VITE_` reach the browser, so never put passwords or API keys in this file.
Secrets (database, JWT, email keys) belong in the backend's `.env`.

## Putting it live (Vercel)

1. Import the repository in Vercel.
2. Add `VITE_API_URL` under Settings > Environment Variables, pointing at your Render backend.
3. Deploy. `vercel.json` makes pages such as `/signup` and `/loans` keep working when they are opened or refreshed directly.
4. On the backend, set `FRONTEND_URL` to your Vercel address so the browser is allowed to call it.

## Project layout

- `src/Pages` : one file per page, with its CSS
- `src/Components` : shared pieces and the data layer (`api.js`, `userStore.js`)
- `src/assets` : images and logo
