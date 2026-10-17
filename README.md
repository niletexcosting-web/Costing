# Garment Costing — web app (GitHub Pages + Google Sheets)

```
index.html, css/, js/   → static front-end, hosted free on GitHub Pages
backend/Code.gs         → Google Apps Script API (login, rights, data)
Google Sheet            → the database (Users, Costings, Currencies, Fabrics, Yarns, Dyeing, Services, Knitting, Settings)
```

## 1. Database + backend (≈5 min)
1. Create a new Google Sheet (any name). **Do not share it with your users** – only the script touches it.
2. Extensions → Apps Script → delete the default code → paste all of `backend/Code.gs` → Save.
3. Select the function `setup` → Run → authorise. It creates all tabs, seeds your master data and creates the first admin: **admin / ChangeMe123!**
4. Deploy → New deployment → type **Web app** → Execute as: **Me** → Who has access: **Anyone** → Deploy. Copy the URL ending in `/exec`.
   (Anyone = the URL is reachable; every action still needs a valid login token and the right checked on the server.)

## 2. Connect the front-end
Open `js/config.js` and paste the `/exec` URL.

## 3. GitHub hosting
1. Create a repository (public is fine – no data or passwords are in the repo).
2. Upload everything in this folder (Add file → Upload files, or `git init && git add . && git commit -m init && git push`).
3. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.
4. Your app is live at `https://<your-user>.github.io/<repo>/`.

## 4. First use
Sign in as admin → you are forced to change the password → **USERS** tab → add users and tick their rights.

| Right | Allows |
|---|---|
| Create/edit own costings | Save / Save-as-new costings |
| View all costings | See other users' costings in the list |
| Edit/delete all costings | Change or delete other users' costings |
| Delete own costings | Delete their own |
| Print / PDF | Shows the Print button |
| View Master Sheet | Opens the Master Sheet page (prices) |
| Edit Master Sheet | Save changes to prices/currencies/services |

Admins have every right plus user management. Rights are checked by the server on every request, so changes apply immediately.

## Notes
- After editing `Code.gs` later: Deploy → Manage deployments → ✏️ → Version: New version → Deploy (the URL stays the same).
- Passwords are salted + hashed; sessions are signed tokens valid 12 h; 5 wrong logins lock an account for 10 min.
- Any signed-in user's browser receives master prices (needed to calculate). "View Master Sheet" and "Print" hide the screens/buttons but are not hard server limits.
- Product photos are shrunk to ~320 px so they fit in one cell. A sheet cell holds 50,000 characters.
- Apps Script handles one request at a time, so it suits a small team (dozens of users), not hundreds.
