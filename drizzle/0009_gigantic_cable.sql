CREATE TABLE `pdf_agent_chats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`document_id` int NOT NULL,
	`agent_id` varchar(64) NOT NULL DEFAULT 'oppenheimer',
	`role` enum('user','agent') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pdf_agent_chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pdf_collection_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`document_id` int NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pdf_collection_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pdf_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`icon` varchar(64),
	`color` varchar(32),
	`is_default` boolean NOT NULL DEFAULT false,
	`document_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pdf_collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pdf_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`author` varchar(256),
	`description` text,
	`file_url` text NOT NULL,
	`file_key` text NOT NULL,
	`thumbnail_url` text,
	`file_size` int NOT NULL DEFAULT 0,
	`page_count` int DEFAULT 0,
	`mime_type` varchar(64) DEFAULT 'application/pdf',
	`category` enum('intelligence','research','policy','technical','legal','training','reference','report','manual','other') NOT NULL DEFAULT 'other',
	`tags` json,
	`extracted_text` text,
	`summary` text,
	`language` varchar(16) DEFAULT 'en',
	`is_public` boolean NOT NULL DEFAULT false,
	`read_count` int NOT NULL DEFAULT 0,
	`last_read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pdf_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pdf_reading_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`document_id` int NOT NULL,
	`current_page` int NOT NULL DEFAULT 1,
	`total_pages` int NOT NULL DEFAULT 1,
	`progress_percent` int NOT NULL DEFAULT 0,
	`last_read_at` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`highlights` json,
	`bookmarks` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pdf_reading_progress_id` PRIMARY KEY(`id`)
);
