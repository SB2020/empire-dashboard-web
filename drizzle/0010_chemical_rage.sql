CREATE TABLE `agent_instructions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`systemPromptOverride` text,
	`behaviorRules` text,
	`constraints` text,
	`temperature` double DEFAULT 0.7,
	`maxTokens` int DEFAULT 4096,
	`topP` double DEFAULT 0.9,
	`frequencyPenalty` double DEFAULT 0,
	`presencePenalty` double DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_instructions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_kb_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kbId` int NOT NULL,
	`userId` int NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) DEFAULT 'application/pdf',
	`textContent` text,
	`chunkCount` int DEFAULT 0,
	`tokenCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_kb_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_kb_embeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`kbId` int NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`chunkIndex` int NOT NULL,
	`text` text NOT NULL,
	`embedding` text NOT NULL,
	`tokenCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_kb_embeddings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_knowledge_bases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`documentCount` int DEFAULT 0,
	`totalTokens` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_knowledge_bases_id` PRIMARY KEY(`id`)
);
