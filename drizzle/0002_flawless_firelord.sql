CREATE TABLE `case_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`case_id` int NOT NULL,
	`record_id` int,
	`evidence_type` enum('record','entity','note','link','image','file') NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text,
	`source_url` text,
	`confidence` int DEFAULT 50,
	`notes` text,
	`metadata` json,
	`position` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('open','active','closed','archived') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`tags` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`from_entity_id` int NOT NULL,
	`to_entity_id` int NOT NULL,
	`relation_type` varchar(64) NOT NULL,
	`confidence` int DEFAULT 50,
	`sources` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entity_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `osint_entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` enum('person','organization','location','device','domain','event','media') NOT NULL,
	`name` varchar(500) NOT NULL,
	`canonical_key` varchar(256) NOT NULL,
	`metadata` json,
	`confidence` int DEFAULT 50,
	`source_count` int DEFAULT 1,
	`sources` json,
	`last_seen` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `osint_entities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `osint_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_url` text,
	`collector_id` varchar(64) NOT NULL,
	`record_type` enum('post','image','video','article','stream','alert','domain','camera') NOT NULL,
	`title` text,
	`content` text,
	`image_url` text,
	`latitude` text,
	`longitude` text,
	`confidence` int DEFAULT 50,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
	`enrichments` json,
	`entities` json,
	`tags` json,
	`image_hash` varchar(128),
	`lang` varchar(8),
	`transformation_chain` json,
	`collected_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `osint_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `triage_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`record_id` int,
	`score` int NOT NULL,
	`rules` json,
	`explanation` text,
	`status` enum('new','reviewed','escalated','dismissed') NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `triage_alerts_id` PRIMARY KEY(`id`)
);
