# Reachmore backend

Real Node/Express backend for Reachmore: secure accounts, per-user projects,
admin API and Stripe billing. Serves the whole Reachmore app too, so the API and
the frontend share one origin (no CORS headaches).

## Kør lokalt

```bash
cd server
npm install
cp .env.example .env      # udfyld SESSION_SECRET (og evt. Stripe-nøgler)
npm start
```

Åbn derefter <http://localhost:4000>.

## Sikkerhed indbygget
- Adgangskoder hashes med **scrypt** (Node crypto) + salt — aldrig i klartekst.
- **Signerede, httpOnly session-cookies** (HMAC-SHA256), SameSite=Lax.
- **helmet** (CSP, X-Frame-Options m.m.), **rate-limiting** (skrappest på login/signup).
- Body-størrelse begrænset, input valideres, password-hash lækkes aldrig i API-svar.
- `.env`, `data/db.json` og `node_modules` ligger i `.gitignore` — del dem aldrig.

## Stripe (betaling)
1. Opret en gratis konto på <https://dashboard.stripe.com> og brug **Test mode**.
2. Kopiér din *Secret key* og *Publishable key* til `.env`.
3. Webhooks lokalt: installer Stripe CLI og kør
   `stripe listen --forward-to localhost:4000/api/billing/webhook`,
   og kopiér den viste `whsec_...` til `STRIPE_WEBHOOK_SECRET`.
4. Når en bruger betaler, opgraderer webhooken automatisk deres plan + tokens.

Uden Stripe-nøgler kører resten af systemet fint; kun selve betalingen er slået fra.

## API (kort)
- `POST /api/auth/signup|login|logout`, `GET /api/auth/me`
- `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`
- `POST /api/tokens/spend`
- `GET /api/billing/config`, `POST /api/billing/checkout`, `POST /api/billing/webhook`
- `GET /api/admin/stats|users|audit`, `PUT/DELETE /api/admin/users/:id`

Data gemmes i `server/data/db.json`. Første opstart seeder en admin fra `.env`
(standard: support@reachmore.dk / mivs1232).
