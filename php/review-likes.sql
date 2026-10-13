-- Store one like per user and review, and remove likes when either record is deleted.
CREATE TABLE IF NOT EXISTS `review_likes` (
    `review_id` INT(11) NOT NULL,
    `user_id` INT(11) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`review_id`, `user_id`),
    KEY `idx_review_likes_user_id` (`user_id`),
    CONSTRAINT `fk_review_likes_review`
        FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_review_likes_user`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
