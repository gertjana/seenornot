const IMG = 'https://image.tmdb.org/t/p';

export const poster = (
	path: string | null | undefined,
	size: 'w92' | 'w185' | 'w342' | 'w500' = 'w342'
) => (path ? `${IMG}/${size}${path}` : null);

export const still = (path: string | null | undefined, size: 'w300' | 'w780' = 'w300') =>
	path ? `${IMG}/${size}${path}` : null;

export const backdrop = (path: string | null | undefined) => (path ? `${IMG}/w1280${path}` : null);

export const logo = (path: string | null | undefined) => (path ? `${IMG}/w92${path}` : null);

export const epCode = (season: number, episode: number) =>
	`S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

export function formatDate(date: string | null | undefined) {
	if (!date) return 'TBA';
	return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

/** "today", "tomorrow", "in 5 days", or a date. */
export function relativeDay(date: string | null | undefined) {
	if (!date) return 'TBA';
	const d = new Date(date + 'T00:00:00');
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
	if (days === 0) return 'today';
	if (days === 1) return 'tomorrow';
	if (days > 1 && days < 14) return `in ${days} days`;
	return formatDate(date);
}
