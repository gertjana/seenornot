# SeenOrNot

Keep track of which series episodes you've watched, and where they're streaming.

- **Up next**: one card per show you're watching, with a big ✓ to tick off the next episode
- **Search** (`/` or `Ctrl/⌘+K`): type to filter your library or add a show from TMDB. `Enter` adds and opens it, `Shift+Enter` only adds it
- **Show page**: tick single episodes, a whole season, or everything up to an episode (`Shift`+click or the "Up to here" button)
- **Library**: filter by status (Watching / Not started / Up to date / Completed), by streaming platform, or by name
- Every action shows an **Undo** toast
- Show data (new episodes, providers) refreshes automatically in the background: daily for running shows, weekly for ended ones

Stack: SvelteKit (Svelte 5) · TypeScript · Tailwind CSS 4 · SQLite (libsql) · Drizzle ORM.

## Setup

1. Get a free TMDB API key: https://www.themoviedb.org/settings/api (either the "API Key" or the "API Read Access Token" works).
2. `cp .env.example .env` and set `TMDB_API_KEY`. Change `TMDB_REGION` (default `NL`) to choose which country's streaming providers are shown.
3. `npm install`
4. `npm run dev`

Database migrations in `./drizzle` run automatically at startup.

## Changing the schema

Edit `src/lib/server/db/schema.ts`, then run `npm run db:generate`. The new migration is applied the next time the app starts.

## Production

```sh
npm run build && node build          # uses .env-style env vars, PORT defaults to 3000
# or
docker build -t seenornot .
docker run -d -p 3000:3000 -v seenornot:/data -e TMDB_API_KEY=... -e TMDB_REGION=NL seenornot
```

The app has no user accounts. If it can be reached from the internet, set `APP_PASSWORD` (and optionally `APP_USER`) to turn on HTTP Basic auth.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is provided by JustWatch.
