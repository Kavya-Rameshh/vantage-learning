# Vantage Learning

A free guide that matches students to scholarships, competitions, mentorship, internships and learning opportunities in five taps. It is built for students like Riya, a bright student in a small village who never hears about the opportunities that students in big cities learn about early.

## Run it

```bash
npm install
npm start
```

Open http://localhost:3000. Needs Node.js 18 or newer. Check with `node -v`. If yours is older, install the LTS version from https://nodejs.org.

## Tabs

| Tab | What it does |
| --- | --- |
| Home | The story, Riya's example path and the five opportunity types |
| Find my path | Five questions, then ranked matches with a reason on every card |
| Library | Search and filter all opportunities |
| Shortlist | Saved opportunities with a status and deadline for each |
| Account (optional) | Sign up or sign in only to keep the shortlist on every device |
| Toolkit | Document checklist and a mentor message template |
| Add an opportunity | Teachers, NGOs and students suggest a new opportunity for review |

## Backend

`server.js` is a small Express app. It serves the site and these endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/opportunities` | Curated list plus approved community suggestions |
| POST | `/api/submissions` | Suggest an opportunity. It waits for review |
| POST | `/api/feedback` | Anonymous "was this useful?" signal |
| GET | `/api/admin/submissions` | List suggestions (needs `x-admin-token`) |
| POST | `/api/admin/submissions/:id` | Body `{"decision":"approved"}` or `"rejected"` |
| GET | `/api/health` | Health check |

Optional accounts (only used to sync the shortlist):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account and sign in |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/me` | Who is signed in, and their shortlist (`{"user":null}` when signed out) |
| PUT | `/api/me/plan` | Save the shortlist, with status and deadline for each item |
| DELETE | `/api/me` | Delete the account (needs the password) |

Design choices:

- **Matching runs in the browser.** A student's income, caste and disability answers never leave their device.
- **Data lives in plain JSON files** in the `data/` folder (`users.json`, `sessions.json`, `submissions.json`, `feedback.json`). They are never served publicly. Every save writes a temporary file and then renames it, so a crash cannot leave a half-written file. The curated list is edited in `public/data/opportunities.json`.
- **Accounts are optional.** Matching, the library and the toolkit work without signing in. An account only syncs the shortlist. It stores an email, an optional first name, a salted `scrypt` hash of the password and the shortlist. It never stores the class, income, background or disability answers.
- **Safe sign-in.** Sessions live in an HttpOnly, SameSite cookie for 30 days and can be revoked on the server. Login attempts are rate limited. Cross-site writes are refused. A wrong email and a wrong password give the same message.
- **Shared computers.** Signing out, or deleting the account, clears the saved list and the answers from that device, so the next person cannot see them.
- **Sync rules.** When you sign in, the list on the device and the list in the account are combined. After that, every change is saved to the account, and the account's list is the one every device shows.
- **Basic protection.** Input validation, rate limits, a honeypot field against bots, security headers, and a constant-time admin token check.

## Data files

| File | Holds |
| --- | --- |
| `users.json` | Email, optional first name, salt, password hash and the shortlist |
| `sessions.json` | Signed-in browsers, stored as a hash of the cookie token |
| `submissions.json` | Suggestions with a status: pending, approved or rejected, plus the private contact |
| `feedback.json` | Anonymous "was this useful?" answers |

To back up, copy the `data/` folder.

## Admin

Set a token, then call the admin endpoints:

```bash
ADMIN_TOKEN=choose-a-long-secret npm start

curl http://localhost:3000/api/admin/submissions -H "x-admin-token: choose-a-long-secret"
curl -X POST http://localhost:3000/api/admin/submissions/ID \
  -H "x-admin-token: choose-a-long-secret" -H "content-type: application/json" \
  -d '{"decision":"approved"}'
```

Without `ADMIN_TOKEN` the admin endpoints stay disabled.

## Deploy

Use any host that runs Node, for example Render or Railway.

1. Push this folder to a GitHub repository.
2. Create a new Web Service from the repository.
3. Build command `npm install`, start command `npm start`. Use Node.js 18 or newer.
4. Add the environment variable `ADMIN_TOKEN`.
5. Add a persistent disk and set `DATA_DIR` to its path, otherwise the data files (suggestions and accounts) are lost when the service restarts.
6. Serve the site over HTTPS (Render does this for you), so the session cookie is marked `Secure`.

## Keeping the data honest

Amounts, dates and eligibility change every year. Check each entry against its official site before a public launch, and edit `public/data/opportunities.json` to update it.

## Ideas for next steps

- Hindi and regional languages
- A dashboard for teachers and NGOs
- State-wise scholarship listings
- Move from JSON files to a database if the site ever needs many accounts or more than one server
- Phone-number sign-in with a one-time code, which suits students without email (needs an SMS service)
- Email-based password reset (needs an email service)
