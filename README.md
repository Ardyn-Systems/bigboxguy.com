# bigboxguy.com

A guy who loves box. All types. All shapes and sizes. Click the box.

Live at **https://bigboxguy.com** (Cloudflare Pages project `bigboxguy-com`,
also reachable at https://bigboxguy-com.pages.dev).

Plain static HTML/CSS/JS with no build step, plus one small Cloudflare Pages
Function for the worldwide counter and the Leaderbox (leaderboard). The site works fully
without the function; those two features just hide themselves.

## What's in the box

- **The loop.** Flaps fold open with a cardboard fwump and a burst of packing
  peanuts. Open a box, there is another box. It is drawn a touch smaller
  inside the old one and grows to full size as it is lifted out; boxes do
  not shrink over time. The current label is also echoed in plain text under
  the box.
- **Labels.** Every box has a shipping label with a different joke and a stamp.
  The voice is a guy who loves box, every shape and size, and "box" is the
  double entendre you think it is. Innuendo, never explicit. Keep new copy in
  that voice.
- **Variants.** Some boxes are taped shut (three clicks), upside down, or
  clearly too big for the box they came in.
- **Drops.** Sometimes there is something else in there. Each has a rarity
  tier and goes in your Collection:

  | Tier      | Item                 | Odds per box |
  |-----------|----------------------|--------------|
  | Common    | Packing Peanut       | 1 in 9       |
  | Common    | One Bubble of Wrap   | 1 in 14      |
  | Common    | Single Sock          | 1 in 18      |
  | Uncommon  | Receipt for $0.00    | 1 in 26      |
  | Uncommon  | Instruction Manual   | 1 in 34      |
  | Uncommon  | Shipping Insurance Form | 1 in 40   |
  | Rare      | Cat                  | 1 in 65      |
  | Rare      | Love Letter to Box   | 1 in 90      |
  | Epic      | Smaller Big Box Guy  | 1 in 160     |
  | Epic      | Mimic Box            | 1 in 220     |
  | Legendary | Trout (the Trout Box) | 1 in 500    |

  The box holding the trout is the **Trout Box**: its label and stamp say so
  and the cardboard looks a little damp. **Pity timer:** after 1,000 boxes
  without a trout, the next box is guaranteed to be the Trout Box. Smaller
  pity rules keep the common drops flowing (a peanut by Box 7, never more
  than 25 boxes without something).

- **Certificates.** Issued by the Association of Guys who love Box, signed by
  Justin Box, downloadable as PNG. The wording escalates with the tier:

  | Box       | Certificate                  |
  |-----------|------------------------------|
  | 100       | Certified Big Box Guy        |
  | 500       | Distinguished Big Box Guy    |
  | 1,000     | Master Big Box Guy           |
  | 2,500     | Grand Master of Box          |
  | 10,000    | Legendary Big Box Guy        |
  | 25,000    | Box Emeritus                 |
  | 50,000    | Patron Saint of Box          |
  | 100,000   | Big Box Guy of the Century   |
  | 1,000,000 | The Box                      |

  Tiers live in `js/cert.js` (`CERT_TIERS`). Titles, names and body text
  shrink or wrap to fit, so a new tier only needs its wording. Earned
  certificates are listed in the menu (☰).
- **Milestones.** Box 1,000 runs out of boxes. Box 10,000 rolls credits.
  Nobody is credited.
- **Interaction gags.** Shake the mouse (or your phone) over the box and it
  rattles. Hold the click and it resists. Double-click to skip a box and get
  scolded. The first press of the browser Back button re-seals the current
  box (progress is kept); the second press leaves the site.
- **Daily Box.** The first box each day has a gold label and a joke chosen
  by the date, so everyone gets the same one. Opening it extends a daily
  streak.
- **Seasonal boxes.** About a third of boxes wear the season: pumpkin in
  October, gift wrap December 1–26, hearts February 7–14. Force one with
  `?season=pumpkin|gift|heart|none`.
- **Saved boxes (accounts).** In the menu (☰), a player claims their Leaderbox
  name with a password, no email. Their save goes to the box server, syncs
  every 25 boxes and when they leave, and comes back when they sign in on any
  device. A name already on the Leaderbox can only be claimed from a save at
  least that deep, and a claimed name only accepts scores from someone signed
  in as it (🔒 on the board). The browser stretches the password with PBKDF2
  (150k rounds, name as salt); the server keeps SHA-256(random salt + that).
  Saves merge forward only. 8 wrong passwords lock a name for 15 minutes.
  There is no password reset. D1 tables `saves` and `auth_fail`.
- **Resume link.** The menu (☰) has a link that carries depth, collection,
  certificates and streak to another phone or browser (`?resume=…`). Loading
  one asks before replacing existing progress.
- **Speed.** The 1× button in the header cycles 1×, 2×, 3×. Every
  animation and pause scales with it (`--spd` in CSS, `tick()` in JS). At 2×
  and 3× a tap during an open queues the next box instead of skipping.
- **Saving.** Progress is written to `localStorage` the moment a box is
  opened and again whenever the page is hidden or closed. Only one history
  entry is ever added, so leaving with Back never costs a box.
- **Leaderbox.** Two tabs: Deepest Box, and Box of the Day (most boxes
  opened today, UTC). After you submit once, your entry updates quietly every
  25 boxes. Stored in D1 tables `board` and `board_daily`.
- **Social.** Share button renders an image ("I have loved N boxes. Every
  shape. Every size."). Worldwide counter and the Leaderbox (the leaderboard, Deepest Box).
- **Touches.** The box counter sits top right in the header, the tab title
  shows your depth, the favicon opens as you go, the 404 page is an empty box, and the About / Services / Pricing pages are
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
functions/api/[action].js   Cloudflare Pages Function (D1 binding DB; KV BOXES as fallback)
_headers              Pages headers: scripts and styles revalidate on every load
                      (script/style URLs also carry a ?v= query; bump it only
                      if you ever need to force every browser past its cache)
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
certificate on the next click, `?depth=1000` for the shortage notice (and, on
a fresh profile, the Trout Box via the pity timer), and `?depth=10000` for the
credits. Add `?variant=taped`, `flip`, or `big` to force the first box's
variant. The menu (☰) has a reset.

## Deploy — Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick this repo. Build settings:
   - **Framework preset:** None
   - **Build command:** _(leave empty)_
   - **Build output directory:** `/`
4. Deploy. You get a `*.pages.dev` URL immediately. The `functions/` folder is
   picked up automatically.
5. **Counter + leaderboard:** create a D1 database (**Storage & Databases →
   D1 → Create**, name it anything, e.g. `bigboxguy`). Then in the Pages
   project → **Settings → Bindings → Add → D1 database**, variable name
   `DB`, pick the database. Do it for both Production and Preview if you want
   branch previews to have a working counter. Redeploy (or push any commit).
   The function creates its tables on first request. Until this is bound,
   `/api/*` answers `{offline:true}` and the site hides those features.

   A KV namespace bound as `BOXES` still works as a fallback (that was the
   first backend). If both are bound, the first D1 request copies the KV
   total and leaderboard across once. KV reads are cached for 60 seconds, so
   on KV a new leaderboard name can take a minute to appear; D1 is immediate.
6. **Custom domain:** Pages project → **Custom domains** → add `bigboxguy.com`
   and `www.bigboxguy.com`. If the domain's DNS is on Cloudflare the records
   are created for you; otherwise point the nameservers at Cloudflare first.

## License

Do whatever you want with it. It's a box.
