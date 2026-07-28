# Handoff — start here

Everything a new session (or person) needs to pick this up cold.
Read this, then `README.md` for the design-system detail.

---

## What this is

A ground-up rebuild of **alphasquared.ca**, plus a separate **Driveaway Dispatch
Platform** product site. Static HTML/CSS/JS — no build step, no framework, no
package.json. You edit files and reload.

| File | Design | Ships to | Purpose |
|---|---|---|---|
| `index.html` | **A** | alphasquared.ca | Agency homepage |
| `trucking.html` | **A** | alphasquared.ca/trucking | Vertical page; Alliance case study; hands off to the product |
| `index-trucking-b.html` | **B** | *product domain (TBD)* | The Driveaway product site |

**Two deliberately different design systems.** Don't unify them.

- **Direction A** (`css/style.css`, `js/main.js`) — dark, cinematic, gradient-led.
  Modelled on [EternaCloud](https://www.eternacloud.com). GSAP + ScrollTrigger +
  Lenis + SplitType. This is the *agency* brand.
- **Direction B** (`css/operator.css`, `js/operator.js`) — light, high-contrast,
  Inter 700, tight radii, real UI over decoration. Vanilla JS, ~4KB, no libraries.
  Benchmarked against how the trucking category actually presents itself
  (Truckbase, Motive — both white, near-black ink, product screenshots). This is
  the *product* brand, aimed at a VP of Operations comparing dispatch systems.

Rationale for the split is in `README.md` and in `mission-control/notes.md`
(2026-07-28 entries).

---

## Run it

```bash
python3 -m http.server 8741 --directory "/Users/mac/Documents/Alpha Squared/Portfolio/Latest/alphasquared-2026"
```

Then open `http://localhost:8741/index.html`.

Also registered in `../.claude/launch.json` as `alphasquared-2026` for the
Claude Code preview pane.

**Always hard-refresh (Cmd+Shift+R) or add `?r=1`.** The HTML caches aggressively
and you will otherwise chase phantom bugs where your CSS edits "don't apply".

---

## Deploy

Netlify, from this directory. `netlify.toml` sets publish root, pretty URLs
(`/trucking`, `/driveaway`) and cache headers.

```bash
netlify deploy --prod
```

Git remote and Netlify site are recorded in `DEPLOY.md` once linked.

---

## Cache busting — important

Local CSS/JS are referenced with a version query, e.g.:

```html
<link rel="stylesheet" href="css/style.css?v=20260729a" />
<script src="js/main.js?v=20260729a"></script>
```

**Bump this on every deploy**, or returning visitors get stale assets against new
HTML:

```bash
perl -pi -e 's/\?v=[0-9a-z]+/?v=YYYYMMDDx/g' index.html trucking.html index-trucking-b.html
```

---

## The world map (Direction A hero)

`js/main.js` → `heroViz()`.

- Land is **Natural Earth 110m**, rasterised at build time into a 210×84 bit
  mask, packed and base64'd into the `LAND_B64` constant. ~2,940 chars. No
  runtime data dependency.
- **Never hand-edit `LAND_B64`.** A single dropped character makes it invalid
  base64; `atob` throws, which previously killed all of `init()` and left the
  site frozen on a 0% splash screen with no visible error. Regenerate it with
  the script instead (see below).
- The 17 countries and their label offsets live in the `PLACES` array. `dx`/`dy`
  are pixel offsets from the marker, `a` is the text anchor. Europe and the Gulf
  are hand-fanned outward into empty ocean because six European countries sit
  within ~65px of each other; a leader line is drawn automatically whenever a
  label is pushed far enough to need one.
- Below 760px viewport the canvas drops labels (they'd collide) and the
  continent-grouped `.geo` strip under the map takes over. That strip is
  `display:none` on desktop.

### Regenerating the land mask

```bash
python3 buildmask.py    # in the scratchpad; fetches the GeoJSON, patches main.js
```

The script asserts the base64 round-trips to exactly 2,205 bytes before writing,
so a corrupt mask can't reach `main.js`.

---

## Guards you should not remove

Both exist because of real failures, not theory:

1. **`safely()` in `js/main.js`** wraps every init step. A decorative visual that
   throws must never take down the page.
2. **Wall-clock loader fallback** — `setTimeout(finish, 2600)` in `runLoader()`.
   GSAP's ticker is rAF-driven and browsers throttle rAF hard in background tabs,
   so a page opened in a background tab would otherwise sit on the splash screen
   until the user focused it.

---

## ⚠️ Open items before this goes live

| Item | Status |
|---|---|
| **Client logos** | **Blocked — see below.** Only Alliance Driveaway's real logo is in `assets/logos/`. |
| **Product domain** | Not chosen. `index-trucking-b.html` links are relative placeholders. |
| Contact | `mailto:hello@alphasquared.ca` — swap for the real inbox or a form endpoint |
| Analytics | None installed |
| Fonts | Google Fonts CDN; self-host for zero third-party requests |
| Remaining A pages | `services.html`, `case-studies.html`, `about.html` — linked in nav, not built |

### The client-logo problem — read before building a logo wall

The marquee on `index.html` currently lists names as text under the heading
*"Work delivered for teams at"*. That wording is deliberate. **Most of those are
not Alpha Squared clients:**

- **Levi Strauss, Salesforce, Honeywell/Matrikon** — organisations Abdullah has
  *worked at or on projects for*, not AS clients.
- **Chevron, ExxonMobil, ADNOC** — *end users of FluidsData*, not AS clients.

Putting their logos on the site would imply a client relationship that doesn't
exist, against trademarks owned by companies with active legal teams. Do not do
it without written permission.

**Defensible as actual clients:** Alliance Driveaway (naming rights cleared
2026-07-28), Arcus Power, FluidsData, Century Business Solutions, WhoIFollow,
Paladin, Foodies Express.

Clearbit's logo API is discontinued (returns nothing). Real logos have to come
from each client's own site — Alliance's was pulled from their WordPress uploads
directory.

---

## Facts and where they come from

Do not invent numbers. Sources:

- `../2026-06-04-upwork-engine/knowledge_base/profile.md` — the fact sheet:
  since 2012, Edmonton; 265+ projects; **17 countries**; 52 repeat clients; 8
  startups to launch; 4.9 rating.
- `../alpha-squared/2026-07-28-trucking-transportation-market-research.md` — the
  whole trucking argument, the offer ladder, and §13 on domain strategy. The
  locked decisions are in a block at the top.
- The 17 countries (client-supplied 2026-07-28): USA, Canada · UK, Spain,
  France, Italy, Switzerland, Sweden · UAE, Saudi Arabia, Oman · China,
  Malaysia, Pakistan · South Africa, Nigeria · Australia.

Industry statistics on the trucking pages (−2.3% operating margin, $520k cargo
loss, 5–12% of CDL holders exiting) are attributed on-page to ATRI / Verisk
CargoNet / FMCSA / ATA. **Re-verify against primary sources before publishing** —
they carry the page's credibility.

---

## Brand assets

`assets/` — generated from `A2 Logo.jpeg` with the white background removed and
colour un-premultiplied so edges stay clean on dark surfaces.

| File | Use |
|---|---|
| `logo-full.png` | Colour lockup — light backgrounds (nav) |
| `logo-full-white.png` | White lockup — dark backgrounds (footers, B's top bar) |
| `logo-mark.png` / `logo-mark-white.png` | α² mark alone — favicons, tight spaces |

Exact brand colours sampled from the source: **blue `#1560BD`**, wordmark grey
`#6D6D6D`, tagline grey `#888888`.

**Known inconsistency:** Direction A's tri-gradient (`#1c4eff → #ac24ff →
#fe881b`) is inherited from the EternaCloud reference and is *not* the brand
blue. Right now `#1560BD` appears only in the logo. Defensible, but worth a
decision if the brand should assert itself harder.

---

## Where the decisions are recorded

- `mission-control/notes.md` — dated entries. This is the **source of truth**;
  Atlas ingests it (`atlas/scripts/ingest.mjs` reads `notes.md` and `tasks.json`),
  so writing there is how Atlas gets updated. Publish with
  `cd atlas && npm run publish`.
- Task **MC-2** (Finish Alpha Squared website), **MC-14** (trucking research).
