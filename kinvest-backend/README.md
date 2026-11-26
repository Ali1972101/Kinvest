# Kinqora backend

Node + Express + MongoDB (Mongoose). It does on a server what `userStore.js` does in the browser, so balances, cards and passwords are no longer kept in the customer's browser.

## 1. Run it on your computer

```bash
cd kinvest-backend
npm install
cp .env.example .env      # then fill in .env
npm run dev
```

Open http://localhost:5000/health. You should see `{"ok":true,"database":true}`.

Fill in `.env`:

| Variable | What to put |
| --- | --- |
| `MONGODB_URI` | A **new** Atlas database user and your connection string. Add a database name such as `/kinvest`. |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_URL` | Your website, for example `https://kinqora.com,http://localhost:5173` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your admin console sign-in. Leave blank to switch the console off. |
| `ALLOW_DEMO_TOPUP` | `true` only while testing. It adds money without charging a card. |

## 2. Put it on Render

1. Push the folder to GitHub. `.env` is ignored by `.gitignore`, so it is not uploaded.
2. Render: **New → Blueprint** (or **Web Service**) and pick the repo. `render.yaml` sets the build and start commands and a health check.
3. In **Environment**, set `MONGODB_URI`, `FRONTEND_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. `JWT_SECRET` is generated for you.
4. In MongoDB Atlas, **Network Access**: allow Render. The simplest way is `0.0.0.0/0`, which relies on a strong database password.
5. On Vercel, set `VITE_API_URL` to your Render address and redeploy the website.

## 3. Endpoints

Send `Authorization: Bearer <token>` on everything except sign up and log in. Money is in dollars in requests and responses.

| Method and path | What it does | Replaces in `userStore.js` |
| --- | --- | --- |
| `POST /api/auth/register` | Creates the account, number and card | `registerUser` |
| `POST /api/auth/login` `{identifier, password}` | Email or User ID login | `loginUser` |
| `GET /api/me` | The signed-in customer | `useCurrentUser` |
| `PATCH /api/me` `{firstName, lastName, phone}` | Edit profile | `updateProfile` |
| `PUT /api/me/address` | Save address | `updateAddress` |
| `GET` / `PUT /api/me/extras` `{day, month, year}` | Birth date | `getProfileExtras` / `saveProfileExtras` |
| `PUT /api/me/avatar` (file upload, field name `avatar`) | Upload or replace the profile picture | `saveProfileExtras` (avatar) |
| `GET /api/me/avatar` | The picture, as an image | `getProfileExtras` (avatar) |
| `DELETE /api/me/avatar` | Remove the picture | none |
| `POST /api/me/verify-password` | The "confirm with your password" box | `verifyCurrentPassword` |
| `GET /api/me/transactions` | Their transactions, newest first | `useMyTransactions` |
| `POST /api/transfers` `{amount, name, category, reference}` | Send money | `chargeTransfer` |
| `POST /api/topups/card` `{amount}` | Add money (demo only, see below) | `creditUser` |
| `POST /api/admin/login` | Admin sign-in | `adminLogin` |
| `GET /api/admin/users` | All customers | `useUsers` |
| `POST /api/admin/users/:id/top-up` `{amount, note}` | Admin adds money | `topUpUser` |
| `POST /api/admin/users/:id/status` `{status, reason}` | Suspend or reactivate | `setUserStatus` |
| `GET /api/admin/log` | Admin activity | `useAdminLog` |

Errors come back as `{ "message": "..." }` with a matching status code, so the website can show `message` directly.

## Profile picture upload

The customer picks a file, and the website sends it as a form upload (not as JSON):

```js
// upload
const form = new FormData();
form.append("avatar", file); // "file" is the File from the <input type="file">
const res = await fetch(`${API}/api/me/avatar`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type, the browser does it
  body: form,
});
const { user } = await res.json(); // user.hasAvatar is now true

// show it (an <img> tag can't send the token, so fetch it and use an object URL)
const img = await fetch(`${API}/api/me/avatar`, { headers: { Authorization: `Bearer ${token}` } });
const url = URL.createObjectURL(await img.blob());
```

The server accepts PNG, JPG, WEBP and GIF up to 2 MB. It reads the real file type from the file's bytes, so a renamed file is refused, and SVG is not allowed. The picture is stored in MongoDB, because Render's disk is wiped on every deploy. While there is no picture, the website shows the customer's initials.

## 4. What it protects

- Passwords are hashed with bcrypt. Login is rate limited and takes the same time for a wrong User ID or a wrong password.
- Tokens expire (2 hours for customers, 1 hour for admins). A suspension applies on the next request.
- Money is stored in whole cents. A transfer checks the balance and takes the money in one database step, so two requests at once cannot spend the same money twice.
- Fees and limits are worked out on the server, never trusted from the website.
- CORS only allows your website, and the server refuses to start in production without `FRONTEND_URL` or a strong `JWT_SECRET`.

## 5. Before real customers use it

- **Card top up is switched off on purpose.** `POST /api/topups/card` only works when `ALLOW_DEMO_TOPUP=true`, and it does not charge anything. Connect a payment provider and credit accounts from its signed webhook.
- **Cards are demo cards.** The full number and CVV are stored so the app can show them. Real cards must come from a card issuer, and your database must only keep a token and the last 4 digits.
- Add email confirmation, password reset, and a second approver for large admin top ups.
- Banking is regulated. Talk to a compliance adviser before moving real money.
