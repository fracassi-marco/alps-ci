ALTER TABLE `builds` ADD `cached_commits_last_7_days` integer;--> statement-breakpoint
ALTER TABLE `builds` ADD `cached_contributors_last_7_days` integer;--> statement-breakpoint
ALTER TABLE `builds` ADD `cached_stats_last_fetched_at` integer;