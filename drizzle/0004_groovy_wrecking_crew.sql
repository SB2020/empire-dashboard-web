CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`inviter_id` int NOT NULL,
	`invitee_id` int,
	`max_uses` int NOT NULL DEFAULT 1,
	`used_count` int NOT NULL DEFAULT 0,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `social_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporter_id` int NOT NULL,
	`target_post_id` int,
	`target_user_id` int,
	`reason` enum('spam','bot','harassment','misinformation','off-topic','other') NOT NULL DEFAULT 'other',
	`details` text,
	`status` enum('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`author_id` int NOT NULL,
	`type` enum('text','image','link','intel','analysis') NOT NULL DEFAULT 'text',
	`title` varchar(256),
	`content` text NOT NULL,
	`media_url` text,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`tags` json,
	`visibility` enum('public','trusted','private') NOT NULL DEFAULT 'public',
	`upvotes` int NOT NULL DEFAULT 0,
	`downvotes` int NOT NULL DEFAULT 0,
	`reply_count` int NOT NULL DEFAULT 0,
	`flag_count` int NOT NULL DEFAULT 0,
	`parent_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`post_id` int NOT NULL,
	`vote` enum('up','down') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`score` int NOT NULL DEFAULT 50,
	`level` enum('unverified','newcomer','member','trusted','elder') NOT NULL DEFAULT 'newcomer',
	`invite_chain_depth` int NOT NULL DEFAULT 0,
	`posts_count` int NOT NULL DEFAULT 0,
	`flags_received` int NOT NULL DEFAULT 0,
	`flags_given` int NOT NULL DEFAULT 0,
	`last_activity` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trust_scores_id` PRIMARY KEY(`id`)
);
