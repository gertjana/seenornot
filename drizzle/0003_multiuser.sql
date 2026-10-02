CREATE TABLE `legacy_library` (
	`show_id` integer PRIMARY KEY NOT NULL,
	`favorite` integer NOT NULL,
	`added_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `legacy_watched` (
	`episode_id` integer PRIMARY KEY NOT NULL,
	`watched_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `legacy_library` SELECT `id`, `favorite`, `added_at` FROM `shows`;
--> statement-breakpoint
INSERT INTO `legacy_watched` SELECT `episode_id`, `watched_at` FROM `watched`;
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_shows` (
	`user_id` integer NOT NULL,
	`show_id` integer NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `show_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `__new_watched` (
	`user_id` integer NOT NULL,
	`episode_id` integer NOT NULL,
	`watched_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `episode_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `watched`;--> statement-breakpoint
ALTER TABLE `__new_watched` RENAME TO `watched`;--> statement-breakpoint
ALTER TABLE `shows` DROP COLUMN `favorite`;--> statement-breakpoint
ALTER TABLE `shows` DROP COLUMN `added_at`;
