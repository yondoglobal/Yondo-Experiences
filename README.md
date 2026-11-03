# Yondo Experiences

Student-first experiences site for the UAE: https://experiences.yondo.global

- **Front end:** React + Vite, static, hosted on GitHub Pages (deploys automatically on every push to `main`).
- **Back end:** Supabase project "Yondo Experiences" (catalogue, pricing engine, bookings, referral codes, passport, admin).
- **Admin:** https://experiences.yondo.global/#admin (email + password; the email must be listed in `public.admins`).
  Tabs: Bookings, Quote requests, **Pricing & offers** (margin calculator, every ticket's margin, offers with badges and dates),
  **Catalogue & photos** (Excel price updates with a change preview, Excel download, photo uploads), Referral codes
  (commission as % of profit, % of sale, AED per ticket or AED per booking), **Website** (every text, photo, FAQ and policy), Waitlist, Settings.

## What is (and isn't) in this repo
This repository is public. It contains only the website code and the database schema.
Supplier costs, the price list file and company documents are **never** committed. Prices are updated from the
admin dashboard (Catalogue & photos, then Update prices from Excel), which shows every change and then sends them straight to the database.
Photos uploaded in admin go to the public Supabase Storage bucket `media`.

## Photos
Default photos are free-licence Unsplash photos (see `src/lib/photos.js`, which records the photographer for each).
Where a photo of the actual place exists it is used; otherwise an accurate photo of the activity. The admin
Catalogue tab lists experiences still on an activity photo, so they can be replaced with the supplier's official photo.

`src/data/catalogue.json` is a fallback snapshot of **selling prices only**, used if the database is unreachable.
To refresh it from a new price list locally: `python3 tools/build_data.py path/to/pricelist.xlsx` (run from `tools/`).

## Develop
```
npm install
npm run dev          # local site
npm run build        # production build in dist/
```

## Database
`supabase/migrations` holds the initial schema and the offers/commission/content migration. Some changes (per-person +
per-vehicle pricing, Yondo rate vs standard price, tightened function grants) were applied directly to the Supabase
project; its migration history is the source of truth (`supabase db pull` gives the full current schema).

## One-time setup checklist
1. GitHub: Settings → Pages → Source: **GitHub Actions**. Custom domain: `experiences.yondo.global`, then tick **Enforce HTTPS**.
2. GoDaddy DNS for `yondo.global`: add a **CNAME** record, name `experiences`, value `<your-github-username>.github.io`.
3. Supabase → Authentication → URL Configuration: Site URL `https://experiences.yondo.global`, and add
   `https://experiences.yondo.global/**` to Redirect URLs.
4. Supabase → Authentication → Email Templates → Magic Link: include `{{ .Token }}` so customers can type the code.
5. Supabase → Authentication → SMTP: connect a real email sender (the built-in one only sends a few emails per hour).
