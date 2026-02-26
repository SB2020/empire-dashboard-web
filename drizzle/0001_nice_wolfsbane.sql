CREATE TABLE `agent_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`command` text NOT NULL,
	`response` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `agent_commands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`nodeType` enum('note','paper','concept','entity','insight') NOT NULL DEFAULT 'note',
	`tags` json,
	`connections` json,
	`embedding` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assetType` enum('audio','image','video') NOT NULL,
	`prompt` text NOT NULL,
	`url` text,
	`fileKey` text,
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`eventType` enum('injection_attempt','threat_detected','defense_activated','scan_complete','anomaly') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
	`description` text NOT NULL,
	`payload` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_logs_id` PRIMARY KEY(`id`)
);
