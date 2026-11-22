# EstateDirect — Step-by-Step Go-Live Guide (Render Free Tier)

Launch **EstateDirect** live from your GitHub repository (`vishalmadargaon/EstateDirect`) with **₹0 cost and no credit card required**, complete with live **Zoho Mail SMTP** (Email OTP & booking alerts), **Google Analytics 4**, and **Google Search Console** indexing.

---

## Step 1 — Push the Latest Update to GitHub

1. In AI Studio, open the **GitHub** tab and push the latest changes to `vishalmadargaon/EstateDirect` (`main` branch).
2. Confirm your repository has:
   - `render.yaml` (already configured with `plan: free`, `npm install --include=dev && npm run build`, Node 20, and `/healthz`)
   - Zero committed secrets (no `firebase-applet-config.json` or `.env`).

---

## Step 2 — Deploy Free on Render (Zero Credit Card)

1. Open [render.com](https://render.com) and click **Get Started for Free** → **Continue with GitHub**.
2. Authorize Render to access your `vishalmadargaon/EstateDirect` repository.
3. From the Render dashboard, click **New +** → **Blueprint**.
4. Select **`vishalmadargaon/EstateDirect`**. Render automatically detects `render.yaml`!
5. Give the Blueprint a name (for example, `estatedirect`) and click **Apply**.
6. Wait ~2–3 minutes for the build to finish. When the status turns **Live**, Render gives you a free HTTPS URL like:
   ```text
   https://estatedirect.onrender.com
   ```
7. Open `https://estatedirect.onrender.com/api/health` in your browser to verify the live backend responds with `"status": "ok"`.

> **Note on Render Free Tier**: Free web services spin down after 15 minutes of inactivity. The first visitor after a quiet period waits ~20–30 seconds while the server wakes up; subsequent page loads are instant.

---

## Step 3 — Activate Zoho Mail SMTP (Live Email OTP & Booking Alerts)

Your Zoho Mail settings (`smtp.zoho.in`, port `465`, `estatedirect@zohomail.in`) are already pre-filled in `render.yaml`. You only need to generate and paste your Zoho **App Password**:

1. Sign in to [accounts.zoho.in](https://accounts.zoho.in) with `estatedirect@zohomail.in`.
2. Go to **Security** → **App Passwords** → click **Generate New Password**.
3. Name it `EstateDirect Render` and copy the generated password.
4. In Render, open your **`estatedirect`** service → **Environment** tab.
5. Find **`SMTP_PASS`**, paste your Zoho App Password, and click **Save Changes** (Render automatically restarts with the secret encrypted).
6. Verify it works:
   - Visit `https://estatedirect.onrender.com/api/health` → confirm `"smtpConfigured": true`.
   - Open `https://estatedirect.onrender.com/#/auth?mode=login`, enter your email, click **Send 6-Digit Email OTP**, and confirm the 6-digit code arrives in your inbox.

---

## Step 4 — Connect Free Google Analytics 4 (GA4)

1. Go to [analytics.google.com](https://analytics.google.com) → **Admin** → **Create Property** → name it **EstateDirect**.
2. Under **Data Streams**, choose **Web**, enter your Render URL (`https://estatedirect.onrender.com`), and click **Create Stream**.
3. Copy the **Measurement ID** (looks like `G-XXXXXXXXXX`).
4. In Render → **`estatedirect`** → **Environment** → set **`VITE_GA_MEASUREMENT_ID`** to `G-XXXXXXXXXX` → click **Save Changes** (Render rebuilds once so GA4 is embedded in the live bundle).
5. Open your live site in a browser tab and check **GA4 → Reports → Realtime** to see your live visitor appear within 30 seconds!

---

## Step 5 — Verify & Index in Google Search Console

1. Open [search.google.com/search-console](https://search.google.com/search-console) → **Add Property** → choose **URL prefix**.
2. Enter your exact Render URL: `https://estatedirect.onrender.com` and click **Continue**.
3. Under **Other verification methods**, open **HTML tag** and copy the `<meta name="google-site-verification" content="..." />` tag (or just the `content` token).
4. In Render → **`estatedirect`** → **Environment** → set **`GOOGLE_SITE_VERIFICATION`** to that value → click **Save Changes** and wait ~60 seconds for the redeploy to turn **Live**.
5. Return to Google Search Console and click **Verify** (instant green verification!).
6. In the left sidebar of Search Console, click **Sitemaps**, enter:
   ```text
   sitemap.xml
   ```
   and click **Submit** so Google discovers your landing page, 3D Studio, Contact page, and all Bengaluru property listings.

---

## Step 6 (Optional, Later) — Connect a Custom Domain

Whenever you are ready to attach your own domain (such as `estatedirect.gamer.free` or a `.in` / `.com` domain):

1. In Render → **`estatedirect`** → **Settings** → **Custom Domains** → click **Add Custom Domain**.
2. Copy the `CNAME` record Render shows you and add it inside your domain provider's DNS panel.
3. Click **Verify** in Render — Render provisions a **free HTTPS SSL certificate** automatically.
4. Set `APP_URL` in Render Environment to your new `https://yourdomain` URL so `/sitemap.xml` and `/robots.txt` automatically switch to your custom domain.
