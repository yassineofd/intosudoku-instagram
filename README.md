# intosudoku-instagram

Posts the [intosudoku.com](https://intosudoku.com) daily Sudoku to Instagram, automatically.
Separate from the website's repo: it only *reads* the site.

A GitHub Actions workflow ([`.github/workflows/daily-instagram.yml`](.github/workflows/daily-instagram.yml))
runs every day at 07:00 UTC and:

1. Downloads `https://intosudoku.com/assets/js/sudoku-engine.js` and generates the daily puzzle
   with the same seed as the site's `/daily-sudoku` page, so the image always matches the site.
2. Renders a 1080×1080 JPEG and force-pushes it to the `daily-images` branch of this repo.
3. Posts it through the Instagram Graph API, using the branch's
   `raw.githubusercontent.com` URL (Instagram downloads the image from a public URL, so
   **this repository must be public**; it contains no secrets, those live in Actions secrets).

Re-runs are safe: a post whose caption already contains `Daily Sudoku · <date>` is skipped.

## One-time Instagram setup

1. Convert the Instagram account to **Business or Creator** (Settings → Account type).
2. Link it to a **Facebook Page** (Page settings → Linked accounts → Instagram).
3. At <https://developers.facebook.com> create an app, add the **Instagram** product
   (Instagram API with Facebook Login) and request `instagram_basic`,
   `instagram_content_publish` and `pages_show_list`. While the app is in Development
   mode, an account with a role on the app can publish without App Review.
4. In the Graph API Explorer generate a **user token** with those permissions, then
   exchange it for a long-lived one:
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN`
5. Call `GET /me/accounts` with the long-lived token. The **Page access token** it returns
   does not expire. Use that as `IG_ACCESS_TOKEN`.
6. Call `GET /{page-id}?fields=instagram_business_account`. The `id` inside is `IG_USER_ID`.
7. In this repo: Settings → Secrets and variables → Actions → add `IG_USER_ID` and `IG_ACCESS_TOKEN`.

## Testing

- **Locally** (Node 20+): `npm install && npm run dry-run` renders `out/<date>.jpg` and prints
  the caption. Nothing is posted.
- **On GitHub**: Actions → *Daily Sudoku to Instagram* → Run workflow. Tick `dry_run`
  to render only; untick it for a real post. `date` overrides the puzzle day.

## Notes

- **Timezone.** The site seeds from each visitor's *local* date, so a day boundary differs
  per country. The poster uses `POST_TIMEZONE` (workflow env, default `UTC`); visitors
  west of UTC may see yesterday's puzzle for part of the day.
- **If the site changes** how the daily puzzle is seeded (difficulty or seed string in
  `daily.js`), update `lib/puzzle.js` to match.
- **Graph API version** defaults to `v23.0`; override with the `GRAPH_API_VERSION` env var
  when Meta retires it.
- **Links** in Instagram captions aren't clickable, so the caption says "link in bio".
  Put `intosudoku.com/daily-sudoku` in the bio.
