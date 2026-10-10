# bigboxguy.com

A big box. Click it. There is another box inside. Keep going.

Live at **https://bigboxguy.com** (Cloudflare Pages project `bigboxguy-com`,
also reachable at https://bigboxguy-com.pages.dev).

Plain static HTML/CSS/JS with no build step, plus one small Cloudflare Pages
Function for the worldwide counter and leaderboard. The site works fully
without the function; those two features just hide themselves.

## What's in the box

- **The loop.** Flaps fold open with a cardboard fwump and a burst of packing
  peanuts. Each box is slightly smaller than the last. After twelve you are
  squinting, then the page leans in and resets.
- **Labels.** Every box has a shipping label with a different joke and a stamp.
- **Variants.** Some boxes are taped shut (three clicks), upside down, or
  clearly too big for the box they came in.
- **Drops.** Sometimes there is something else in there. Each has a rarity
  tier and goes in your Collection:

  | Tier      | Item                 | Odds per box |
  |-----------|----------------------|--------------|
  | Common    | Packing Peanut       | 1 in 9       |
  | Common    | One Bubble of Wrap   | 1 in 14      |
  | Uncommon  | Receipt for $0.00    | 1 in 26      |
  | Uncommon  | Instruction Manual   | 1 in 34      |
  | Rare      | Cat                  | 1 in 65      |
  | Epic      | Smaller Big Box Guy  | 1 in 160     |
  | Legendary | Trout                | 1 in 500     |

- **Milestones.** Box 100 issues a downloadable "Certified Big Box Guy"
  certificate from the Association of Guys who love Box, signed by Justin Box.
  Box 1,000 runs out of boxes. Box 10,000 rolls credits. Nobody is credited.
- **Interaction gags.** Shake the mouse (or your phone) over the box and it
  rattles. Hold the click and it resists. Double-click to skip a box and get
  scolded. The browser back button re-seals the previous box.
- **Social.** Share button renders an image ("I opened N boxes and all I found
  was this box"). Worldwide counter and a Deepest Box leaderboard.
- **Touches.** Tab title shows your depth, the favicon opens as you go, the
  404 page is an empty box, and the About / Services / Pricing pages are
  very serious.

## Structure

```
index.html            The box
about.html            Corporate bio of a guy whose thing is boxes
services.html         Box Consulting, Box Storage, Enterprise Box
pricing.html          Every tier is $0. Every feature is box.
404.html              An empty box
css/style.css         Cardboard design system, box animation, modals, pages
js/app.js             The box engine: loop, variants, drops, milestones, input gags
js/audio.js           All sounds, synthesized with Web Audio (no audio files)
js/drops.js           Drop table, odds, and inline SVG art
js/draw.js            Canvas box drawing shared by the certificate and share image
js/cert.js            The certificate (canvas → PNG)
js/share.js           The share image (canvas → PNG / Web Share)
js/api.js             Client for the counter + leaderboard, fails quietly offline
functions/api/[action].js   Cloudflare Pages Function (needs KV binding BOXES)
img/                  Mascot, favicon, social preview image
```

Player state (depth, collection, certificate, name) lives in `localStorage`.

## Run locally

Any static server works:

```bash
python -m http.server 8787
```

Then open http://localhost:8787. The worldwide counter and leaderboard show
their "offline" wording because there is no API locally. To run the function
too:

```bash
npx wrangler pages dev . --kv BOXES
```

### Testing shortcuts

Append `?depth=N` to jump to a box, for example `?depth=99` to earn the
certificate on the next click, `?depth=1000` for the shortage notice, and
`?depth=10000` for the credits. The menu (☰) has a reset.

## Deploy — Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick this repo. Build settings:
   - **Framework preset:** None
   - **Build command:** _(leave empty)_
   - **Build output directory:** `/`
4. Deploy. You get a `*.pages.dev` URL immediately. The `functions/` folder is
   picked up automatically.
5. **Counter + leaderboard:** create a KV namespace (**Storage & Databases →
   KV → Create**, name it anything, e.g. `bigboxguy`). Then in the Pages
   project → **Settings → Bindings → Add → KV namespace**, variable name
   `BOXES`, pick the namespace. Redeploy (or push any commit). Until this is
   bound, `/api/*` answers `{offline:true}` and the site hides those features.
6. **Custom domain:** Pages project → **Custom domains** → add `bigboxguy.com`
   and `www.bigboxguy.com`. If the domain's DNS is on Cloudflare the records
   are created for you; otherwise point the nameservers at Cloudflare first.

## License

Do whatever you want with it. It's a box.
