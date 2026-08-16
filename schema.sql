-- LEGACY MYSQL REFERENCE ONLY. The current Vercel/Neon consent persistence uses apps/web/prisma/schema.prisma.

CREATE DATABASE IF NOT EXISTS anonisko
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE anonisko;

CREATE TABLE IF NOT EXISTS anonymous_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_uuid CHAR(36) NOT NULL,
    nickname VARCHAR(24) NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    campus VARCHAR(100) NOT NULL,
    preference ENUM('anyone', 'male', 'female') NOT NULL DEFAULT 'anyone',
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_session_uuid (session_uuid),
    KEY idx_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matches (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    match_uuid CHAR(36) NOT NULL,
    session_a CHAR(36) NOT NULL,
    session_b CHAR(36) NOT NULL,
    ended_by CHAR(36) NULL,
    ended_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_match_uuid (match_uuid),
    KEY idx_session_a (session_a),
    KEY idx_session_b (session_b),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    match_uuid CHAR(36) NOT NULL,
    sender_session_uuid CHAR(36) NOT NULL,
    message_text VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_match_created (match_uuid, created_at),
    KEY idx_sender (sender_session_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reporter_session_uuid CHAR(36) NOT NULL,
    reported_session_uuid CHAR(36) NOT NULL,
    match_uuid CHAR(36) NULL,
    reason ENUM('harassment', 'sexual_content', 'spam', 'hate', 'personal_info', 'other') NOT NULL,
    details VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reported (reported_session_uuid),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blocks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    blocker_session_uuid CHAR(36) NOT NULL,
    blocked_session_uuid CHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_block_pair (blocker_session_uuid, blocked_session_uuid),
    KEY idx_blocked (blocked_session_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
