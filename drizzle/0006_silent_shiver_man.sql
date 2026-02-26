CREATE TABLE `bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_type` enum('osint_tool','library_category','world_cam','github_repo','case','entity') NOT NULL,
	`item_key` varchar(512) NOT NULL,
	`label` varchar(512) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tool_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tool_name` varchar(256) NOT NULL,
	`tool_url` varchar(512) NOT NULL,
	`status` enum('online','offline','degraded','unknown') NOT NULL DEFAULT 'unknown',
	`response_time_ms` int,
	`status_code` int,
	`last_checked` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tool_health_checks_id` PRIMARY KEY(`id`)
);
