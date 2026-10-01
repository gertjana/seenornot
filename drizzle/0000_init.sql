CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY NOT NULL,
	`show_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`name` text,
	`overview` text,
	`air_date` text,
	`runtime` integer,
	`still_path` text,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `episodes_show_idx` ON `episodes` (`show_id`,`season_number`,`episode_number`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`show_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`name` text,
	`poster_path` text,
	`air_date` text,
	PRIMARY KEY(`show_id`, `season_number`),
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shows` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`original_name` text,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`first_air_date` text,
	`status` text,
	`networks` text DEFAULT '[]' NOT NULL,
	`providers` text DEFAULT '[]' NOT NULL,
	`providers_link` text,
	`added_at` integer NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE TABLE `watched` (
	`episode_id` integer PRIMARY KEY NOT NULL,
	`watched_at` integer NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
