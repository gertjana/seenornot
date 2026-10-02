# SeenOrNot

Keep track of which series episodes you've watched, and where they're streaming.

- **Up next**: one card per show you're watching, with a big ✓ to tick off the next episode
- **Search** (`/` or `Ctrl/⌘+K`): type to filter your library or add a show from TMDB. `Enter` adds and opens it, `Shift+Enter` only adds it
- **Show page**: tick single episodes, a whole season, or everything up to an episode (`Shift`+click or the "Up to here" button)
- **Library**: filter by status (Watching / Not started / Up to date / Completed), by streaming platform, or by name
- **Favorites**: star shows in the library or show page to pin them in a separate section at the top of the library and home screen.
- **Title sorting**: alphabetical by default in the library, ignoring a leading "The" ("The Expanse" sorts under E).
- **List view**: switch from posters to a table with platform icons and a column per season. Each clickable episode square is filled when watched, outlined when unwatched, or dashed when unaired. The view choice is remembered on this browser.
- Every action shows an **Undo** toast
- Show data (new episodes, providers) refreshes automatically in the background: daily for running shows, weekly for ended ones

Stack: SvelteKit (Svelte 5) · TypeScript · Tailwind CSS 4 · SQLite (libsql) · Drizzle ORM.

## Setup

1. Get a free TMDB API key: https://www.themoviedb.org/settings/api (either the "API Key" or the "API Read Access Token" works).
2. `cp .env.example .env` and set `TMDB_API_KEY`. Change `TMDB_REGION` (default `NL`) to choose which country's streaming providers are shown.
3. `npm install`
4. `npm run user:create -- gertjan` (prompts for a password)
5. `npm run dev`, then sign in at `/login`.

Database migrations in `./drizzle` run automatically at startup.

## Changing the schema

Edit `src/lib/server/db/schema.ts`, then run `npm run db:generate`. The new migration is applied the next time the app starts.

## Production

```sh
npm run build && node --env-file=.env build # PORT defaults to 3000
# or
docker build -t seenornot .
docker run -d -p 3000:3000 -v seenornot:/data -e TMDB_API_KEY=... -e TMDB_REGION=NL seenornot
```

## User Accounts

Each user has their own library, favorites and watched history. TMDB metadata and the configured streaming country/language remain shared. Passwords are stored as salted scrypt hashes, not plaintext. Login uses database-backed, 30-day sessions with HttpOnly/SameSite cookies; HTTPS enables Secure cookies. Logout revokes the session. Login attempts are rate-limited per username and client address within the running instance.

There is no registration or password-reset flow. Provision accounts from a trusted terminal:

```sh
# Local development (loads .env automatically)
npm run user:create -- gertjan

# Coolify: in the running application's Terminal
node scripts/create-user.mjs gertjan

# Or from the Docker host; -it is required for the hidden password prompt
docker exec -it <container-name> node scripts/create-user.mjs gertjan
```

Usernames are case-insensitive, 3-32 characters (`a-z`, digits, `_`, `.`, `-`). Passwords must be 12-256 characters. For non-interactive provisioning, the command also accepts `SEENORNOT_PASSWORD` through the environment; never commit it or configure it as a permanent application variable.

**Upgrading from single-user:** back up `/data` before deploying. The migration stages your existing library, favorites and watched timestamps, and the first account created claims them atomically. Later accounts start empty. There is no default account/password and no public setup endpoint. `APP_USER` and `APP_PASSWORD` are no longer used; remove them from Coolify. Create the first account after deployment through the terminal before signing in.

## Container CI/CD

GitHub Actions checks types and formatting, builds the image and smoke-tests startup, account provisioning, session login/logout and private API protection. On `main`, it publishes to GitHub Container Registry:

- `ghcr.io/gertjana/seenornot:latest`
- `ghcr.io/gertjana/seenornot:sha-<short-commit>` for pinned deployments and rollbacks

Pull requests run checks and container tests without publishing or deploying. Publishing uses the built-in `GITHUB_TOKEN`, so no registry secret is needed in GitHub Actions. The workflow currently builds for **linux/amd64** (ordinary Intel/AMD servers).

The runtime copies just the Node 24 binary into Alpine, alongside required runtime libraries, a clean production-only dependency installation and the compiled application. Source code, build tools, npm/yarn, caches, `.env` files and local databases are excluded. It runs as the unprivileged `node` user. CI prints Docker's reported image size (its compressed/uncompressed meaning depends on the Docker storage backend).

## Coolify

1. Create a **Docker Image** application with image `ghcr.io/gertjana/seenornot` and tag `latest` (or a `sha-...` tag).
2. For a private GHCR package, log in to GHCR on the deployment server as the server user Coolify uses: `docker login ghcr.io -u gertjana`. Use a GitHub personal access token (classic) with `read:packages`. Alternatively, make only the package public in GitHub's package settings; the repository can remain private.
3. Configure port **3000**, your HTTPS domain, and runtime variables `TMDB_API_KEY`, `TMDB_REGION=NL`, `TMDB_LANGUAGE=en-US`, and `ORIGIN=https://your-app-domain`. For a single trusted Coolify reverse proxy, also set `ADDRESS_HEADER=x-forwarded-for` and `XFF_DEPTH=1` so login limits use the actual client address rather than sharing one bucket for the proxy. Adjust depth for additional proxies (such as Cloudflare), ensure the proxy overwrites/sanitizes forwarded headers, and do not expose the container port directly to the internet. No API keys or account passwords are needed at build time.
4. Add a **persistent volume** mounted at `/data`. The default database URL is `file:/data/seenornot.db`. A bind-mounted directory must be writable by UID/GID **1000:1000**. Back up this volume; it contains your watch history.
5. Use `/health` on port 3000 for HTTP health checks. It does not require authentication and returns no application data. The image also includes a Docker health check.
6. Deploy after the first successful GitHub Actions run. Use only **one replica** with this local SQLite setup.

For automatic redeployment after publishing, copy the application's **Deploy Webhook** URL from Coolify into the GitHub repository Actions secret `COOLIFY_WEBHOOK_URL`. Add a Coolify API token as `COOLIFY_TOKEN`. The webhook must be reachable from GitHub-hosted runners. Without these secrets the workflow only publishes the image, so you can deploy manually. A successful hook call queues deployment; monitor its completion in Coolify.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is provided by JustWatch.
