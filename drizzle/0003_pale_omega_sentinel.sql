CREATE TABLE `collector_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collector_id` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`collector_type` enum('social_public','web_crawler','rss_api','infra_metadata','transform_orchestrator','public_stream','imagery_tiles','infra_feeds','dataset') NOT NULL,
	`config` json,
	`enabled` boolean NOT NULL DEFAULT true,
	`last_run` timestamp,
	`last_status` enum('success','partial','failed','pending') NOT NULL DEFAULT 'pending',
	`records_collected` int DEFAULT 0,
	`error_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collector_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `collector_configs_collector_id_unique` UNIQUE(`collector_id`)
);
--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int,
	`entity_id` int,
	`embedding_type` enum('text','image','multimodal') NOT NULL,
	`vector` text NOT NULL,
	`image_hash` varchar(128),
	`model` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `embeddings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrichment_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`stage` varchar(64) NOT NULL,
	`tool` varchar(64) NOT NULL,
	`output_summary` text,
	`duration_ms` int,
	`success` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enrichment_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metric_type` enum('ingestion','enrichment','triage','search','playbook','system') NOT NULL,
	`metric_name` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`unit` varchar(32),
	`tags` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playbook_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`playbook_id` varchar(64) NOT NULL,
	`target_ids` json,
	`params` json,
	`status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
	`result` json,
	`step_results` json,
	`started_at` timestamp,
	`completed_at` timestamp,
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playbook_runs_id` PRIMARY KEY(`id`)
);
