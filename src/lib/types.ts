export type Provider = { id: number; name: string; logo: string | null };

export type ShowCategory = 'watching' | 'not_started' | 'waiting' | 'completed';

export type EpisodeRef = {
	id: number;
	seasonNumber: number;
	episodeNumber: number;
	name: string | null;
	airDate: string | null;
	stillPath: string | null;
};

export type LibraryShow = {
	id: number;
	favorite: boolean;
	name: string;
	posterPath: string | null;
	backdropPath: string | null;
	firstAirDate: string | null;
	status: string | null;
	voteAverage: number | null;
	voteCount: number | null;
	networks: string[];
	providers: Provider[];
	addedAt: string;
	lastWatchedAt: string | null;
	/** Most recent air date among aired regular episodes, regardless of watch state. */
	lastEpisodeAirDate: string | null;
	/** Regular episodes (specials excluded). */
	total: number;
	aired: number;
	watched: number;
	watchedAired: number;
	/** First aired, unwatched episode. */
	next: EpisodeRef | null;
	/** First episode with a future air date. */
	upcoming: EpisodeRef | null;
	category: ShowCategory;
	seasons: {
		seasonNumber: number;
		episodes: { id: number; episodeNumber: number; aired: boolean; watched: boolean }[];
	}[];
};

export type SearchResult = {
	id: number;
	name: string;
	year: string | null;
	overview: string;
	posterPath: string | null;
	inLibrary: boolean;
};

export const CATEGORY_LABEL: Record<ShowCategory, string> = {
	watching: 'Watching',
	not_started: 'Not started',
	waiting: 'Up to date',
	completed: 'Completed'
};
