# 12. Deployment, export and licensing

Three deliverables come out of this repository:

| Deliverable | Command | What it is | Who it's for |
|---|---|---|---|
| **Clickable prototype** | `npm run export:prototype` | `dist/prototype/` (static site) and `dist/prototype.zip`. Every screen for every role, filled with fictional demo data; the sample lesson is fully interactive. Works when opened from disk or on any static host. | Sales demos, buyers, investors, user testing |
| **Release bundle** | `npm run package` | `dist/practicum-ai-skills-<version>-source.zip` (source, tests, docs, Dockerfile), plus the prototype | A customer's IT team, or a hosting partner |
| **Container image** | `docker build -t practicum .` | Production image; data in the `/data` volume | Hosting |

## Running the product

**Docker**

```bash
docker build -t practicum .
docker run -d --name practicum -p 3000:3000 -v practicum-data:/data \
  -e PUBLIC_URL=https://skills.example.edu -e COOKIE_SECURE=1 \
  -e BRAND_NAME="Your Product Name" \
  -e ANTHROPIC_API_KEY=... \
  practicum
docker exec practicum node --disable-warning=ExperimentalWarning scripts/create-institution.js "University Name" "Admin Name" admin@university.edu --platform-admin
```

Put it behind an HTTPS reverse proxy (for example Caddy or nginx) and set `COOKIE_SECURE=1`.

**Without Docker:** Node.js 22.13 or later, then `npm ci --omit=dev && npm start` (see the README for environment variables).

**Scheduled jobs** (host cron or your scheduler):

```cron
15 2 * * *  docker exec practicum node --disable-warning=ExperimentalWarning scripts/retention.js
30 2 * * *  docker exec practicum node --disable-warning=ExperimentalWarning scripts/backup.js
```

Copy `/data/backups` off the server (encrypted) after each backup, and test a restore regularly.

## Branding and reselling

- `BRAND_NAME` changes the product name everywhere in the interface, including the logo letter. The "working name" note disappears when it is set.
- Each customer institution is a separate tenant: create one with `create-institution`, and its administrator sets the approved AI provider, usage cap, retention and data rule.
- For a dedicated deployment per customer, run one container per customer with its own volume.

## What was verified in the build environment (23 September 2026)

- The release zip was unpacked into a clean folder; `npm ci` and all 66 tests passed there.
- The prototype was opened from disk in Chromium. All 2,377 internal links resolve; the sample lesson gives feedback and tracks revisions; demo sign-in and disabled-action notices work; there were no script errors. Axe-core accessibility checks pass on the overview, the sample lesson and the student, educator and administrator screens, in light and dark mode, at 1280 px and 320 px.
- **Not verified:** the Docker image. Docker Hub refused the base-image download (HTTP 429, rate limit), so the image could not be built here. Build and run it once on your own machine or CI before relying on it.

## Before you sell it

These are business and legal steps the software can't do for you:

- **Licence.** The repository root contains an MIT licence inherited from the GitHub template this project started in. If you intend to sell the platform under a proprietary licence, decide on the licence for `platform/` (and whether the root MIT licence should apply to it) with a lawyer, and add it before distributing the code.
- **Name.** "Practicum" is a working name. Check trademark availability before using it commercially, or set `BRAND_NAME`.
- **Launch blockers.** Complete the list in [10-feature-status-and-launch.md](10-feature-status-and-launch.md) before real students use it: hosting, backups, the AI provider's data terms, a data processing agreement, a security review, screen-reader testing and content review by subject educators.
- **Claims.** Keep marketing consistent with the evidence register. There are no learning results until a pilot produces them.
