-- Script de inicialización de base de datos para Railway
-- Este script se ejecutará automáticamente si no existen las tablas
-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS `users` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `first_name` varchar(255) NOT NULL,
    `last_name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL UNIQUE,
    `password` varchar(255) NOT NULL,
    `phone` varchar(20) DEFAULT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT '0',
    `two_factor_enabled` tinyint(1) NOT NULL DEFAULT '0',
    `two_factor_secret` varchar(255) DEFAULT NULL,
    `two_factor_type` enum('GOOGLE_AUTHENTICATOR', 'EMAIL', 'SMS') DEFAULT NULL,
    `account_non_expired` tinyint(1) NOT NULL DEFAULT '1',
    `account_non_locked` tinyint(1) NOT NULL DEFAULT '1',
    `credentials_non_expired` tinyint(1) NOT NULL DEFAULT '1',
    `google_auth_secret` varchar(255) DEFAULT NULL,
    `google_auth_enabled` tinyint(1) NOT NULL DEFAULT '0',
    `sms_enabled` tinyint(1) NOT NULL DEFAULT '0',
    `email_enabled` tinyint(1) NOT NULL DEFAULT '0',
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS `roles` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL UNIQUE,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Crear tabla de relación usuarios-roles
CREATE TABLE IF NOT EXISTS `user_roles` (
    `user_id` bigint NOT NULL,
    `role_id` bigint NOT NULL,
    PRIMARY KEY (`user_id`, `role_id`),
    KEY `fk_role_id` (`role_id`),
    CONSTRAINT `fk_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Crear tabla de tokens de verificación
CREATE TABLE IF NOT EXISTS `verification_tokens` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `token` varchar(255) NOT NULL UNIQUE,
    `user_id` bigint NOT NULL,
    `expiry_date` timestamp NOT NULL,
    `used` tinyint(1) NOT NULL DEFAULT '0',
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_verification_user_id` (`user_id`),
    CONSTRAINT `fk_verification_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Crear tabla de tokens de reset de contraseña
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `token` varchar(255) NOT NULL UNIQUE,
    `user_id` bigint NOT NULL,
    `expiry_date` timestamp NOT NULL,
    `used` tinyint(1) NOT NULL DEFAULT '0',
    PRIMARY KEY (`id`),
    KEY `fk_password_reset_user_id` (`user_id`),
    CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Crear tabla de tokens 2FA
CREATE TABLE IF NOT EXISTS `two_factor_tokens` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `token` varchar(10) NOT NULL,
    `user_id` bigint NOT NULL,
    `token_type` enum('EMAIL', 'SMS') NOT NULL,
    `expiry_date` timestamp NOT NULL,
    `used` tinyint(1) NOT NULL DEFAULT '0',
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_two_factor_user_id` (`user_id`),
    CONSTRAINT `fk_two_factor_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Crear tabla de códigos SMS
CREATE TABLE IF NOT EXISTS `sms_verification_codes` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `phone` varchar(20) NOT NULL,
    `code` varchar(10) NOT NULL,
    `user_id` bigint DEFAULT NULL,
    `expiry_date` timestamp NOT NULL,
    `used` tinyint(1) NOT NULL DEFAULT '0',
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_sms_user_id` (`user_id`),
    CONSTRAINT `fk_sms_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Insertar roles básicos
INSERT IGNORE INTO `roles` (`name`)
VALUES ('USER'),
    ('ADMIN');
-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS `idx_users_email` ON `users` (`email`);
CREATE INDEX IF NOT EXISTS `idx_verification_tokens_token` ON `verification_tokens` (`token`);
CREATE INDEX IF NOT EXISTS `idx_password_reset_tokens_token` ON `password_reset_tokens` (`token`);
CREATE INDEX IF NOT EXISTS `idx_two_factor_tokens_user_type` ON `two_factor_tokens` (`user_id`, `token_type`);
CREATE INDEX IF NOT EXISTS `idx_sms_codes_phone` ON `sms_verification_codes` (`phone`);
-- Comentario: Este script se ejecutará automáticamente en Railway
-- No es necesario ejecutarlo manualmente