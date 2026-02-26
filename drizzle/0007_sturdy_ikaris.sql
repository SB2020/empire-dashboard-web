CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_id` int NOT NULL,
	`actor_name` varchar(256),
	`actor_type` enum('user','agent','system') NOT NULL DEFAULT 'user',
	`action` varchar(256) NOT NULL,
	`resource_type` varchar(128) NOT NULL,
	`resource_id` varchar(256),
	`details` json,
	`rationale` text,
	`ip_address` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`author_id` int NOT NULL,
	`author_name` varchar(256),
	`content` text NOT NULL,
	`annotation_type` enum('note','finding','question','action_item','conclusion') NOT NULL DEFAULT 'note',
	`referenced_item_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `case_annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`platform` varchar(128) NOT NULL,
	`display_name` varchar(256),
	`status` enum('connected','disconnected','expired','error') NOT NULL DEFAULT 'disconnected',
	`scopes` json,
	`last_sync_at` timestamp,
	`token_expires_at` timestamp,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`excerpt` text,
	`media_type` enum('image','video','text','document','link') NOT NULL DEFAULT 'text',
	`media_url` varchar(1024),
	`thumbnail_url` varchar(1024),
	`source_url` varchar(1024),
	`source_platform` varchar(128),
	`collector_id` varchar(128),
	`confidence_score` double DEFAULT 0,
	`latitude` double,
	`longitude` double,
	`provenance_summary` text,
	`raw_payload_path` varchar(512),
	`transformation_chain` json,
	`tags` json,
	`status` enum('new','triaged','verified','flagged','archived') NOT NULL DEFAULT 'new',
	`case_id` int,
	`collected_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playbooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(128),
	`steps` json NOT NULL,
	`is_built_in` boolean NOT NULL DEFAULT false,
	`is_public` boolean NOT NULL DEFAULT true,
	`author_id` int,
	`version` varchar(32) DEFAULT '1.0',
	`icon` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playbooks_id` PRIMARY KEY(`id`)
);
