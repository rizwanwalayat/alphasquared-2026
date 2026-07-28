# Deploy

## Live

| | |
|---|---|
| **Production** | https://alphasquared-2026.netlify.app |
| Trucking page | https://alphasquared-2026.netlify.app/trucking |
| Driveaway product site | https://alphasquared-2026.netlify.app/driveaway |
| Netlify project | https://app.netlify.com/projects/alphasquared-2026 |
| Repo (private) | https://github.com/rizwanwalayat/alphasquared-2026 |

Netlify team: **Alpha Squared**. This is a **staging/preview URL** — nothing is
pointed at alphasquared.ca yet.

## Redeploy

```bash
cd "/Users/mac/Documents/Alpha Squared/Portfolio/Latest/alphasquared-2026"
netlify deploy --prod --dir=.
```

**Bump the asset version first** or returning visitors get stale CSS/JS against
new HTML:

```bash
perl -pi -e 's/\?v=[0-9a-z]+/?v=YYYYMMDDx/g' index.html trucking.html index-trucking-b.html
```

## Push

```bash
git add -A && git commit -m "..." && git push
```

The repo is **not** wired to Netlify for auto-deploy — deploys are manual CLI
pushes of the directory. To switch to git-triggered builds, link the repo in the
Netlify UI (build command empty, publish directory `.`).

## Before pointing a real domain at this

See the open-items table in `HANDOFF.md`. The blocking ones:

1. **Client logos** — most names in the marquee are not Alpha Squared clients.
   Read the warning in `HANDOFF.md` before building a logo wall.
2. **Product domain** for the Driveaway site — currently served as a path on the
   same host, which is a staging convenience, not the plan. §13 of the market
   research is explicit that it gets its own domain.
3. **Contact endpoint** — still `mailto:`.
4. **Industry statistics** on the trucking pages need re-verification against
   primary sources.
