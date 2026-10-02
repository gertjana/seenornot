import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Provider } from '../../types';
export type { Provider };

/** A TV show in the user's library. `id` is the TMDB series id. */
export const shows = sqliteTable('shows', {
	id: integer('id').primaryKey(),
	favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
	name: text('name').notNull(),
	originalName: text('original_name'),
	overview: text('overview'),
	posterPath: text('poster_path'),
	backdropPath: text('backdrop_path'),
	firstAirDate: text('first_air_date'),
	/** TMDB status: "Returning Series", "Ended", "Canceled", "In Production", ... */
	status: text('status'),
	voteAverage: real('vote_average'),
	voteCount: integer('vote_count'),
	networks: text('networks', { mode: 'json' }).$type<string[]>().notNull().default([]),
	/** Subscription ("flatrate") providers in the configured region. */
	providers: text('providers', { mode: 'json' }).$type<Provider[]>().notNull().default([]),
	/** TMDB "where to watch" page for the configured region. */
	providersLink: text('providers_link'),
	addedAt: integer('added_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	syncedAt: integer('synced_at', { mode: 'timestamp' })
});

export const seasons = sqliteTable(
	'seasons',
	{
		showId: integer('show_id')
			.notNull()
			.references(() => shows.id, { onDelete: 'cascade' }),
		seasonNumber: integer('season_number').notNull(),
		name: text('name'),
		posterPath: text('poster_path'),
		airDate: text('air_date')
	},
	(t) => [primaryKey({ columns: [t.showId, t.seasonNumber] })]
);

/** `id` is the TMDB episode id. */
export const episodes = sqliteTable(
	'episodes',
	{
		id: integer('id').primaryKey(),
		showId: integer('show_id')
			.notNull()
			.references(() => shows.id, { onDelete: 'cascade' }),
		seasonNumber: integer('season_number').notNull(),
		episodeNumber: integer('episode_number').notNull(),
		name: text('name'),
		overview: text('overview'),
		airDate: text('air_date'),
		runtime: integer('runtime'),
		stillPath: text('still_path')
	},
	(t) => [index('episodes_show_idx').on(t.showId, t.seasonNumber, t.episodeNumber)]
);

/** Presence of a row means the episode is watched. */
export const watched = sqliteTable('watched', {
	episodeId: integer('episode_id')
		.primaryKey()
		.references(() => episodes.id, { onDelete: 'cascade' }),
	watchedAt: integer('watched_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
