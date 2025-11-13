-- Script para insertar el rol USER si no existe
INSERT IGNORE INTO `roles` (`name`)
VALUES ('ROLE_USER');