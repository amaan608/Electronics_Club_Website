# Electronics Club · IIT Guwahati

A Next.js App Router application for the club’s public pages and member authentication. The home page, Embedded 101 artwork, and shared design system draw on the supplied 18-page poster series. The team, projects, events and announcements live in MongoDB and are managed in the admin panel at `/admin`. Photos are hosted on Cloudinary.

## Run locally

Use Node.js 22.12 or later and npm. From the project directory on Windows, run:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open the origin configured in `BETTER_AUTH_URL`. The default is `http://localhost:3000`. Use the same hostname in your browser and Google configuration. Public pages can render before credentials are configured. Restart the development server after changing environment variables.

## Configure the services

1. **MongoDB Atlas.** Create a free M0 cluster. Under Database Access, create a database user with read/write permission on the application database, including permission to create indexes. Under Network Access, allow your development IP and the production deployment’s egress addresses. Choose **Connect → Drivers**, copy the SRV connection string, URL-encode any special characters in its credentials, and include the database name before the query string. Set it as `MONGODB_URI`. The app shares a connection pool between Mongoose and Better Auth and uses transactions. A local alternative must be a replica set. [Atlas setup](https://www.mongodb.com/docs/atlas/getting-started/) · [Better Auth MongoDB adapter](https://better-auth.com/docs/adapters/mongo)
2. **Application secret and origin.** Generate 48 random bytes with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` in your own terminal. Store the result as `BETTER_AUTH_SECRET` in your local environment and secret manager. Set `BETTER_AUTH_URL` to the application origin. Use a stable HTTPS domain in production.
3. **SMTP.** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` using your existing authenticated SMTP server and an authorized sender such as `Electronics Club <club@your-domain>`. Use port 465 for implicit TLS or 587 for STARTTLS. Both email flows use the same transport. [Nodemailer SMTP settings](https://nodemailer.com/smtp)
4. **Google OAuth.** In Google Cloud Console, configure the OAuth consent screen and its audience. Add test users while the consent screen is in testing. Create an OAuth client of type **Web application**. Register the local and production origins, and add the following exact authorized redirect URIs, replacing the production host with yours. Copy its credentials into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. [Google provider setup](https://better-auth.com/docs/authentication/google)

```text
http://localhost:3000/api/auth/callback/google
https://your-club-domain.example/api/auth/callback/google
```

## Vercel

Import the repository as a Next.js project, select the project directory as the root and use Node.js 22.x. Keep the default Next.js output configuration and the `npm run build` build command. Add every variable from `.env.example` to Project Settings → Environment Variables. Set `BETTER_AUTH_URL` to the final HTTPS origin and configure the same host in Google’s OAuth client. Deploy after saving these values. Use separate credentials and a stable, registered callback domain for authenticated preview deployments. A new deployment picks up changed variables. [Vercel environment variables](https://vercel.com/docs/environment-variables) · [Next.js integration](https://better-auth.com/docs/integrations/next)

On the deployed domain, register with an inbox you control, verify its code, sign in, then recover the password and confirm that the previous session expires. Complete Google consent using an authorized test account, and confirm the return to `/account`.

## Authentication design

- A registration request stores the pending name and password hash in a short-lived challenge. Verification creates the verified user and credential record in the same transaction that consumes the code. The user then signs in.
- Six-digit codes expire after five minutes. Each keyed hash includes the purpose, normalized email and random browser binding. The codes allow five incorrect guesses, with a 60-second resend interval. MongoDB enforces atomic claims and stores request counters per email and IP across function instances. Pending registrations can request a fresh code for 30 minutes.
- OTP email delivery runs after the generic response. A registered email on the signup form and an ineligible recovery address receive the same response as an eligible request. Only an eligible address receives a code. Mail delivery failures log a generic operational message.
- Recovery verification consumes the code and issues a five-minute HTTP-only authorization cookie. The password update, grant consumption and session revocation commit together. Recovery applies to accounts with a password credential. Google-only members continue with Google.
- Better Auth handles Google OAuth, verified-email linking, password verification, and persistent database-backed sessions. Cookies are HTTP-only and secure on HTTPS. Protected pages validate the session on the server. The public auth handler exposes only the endpoints used by this app.
- Better Auth keeps identity and role in `user`, provider and password hash in `account`, and sessions in `session`. OAuth state uses the library’s state handling. This provider model can represent a member with both Google and password sign-in. The server-only Mongoose models include the OTP, rate limit, event, and event registration schemas.
- IP limits on Vercel use its platform-supplied client IP header. Local development shares one conservative IP bucket. [Vercel request headers](https://vercel.com/docs/headers/request-headers)

## Verification

```powershell
npm run typecheck
npm run build
npm run test:auth
```

The integration suite starts the production build on a temporary port with a disposable MongoDB replica set and authenticated STARTTLS mail receiver. Its first run downloads a MongoDB test binary to the ignored `.test-cache` directory. It exercises registration, OTP delivery and expiry, cooldowns, attempt limits, login, sign-out, recovery and revocation. The Google redirect, state and cancellation tests use fixture credentials. A live Google consent and callback require your client credentials.

## Event registration

Administrators create events in the admin panel under **Events**. Give each one a URL slug, a name and a summary. The other fields (description, start time, venue and capacity) are optional. An event is listed on `/events` and opens at `/events/<slug>` only after **published** is set. Members can register only while **registration status** is `open`. Set it to `closed` to stop new registrations and cancellations. Leave capacity empty for unlimited seats. Members register through a form at `/events/<slug>/register`, which requires sign-in. The form asks for college and year of study. When **team size** is above 1, it also asks for a team name and each teammate’s name and email. Members can update their details or cancel while registration is open. Embedded 101 is created automatically on the first database connection (slug `embedded-101`, teams of three, registration open). After that, the admin panel controls it, and later edits are never overwritten.

- Members must be signed in with a verified email and a mobile number. A registration copies the member's name, email and phone at the time they register.
- Seats are counted on the event. The capacity check, the seat count and the registration write commit in one transaction, so concurrent registrations can't overbook an event. Registering twice has no effect. A cancelled member can register again while seats remain.
- Registrations are read-only in the admin panel. The seat counter can't be edited there.
- Administrators download registrations as CSV from **Admin → Registrations**, an event's page, **My account**, or `/admin/export/registrations.csv`. Add `?event=<id>` to export a single event, and `&status=cancelled` or `&status=all` to change which registrations are included (the default is active ones only). The columns are member name, email, phone, event, college, year, team, teammates, registration time (UTC) and status. Cells that start with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` so spreadsheets treat them as text.

## Admin panel

The admin panel is part of the website at `/admin`, so it deploys to Vercel with everything else. Guests are sent to sign in. Signed-in members who aren't administrators get the ordinary 404 page. Every admin page and every `/api/admin/*` write checks on the server for the administrator role, a verified email and a mobile number. Writes also require a same-origin JSON request.

- **Overview:** unanswered queries, active registrations, open events and live announcements.
- **Events:** create events and edit their details, schedule (start times are entered in IST), capacity, team size, registration status and publishing. Each event page lists its registrations and has a CSV download.
- **Registrations:** filter by event and status, view college and team details, and download CSV.
- **Queries:** reply to member questions. Only the reply changes; the member's question and contact details stay as submitted.
- **Announcements:** create drafts, edit them and publish them to the home page.
- **Members:** search members, give someone administrator access, or remove it. Admins can't remove their own access.
- **Team** and **Projects:** add, edit, reorder, hide or delete entries. Photos are Cloudinary URLs (see below).

### Team, projects and Cloudinary photos

The 2026–27 heads (from the club's "Meet the Heads" post) and three starter projects are added to the database on first connection. A marker in the `seed_markers` collection stops them from being added again, so deleted entries stay deleted.

To add a photo, upload it to Cloudinary, open the asset, and copy its delivery URL, such as `https://res.cloudinary.com/<cloud>/image/upload/v1712/team/mourya.jpg`. Paste it into the member's or project's image field in the admin panel. The site adds format, quality and face-aware crop settings to the URL, so the original can be any size. Only `res.cloudinary.com` image URLs (and the bundled `/art/` images) are accepted. No Cloudinary API keys are needed. Members without a photo show their initials.

To make the first administrator, sign up on the site, then run this from the project folder (it uses `MONGODB_URI` from `.env` or `.env.local`):

```powershell
npm run make-admin -- you@example.com
```

Add `--remove` to take the role away. After that, administrators can manage roles under **Admin → Members**.
