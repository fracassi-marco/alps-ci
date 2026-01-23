CREATE TABLE `build_sync_status` (
	`id` text PRIMARY KEY NOT NULL,
	`build_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`last_synced_at` integer,
	`last_synced_run_id` integer,
	`last_synced_run_created_at` integer,
	`initial_backfill_completed` integer DEFAULT false NOT NULL,
	`initial_backfill_completed_at` integer,
	`total_runs_synced` integer DEFAULT 0 NOT NULL,
	`last_sync_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_build_sync_status_build_id` ON `build_sync_status` (`build_id`);--> statement-breakpoint
CREATE INDEX `idx_build_sync_status_tenant_id` ON `build_sync_status` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `test_results` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_run_id` text NOT NULL,
	`build_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`total_tests` integer NOT NULL,
	`passed_tests` integer NOT NULL,
	`failed_tests` integer NOT NULL,
	`skipped_tests` integer NOT NULL,
	`test_cases` text,
	`artifact_name` text,
	`artifact_url` text,
	`parsed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workflow_run_id`) REFERENCES `workflow_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_test_results_workflow_run_id` ON `test_results` (`workflow_run_id`);--> statement-breakpoint
CREATE INDEX `idx_test_results_build_id` ON `test_results` (`build_id`);--> statement-breakpoint
CREATE INDEX `idx_test_results_tenant_id` ON `test_results` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_test_results_build_parsed` ON `test_results` (`build_id`,`parsed_at`);--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`build_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`github_run_id` integer NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`conclusion` text,
	`html_url` text NOT NULL,
	`head_branch` text,
	`event` text,
	`duration` integer,
	`commit_sha` text NOT NULL,
	`commit_message` text,
	`commit_author` text,
	`commit_date` integer,
	`workflow_created_at` integer NOT NULL,
	`workflow_updated_at` integer NOT NULL,
	`synced_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_build_id` ON `workflow_runs` (`build_id`);--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_tenant_id` ON `workflow_runs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_status` ON `workflow_runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_workflow_created_at` ON `workflow_runs` (`workflow_created_at`);--> statement-breakpoint
CREATE INDEX `idx_workflow_runs_build_created` ON `workflow_runs` (`build_id`,`workflow_created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflow_runs_unique` ON `workflow_runs` (`build_id`,`github_run_id`);