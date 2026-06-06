-- MySQL dump 10.13  Distrib 8.0.40, for macos11.7 (x86_64)
--
-- Host: 127.0.0.1    Database: deprixa_lite
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `api_clients`
--

DROP TABLE IF EXISTS `api_clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_clients` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `client_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_secret_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom',
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `expires_at` timestamp NULL DEFAULT NULL,
  `callback_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `webhook_secret` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allowed_scopes` json DEFAULT NULL,
  `rate_limit_per_minute` int DEFAULT NULL,
  `ip_whitelist` json DEFAULT NULL,
  `request_id_prefix` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_clients_client_id_unique` (`client_id`),
  KEY `api_clients_organization_id_is_active_index` (`organization_id`,`is_active`),
  CONSTRAINT `api_clients_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_clients`
--

LOCK TABLES `api_clients` WRITE;
/*!40000 ALTER TABLE `api_clients` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_request_logs`
--

DROP TABLE IF EXISTS `api_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_request_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `token_id` bigint unsigned DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `method` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_headers` json DEFAULT NULL,
  `request_body` json DEFAULT NULL,
  `status_code` smallint unsigned DEFAULT NULL,
  `response_body` json DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_ms` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `api_request_logs_organization_id_created_at_index` (`organization_id`,`created_at`),
  KEY `api_request_logs_token_id_created_at_index` (`token_id`,`created_at`),
  CONSTRAINT `api_request_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_request_logs`
--

LOCK TABLES `api_request_logs` WRITE;
/*!40000 ALTER TABLE `api_request_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_request_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_webhook_delivery_logs`
--

DROP TABLE IF EXISTS `api_webhook_delivery_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_webhook_delivery_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `api_webhook_subscription_id` bigint unsigned NOT NULL,
  `event` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `callback_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `http_status` smallint unsigned DEFAULT NULL,
  `attempt` smallint unsigned NOT NULL DEFAULT '1',
  `success` tinyint(1) NOT NULL DEFAULT '0',
  `response_body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `duration_ms` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `awdl_subscription_success_idx` (`api_webhook_subscription_id`,`success`),
  CONSTRAINT `api_webhook_delivery_logs_api_webhook_subscription_id_foreign` FOREIGN KEY (`api_webhook_subscription_id`) REFERENCES `api_webhook_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_webhook_delivery_logs`
--

LOCK TABLES `api_webhook_delivery_logs` WRITE;
/*!40000 ALTER TABLE `api_webhook_delivery_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_webhook_delivery_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_webhook_subscriptions`
--

DROP TABLE IF EXISTS `api_webhook_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_webhook_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `api_client_id` bigint unsigned DEFAULT NULL,
  `provider` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `callback_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `secret` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `headers` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `retry_count` smallint unsigned NOT NULL DEFAULT '3',
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `api_webhook_subscriptions_organization_id_is_active_index` (`organization_id`,`is_active`),
  KEY `api_webhook_subscriptions_organization_id_provider_event_index` (`organization_id`,`provider`,`event`),
  CONSTRAINT `api_webhook_subscriptions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_webhook_subscriptions`
--

LOCK TABLES `api_webhook_subscriptions` WRITE;
/*!40000 ALTER TABLE `api_webhook_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_webhook_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_organization_id_module_index` (`organization_id`,`module`),
  KEY `audit_logs_created_at_index` (`created_at`),
  KEY `audit_logs_user_id_index` (`user_id`),
  KEY `audit_logs_action_index` (`action`),
  CONSTRAINT `audit_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=264 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branches_organization_id_index` (`organization_id`),
  CONSTRAINT `branches_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,NULL,'Miami',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-07 01:32:56','2026-04-07 01:32:56'),(2,NULL,'Madrid',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-07 01:32:56','2026-04-07 01:32:56'),(3,NULL,'Bogota',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-07 01:32:56','2026-04-07 01:32:56'),(4,NULL,'Medellin',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-07 01:32:56','2026-04-07 01:32:56'),(5,NULL,'HQ',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-07 01:32:56','2026-04-07 01:32:56'),(6,1,'Your Company - Principal',NULL,'HQ','123 Main Street','New York','Colombia','NY','2026-04-17 01:02:04','2026-04-25 07:38:04'),(7,1,'Your Company - Bodega',NULL,'WH',NULL,'','CO',NULL,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(8,1,'Sucursal Norte',NULL,'SNR',NULL,'Barranquilla','CO',NULL,'2026-05-02 17:41:22','2026-05-02 17:41:22'),(9,1,'Sucursal Sur',NULL,'SSR',NULL,'Cali','CO',NULL,'2026-05-02 17:41:22','2026-05-02 17:41:22');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carrier_accounts`
--

DROP TABLE IF EXISTS `carrier_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carrier_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `carrier_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `credentials` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'test',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `webhook_secret` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Encrypted shared secret for HMAC-SHA256 verification of incoming carrier webhooks',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `carrier_accounts_organization_id_foreign` (`organization_id`),
  CONSTRAINT `carrier_accounts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carrier_accounts`
--

LOCK TABLES `carrier_accounts` WRITE;
/*!40000 ALTER TABLE `carrier_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `carrier_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carrier_configs`
--

DROP TABLE IF EXISTS `carrier_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carrier_configs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `carrier_slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credentials` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_test_mode` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `carrier_configs_organization_id_carrier_slug_unique` (`organization_id`,`carrier_slug`),
  CONSTRAINT `carrier_configs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carrier_configs`
--

LOCK TABLES `carrier_configs` WRITE;
/*!40000 ALTER TABLE `carrier_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `carrier_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `sender_id` bigint unsigned NOT NULL,
  `recipient_id` bigint unsigned DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `shipment_id` bigint unsigned DEFAULT NULL,
  `context_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_messages_sender_id_foreign` (`sender_id`),
  KEY `chat_messages_organization_id_created_at_index` (`organization_id`,`created_at`),
  KEY `chat_messages_organization_id_sender_id_recipient_id_index` (`organization_id`,`sender_id`,`recipient_id`),
  CONSTRAINT `chat_messages_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cities`
--

DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned DEFAULT NULL,
  `country_id` bigint unsigned NOT NULL,
  `state_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `timezone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cities_organization_id_state_id_name_unique` (`organization_id`,`state_id`,`name`),
  KEY `cities_country_id_foreign` (`country_id`),
  KEY `cities_name_index` (`name`),
  KEY `cities_state_id_index` (`state_id`),
  KEY `cities_state_id_name_index` (`state_id`,`name`),
  KEY `cities_organization_id_index` (`organization_id`),
  CONSTRAINT `cities_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cities_state_id_foreign` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cities`
--

LOCK TABLES `cities` WRITE;
/*!40000 ALTER TABLE `cities` DISABLE KEYS */;
INSERT INTO `cities` VALUES (1,NULL,1,1,'New York',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(2,NULL,1,1,'Envigado',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(3,NULL,1,1,'Bello',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(4,NULL,1,1,'Itagüí',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(5,NULL,1,1,'Rionegro',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(6,NULL,1,2,'Bogotá',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(7,NULL,1,2,'Soacha',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(8,NULL,1,2,'Chía',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(9,NULL,1,2,'Zipaquirá',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(10,NULL,1,2,'Facatativá',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(11,NULL,1,3,'Cali',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(12,NULL,1,3,'Palmira',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(13,NULL,1,3,'Buenaventura',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(14,NULL,1,3,'Tuluá',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(15,NULL,1,3,'Cartago',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(16,NULL,1,4,'Bogotá',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(17,NULL,1,5,'Bucaramanga',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(18,NULL,1,5,'Floridablanca',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(19,NULL,1,5,'Piedecuesta',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(20,NULL,1,5,'Barrancabermeja',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(21,NULL,1,6,'Barranquilla',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(22,NULL,1,6,'Soledad',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(23,NULL,1,6,'Malambo',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(24,NULL,1,6,'New York',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(25,NULL,1,7,'Cartagena',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(26,NULL,1,7,'Sincelejo',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(27,NULL,1,7,'Magangué',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(28,NULL,1,7,'Turbaco',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(29,NULL,1,8,'Pasto',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(30,NULL,1,8,'Ipiales',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(31,NULL,1,8,'Tumaco',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(32,NULL,1,8,'Túquerres',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(33,NULL,2,9,'Los Angeles',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(34,NULL,2,9,'San Francisco',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(35,NULL,2,9,'San Diego',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(36,NULL,2,9,'San Jose',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(37,NULL,2,9,'Sacramento',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(38,NULL,2,10,'Miami',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(39,NULL,2,10,'Orlando',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(40,NULL,2,10,'Tampa',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(41,NULL,2,10,'Jacksonville',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(42,NULL,2,10,'Fort Lauderdale',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(43,NULL,2,11,'New York City',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(44,NULL,2,11,'Buffalo',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(45,NULL,2,11,'Rochester',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(46,NULL,2,11,'Albany',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(47,NULL,2,11,'Syracuse',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(48,NULL,2,12,'Houston',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(49,NULL,2,12,'Dallas',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(50,NULL,2,12,'San Antonio',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(51,NULL,2,12,'Austin',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(52,NULL,2,12,'Fort Worth',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(53,NULL,2,13,'Chicago',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(54,NULL,2,13,'Aurora',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(55,NULL,2,13,'Naperville',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(56,NULL,2,13,'Joliet',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(57,NULL,2,13,'Rockford',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(58,NULL,3,14,'Ciudad de México',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(59,NULL,3,14,'Iztapalapa',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(60,NULL,3,14,'Gustavo A. Madero',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(61,NULL,3,14,'Coyoacán',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(62,NULL,3,14,'Tlalpan',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(63,NULL,3,15,'Guadalajara',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(64,NULL,3,15,'Zapopan',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(65,NULL,3,15,'Tlaquepaque',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(66,NULL,3,15,'Tonalá',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(67,NULL,3,15,'Puerto Vallarta',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(68,NULL,3,16,'Monterrey',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(69,NULL,3,16,'Guadalupe',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(70,NULL,3,16,'San Nicolás',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(71,NULL,3,16,'Apodaca',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(72,NULL,3,16,'Santa Catarina',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(73,NULL,3,17,'Ecatepec',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(74,NULL,3,17,'Nezahualcóyotl',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(75,NULL,3,17,'Toluca',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(76,NULL,3,17,'Naucalpan',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(77,NULL,3,17,'Tlalnepantla',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(78,NULL,3,18,'Cancún',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(79,NULL,3,18,'Playa del Carmen',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(80,NULL,3,18,'Chetumal',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(81,NULL,3,18,'Cozumel',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(82,NULL,3,18,'Tulum',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(83,NULL,4,19,'Madrid',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(84,NULL,4,19,'Alcalá de Henares',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(85,NULL,4,19,'Getafe',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(86,NULL,4,19,'Leganés',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(87,NULL,4,19,'Móstoles',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(88,NULL,4,20,'Barcelona',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(89,NULL,4,20,'L\'Hospitalet',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(90,NULL,4,20,'Badalona',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(91,NULL,4,20,'Sabadell',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(92,NULL,4,20,'Terrassa',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(93,NULL,4,21,'Sevilla',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(94,NULL,4,21,'Málaga',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(95,NULL,4,21,'Córdoba',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(96,NULL,4,21,'Granada',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(97,NULL,4,21,'Cádiz',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(98,NULL,4,22,'Valencia',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(99,NULL,4,22,'Alicante',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(100,NULL,4,22,'Elche',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(101,NULL,4,22,'Castellón de la Plana',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(102,NULL,5,23,'Buenos Aires',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(103,NULL,5,23,'La Plata',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(104,NULL,5,23,'Mar del Plata',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(105,NULL,5,23,'Bahía Blanca',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(106,NULL,5,23,'Quilmes',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(107,NULL,5,24,'Córdoba',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(108,NULL,5,24,'Villa María',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(109,NULL,5,24,'Río Cuarto',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(110,NULL,5,24,'Alta Gracia',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(111,NULL,5,25,'Santa Fe',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(112,NULL,5,25,'Rosario',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(113,NULL,5,25,'Rafaela',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(114,NULL,5,25,'Venado Tuerto',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(115,NULL,6,26,'Santiago',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(116,NULL,6,26,'Puente Alto',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(117,NULL,6,26,'Maipú',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(118,NULL,6,26,'La Florida',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(119,NULL,6,26,'Las Condes',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(120,NULL,6,27,'Valparaíso',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(121,NULL,6,27,'Viña del Mar',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(122,NULL,6,27,'Quilpué',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(123,NULL,6,27,'Villa Alemana',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(124,NULL,7,28,'Lima',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(125,NULL,7,28,'Callao',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(126,NULL,7,28,'Ate',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(127,NULL,7,28,'Comas',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(128,NULL,7,28,'San Juan de Lurigancho',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(129,NULL,7,29,'Arequipa',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(130,NULL,7,29,'Camaná',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(131,NULL,7,29,'Mollendo',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(132,NULL,7,29,'Chivay',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(133,NULL,8,30,'Quito',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(134,NULL,8,30,'Cayambe',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(135,NULL,8,30,'Machachi',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(136,NULL,8,30,'Sangolquí',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(137,NULL,8,31,'Guayaquil',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(138,NULL,8,31,'Durán',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(139,NULL,8,31,'Milagro',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(140,NULL,8,31,'Samborondón',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(141,NULL,9,32,'Ciudad de Panamá',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(142,NULL,9,32,'San Miguelito',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(143,NULL,9,32,'Arraiján',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(144,NULL,9,32,'La Chorrera',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(145,NULL,9,32,'Colón',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(146,NULL,9,33,'Colón',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(147,NULL,9,33,'Puerto Colón',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(148,NULL,9,33,'Chagres',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(149,NULL,10,34,'San José',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(150,NULL,10,34,'Desamparados',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(151,NULL,10,34,'Alajuelita',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(152,NULL,10,34,'Tibás',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(153,NULL,10,34,'Goicoechea',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(154,NULL,10,35,'Alajuela',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(155,NULL,10,35,'San José de Alajuela',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(156,NULL,10,35,'San Ramón',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(157,NULL,10,35,'Grecia',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(158,NULL,10,35,'Poás',NULL,NULL,NULL,NULL,1,'2026-04-07 01:33:09','2026-04-07 01:33:09');
/*!40000 ALTER TABLE `cities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_rules`
--

DROP TABLE IF EXISTS `commission_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `type` enum('percentage','fixed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percentage',
  `rate` decimal(10,4) NOT NULL,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `applies_to` enum('all','branch','user','zone') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `reference_id` bigint unsigned DEFAULT NULL,
  `min_amount` decimal(10,2) DEFAULT NULL COMMENT 'Min shipment total',
  `max_amount` decimal(10,2) DEFAULT NULL COMMENT 'Max shipment total (null = no cap)',
  `priority` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Higher = evaluated first',
  `trigger_on` enum('on_creation','on_delivery','on_cod_remittance','on_pickup_completion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'on_creation' COMMENT 'When to calculate this commission relative to shipment lifecycle',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `commission_rules_organization_id_is_active_index` (`organization_id`,`is_active`),
  CONSTRAINT `commission_rules_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_rules`
--

LOCK TABLES `commission_rules` WRITE;
/*!40000 ALTER TABLE `commission_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `commission_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commissions`
--

DROP TABLE IF EXISTS `commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `shipment_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `commission_rule_id` bigint unsigned DEFAULT NULL,
  `shipment_total` decimal(10,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `status` enum('pending','approved','paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `commission_status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `trigger_event` enum('shipment_created','shipment_delivered','cod_collected','cod_remitted','pickup_completed','manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'shipment_created',
  `reversed_at` timestamp NULL DEFAULT NULL,
  `reversal_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `parent_commission_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `commissions_user_id_foreign` (`user_id`),
  KEY `commissions_commission_rule_id_foreign` (`commission_rule_id`),
  KEY `commissions_organization_id_user_id_status_index` (`organization_id`,`user_id`,`status`),
  KEY `commissions_shipment_id_index` (`shipment_id`),
  KEY `commissions_parent_commission_id_foreign` (`parent_commission_id`),
  KEY `commissions_org_status_created_idx` (`organization_id`,`status`,`created_at`),
  KEY `commissions_commission_status_index` (`commission_status`),
  CONSTRAINT `commissions_commission_rule_id_foreign` FOREIGN KEY (`commission_rule_id`) REFERENCES `commission_rules` (`id`) ON DELETE SET NULL,
  CONSTRAINT `commissions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `commissions_parent_commission_id_foreign` FOREIGN KEY (`parent_commission_id`) REFERENCES `commissions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `commissions_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `commissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commissions`
--

LOCK TABLES `commissions` WRITE;
/*!40000 ALTER TABLE `commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `rate_card_id` bigint unsigned DEFAULT NULL,
  `contract_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `terms` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('draft','active','expired','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `file_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_paths` json DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL,
  `signature_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signed_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contracts_contract_number_unique` (`contract_number`),
  KEY `contracts_rate_card_id_foreign` (`rate_card_id`),
  KEY `contracts_signed_by_foreign` (`signed_by`),
  KEY `contracts_organization_id_status_index` (`organization_id`,`status`),
  KEY `contracts_customer_id_index` (`customer_id`),
  CONSTRAINT `contracts_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contracts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contracts_rate_card_id_foreign` FOREIGN KEY (`rate_card_id`) REFERENCES `rate_cards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contracts_signed_by_foreign` FOREIGN KEY (`signed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contracts`
--

LOCK TABLES `contracts` WRITE;
/*!40000 ALTER TABLE `contracts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contracts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `countries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `iso2` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `iso3` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `countries_organization_id_name_unique` (`organization_id`,`name`),
  UNIQUE KEY `countries_organization_id_iso2_unique` (`organization_id`,`iso2`),
  KEY `countries_organization_id_index` (`organization_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
INSERT INTO `countries` VALUES (1,NULL,'Colombia',NULL,'CO','COL','57','COP','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(2,NULL,'Estados Unidos',NULL,'US','USA','1','USD','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(3,NULL,'México',NULL,'MX','MEX','52','MXN','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(4,NULL,'España',NULL,'ES','ESP','34','EUR','Europe',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(5,NULL,'Argentina',NULL,'AR','ARG','54','ARS','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(6,NULL,'Chile',NULL,'CL','CHL','56','CLP','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(7,NULL,'Perú',NULL,'PE','PER','51','PEN','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(8,NULL,'Ecuador',NULL,'EC','ECU','593','USD','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(9,NULL,'Panamá',NULL,'PA','PAN','507','PAB','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(10,NULL,'Costa Rica',NULL,'CR','CRI','506','CRC','Americas',1,'2026-04-07 01:33:09','2026-04-07 01:33:09');
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currencies`
--

DROP TABLE IF EXISTS `currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `currencies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `symbol` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exchange_rate` decimal(12,6) NOT NULL DEFAULT '1.000000',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `currencies_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currencies`
--

LOCK TABLES `currencies` WRITE;
/*!40000 ALTER TABLE `currencies` DISABLE KEYS */;
INSERT INTO `currencies` VALUES (1,'USD','United States Dollar',NULL,'$',1.000000,1,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(2,'EUR','Euro',NULL,'€',0.920000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(3,'GBP','British Pound',NULL,'£',0.790000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(4,'COP','Colombian Peso',NULL,'$',3900.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(5,'MXN','Mexican Peso',NULL,'$',17.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(6,'JPY','Japanese Yen',NULL,'¥',150.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(7,'CNY','Chinese Yuan',NULL,'¥',7.200000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(8,'CAD','Canadian Dollar',NULL,'$',1.350000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(9,'AUD','Australian Dollar',NULL,'$',1.520000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(10,'BRL','Brazilian Real',NULL,'R$',4.950000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(11,'ARS','Argentine Peso',NULL,'$',850.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(12,'CLP','Chilean Peso',NULL,'$',950.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(13,'PEN','Peruvian Sol',NULL,'S/',3.700000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(14,'AED','United Arab Emirates Dirham',NULL,'د.إ',3.670000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(15,'AFN','Afghan Afghani',NULL,'؋',70.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(16,'ALL','Albanian Lek',NULL,'L',95.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(17,'AMD','Armenian Dram',NULL,'֏',400.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(18,'ANG','Netherlands Antillean Guilder',NULL,'ƒ',1.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(19,'AOA','Angolan Kwanza',NULL,'Kz',830.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(20,'AWG','Aruban Florin',NULL,'ƒ',1.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(21,'AZN','Azerbaijani Manat',NULL,'₼',1.700000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(22,'BAM','Bosnia-Herzegovina Convertible Mark',NULL,'KM',1.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(23,'BBD','Barbadian Dollar',NULL,'$',2.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(24,'BDT','Bangladeshi Taka',NULL,'৳',110.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(25,'BGN','Bulgarian Lev',NULL,'лв',1.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(26,'BHD','Bahraini Dinar',NULL,'.د.ب',0.377000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(27,'BIF','Burundian Franc',NULL,'FBu',2850.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(28,'BMD','Bermudan Dollar',NULL,'$',1.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(29,'BND','Brunei Dollar',NULL,'$',1.350000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(30,'BOB','Bolivian Boliviano',NULL,'Bs.',6.900000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(31,'BSD','Bahamian Dollar',NULL,'$',1.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(32,'BTN','Bhutanese Ngultrum',NULL,'Nu.',83.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(33,'BWP','Botswanan Pula',NULL,'P',13.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(34,'BYN','Belarusian Ruble',NULL,'Br',3.300000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(35,'BZD','Belize Dollar',NULL,'$',2.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(36,'CDF','Congolese Franc',NULL,'FC',2750.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(37,'CHF','Swiss Franc',NULL,'CHF',0.880000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(38,'CKD','Cook Islands Dollar',NULL,'$',1.520000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(39,'CRC','Costa Rican Colón',NULL,'₡',520.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(40,'CUP','Cuban Peso',NULL,'$',24.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(41,'CVE','Cape Verdean Escudo',NULL,'$',101.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(42,'CZK','Czech Koruna',NULL,'Kč',23.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(43,'DJF','Djiboutian Franc',NULL,'Fdj',178.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(44,'DKK','Danish Krone',NULL,'kr',6.860000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(45,'DOP','Dominican Peso',NULL,'RD$',56.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(46,'DZD','Algerian Dinar',NULL,'د.ج',134.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(47,'EGP','Egyptian Pound',NULL,'£',31.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(48,'ERN','Eritrean Nakfa',NULL,'Nfk',15.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(49,'ETB','Ethiopian Birr',NULL,'Br',56.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(50,'FJD','Fijian Dollar',NULL,'$',2.250000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(51,'FKP','Falkland Islands Pound',NULL,'£',0.790000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(52,'FOK','Faroese Króna',NULL,'kr',6.860000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(53,'GEL','Georgian Lari',NULL,'₾',2.650000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(54,'GGP','Guernsey Pound',NULL,'£',0.790000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(55,'GHS','Ghanaian Cedi',NULL,'₵',12.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(56,'GIP','Gibraltar Pound',NULL,'£',0.790000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(57,'GMD','Gambian Dalasi',NULL,'D',67.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(58,'GNF','Guinean Franc',NULL,'FG',8600.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(59,'GTQ','Guatemalan Quetzal',NULL,'Q',7.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(60,'GYD','Guyanaese Dollar',NULL,'$',209.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(61,'HKD','Hong Kong Dollar',NULL,'$',7.830000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(62,'HNL','Honduran Lempira',NULL,'L',24.700000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(63,'HRK','Croatian Kuna',NULL,'kn',6.900000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(64,'HTG','Haitian Gourde',NULL,'G',132.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(65,'HUF','Hungarian Forint',NULL,'Ft',360.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(66,'IDR','Indonesian Rupiah',NULL,'Rp',15750.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(67,'ILS','Israeli New Sheqel',NULL,'₪',3.650000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(68,'IMP','Manx Pound',NULL,'£',0.790000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(69,'INR','Indian Rupee',NULL,'₹',83.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(70,'IQD','Iraqi Dinar',NULL,'ع.د',1310.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(71,'IRR','Iranian Rial',NULL,'﷼',42000.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(72,'ISK','Icelandic Króna',NULL,'kr',138.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(73,'JEP','Jersey Pound',NULL,'£',0.790000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(74,'JMD','Jamaican Dollar',NULL,'$',155.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(75,'JOD','Jordanian Dinar',NULL,'د.ا',0.709000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(76,'KES','Kenyan Shilling',NULL,'KSh',128.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(77,'KGS','Kyrgystani Som',NULL,'с',89.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(78,'KHR','Cambodian Riel',NULL,'៛',4050.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(79,'KID','Kiribati Dollar',NULL,'$',1.520000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(80,'KMF','Comorian Franc',NULL,'CF',450.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(81,'KRW','South Korean Won',NULL,'₩',1330.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(82,'KWD','Kuwaiti Dinar',NULL,'د.ك',0.307000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(83,'KYD','Cayman Islands Dollar',NULL,'$',0.833000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(84,'KZT','Kazakhstani Tenge',NULL,'₸',450.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(85,'LAK','Laotian Kip',NULL,'₭',20800.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(86,'LBP','Lebanese Pound',NULL,'ل.ل',15000.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(87,'LKR','Sri Lankan Rupee',NULL,'Rs',325.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(88,'LRD','Liberian Dollar',NULL,'$',190.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(89,'LSL','Lesotho Loti',NULL,'L',18.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(90,'LYD','Libyan Dinar',NULL,'ل.د',4.850000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(91,'MAD','Moroccan Dirham',NULL,'د.م.',10.100000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(92,'MDL','Moldovan Leu',NULL,'L',18.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(93,'MGA','Malagasy Ariary',NULL,'Ar',4500.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(94,'MKD','Macedonian Denar',NULL,'ден',56.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(95,'MMK','Myanma Kyat',NULL,'K',2100.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(96,'MNT','Mongolian Tugrik',NULL,'₮',3400.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(97,'MOP','Macanese Pataca',NULL,'MOP$',8.030000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(98,'MRU','Mauritanian Ouguiya',NULL,'UM',40.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(99,'MUR','Mauritian Rupee',NULL,'₨',45.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(100,'MVR','Maldivian Rufiyaa',NULL,'Rf',15.400000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(101,'MWK','Malawian Kwacha',NULL,'MK',1680.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(102,'MYR','Malaysian Ringgit',NULL,'RM',4.750000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(103,'MZN','Mozambican Metical',NULL,'MT',64.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(104,'NAD','Namibian Dollar',NULL,'$',18.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(105,'NGN','Nigerian Naira',NULL,'₦',1450.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(106,'NIO','Nicaraguan Córdoba',NULL,'C$',36.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(107,'NOK','Norwegian Krone',NULL,'kr',10.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(108,'NPR','Nepalese Rupee',NULL,'₨',133.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(109,'NZD','New Zealand Dollar',NULL,'$',1.640000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(110,'OMR','Omani Rial',NULL,'ر.ع.',0.385000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(111,'PAB','Panamanian Balboa',NULL,'B/.',1.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(112,'PGK','Papua New Guinean Kina',NULL,'K',3.750000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(113,'PHP','Philippine Peso',NULL,'₱',56.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(114,'PKR','Pakistani Rupee',NULL,'₨',278.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(115,'PLN','Polish Zloty',NULL,'zł',4.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(116,'PYG','Paraguayan Guarani',NULL,'₲',7300.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(117,'QAR','Qatari Rial',NULL,'ر.ق',3.640000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(118,'RON','Romanian Leu',NULL,'lei',4.600000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(119,'RSD','Serbian Dinar',NULL,'дин.',108.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(120,'RUB','Russian Ruble',NULL,'₽',92.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(121,'RWF','Rwandan Franc',NULL,'FRw',1300.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(122,'SAR','Saudi Riyal',NULL,'ر.س',3.750000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(123,'SBD','Solomon Islands Dollar',NULL,'$',8.400000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(124,'SCR','Seychellois Rupee',NULL,'₨',13.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(125,'SDG','Sudanese Pound',NULL,'£',600.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(126,'SEK','Swedish Krona',NULL,'kr',10.400000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(127,'SGD','Singapore Dollar',NULL,'$',1.350000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(128,'SHP','Saint Helena Pound',NULL,'£',0.790000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(129,'SLE','Sierra Leonean Leone',NULL,'Le',22500.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(130,'SOS','Somali Shilling',NULL,'Sh',570.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(131,'SRD','Surinamese Dollar',NULL,'$',38.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(132,'SSP','South Sudanese Pound',NULL,'£',1300.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(133,'STN','São Tomé and Príncipe Dobra',NULL,'Db',22.700000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(134,'SYP','Syrian Pound',NULL,'£',13000.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(135,'SZL','Swazi Lilangeni',NULL,'L',18.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(136,'THB','Thai Baht',NULL,'฿',36.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(137,'TJS','Tajikistani Somoni',NULL,'SM',10.950000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(138,'TMT','Turkmenistani Manat',NULL,'T',3.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(139,'TND','Tunisian Dinar',NULL,'د.ت',3.100000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(140,'TOP','Tongan Pa\'anga',NULL,'T$',2.360000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(141,'TRY','Turkish Lira',NULL,'₺',32.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(142,'TTD','Trinidad and Tobago Dollar',NULL,'TT$',6.780000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(143,'TVD','Tuvaluan Dollar',NULL,'$',1.520000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(144,'TWD','New Taiwan Dollar',NULL,'NT$',31.500000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(145,'TZS','Tanzanian Shilling',NULL,'Sh',2500.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(146,'UAH','Ukrainian Hryvnia',NULL,'₴',37.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(147,'UGX','Ugandan Shilling',NULL,'USh',3700.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(148,'UYU','Uruguayan Peso',NULL,'$U',39.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(149,'UZS','Uzbekistani Som',NULL,'so\'m',12350.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(150,'VES','Venezuelan Bolívar Soberano',NULL,'Bs.S.',36.200000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(151,'VND','Vietnamese Dong',NULL,'₫',24500.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(152,'VUV','Vanuatu Vatu',NULL,'VT',119.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(153,'WST','Samoan Tala',NULL,'T',2.700000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(154,'XAF','CFA Franc BEAC',NULL,'FCFA',600.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(155,'XCD','East Caribbean Dollar',NULL,'$',2.700000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(156,'XDR','Special Drawing Rights',NULL,'SDR',0.750000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(157,'XOF','CFA Franc BCEAO',NULL,'CFA',600.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(158,'XPF','CFP Franc',NULL,'₣',110.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(159,'YER','Yemeni Rial',NULL,'﷼',250.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(160,'ZAR','South African Rand',NULL,'R',18.800000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(161,'ZMW','Zambian Kwacha',NULL,'ZK',24.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10'),(162,'ZWL','Zimbabwean Dollar',NULL,'$',362.000000,0,1,'2026-04-07 01:33:10','2026-04-07 01:33:10');
/*!40000 ALTER TABLE `currencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_contacts`
--

DROP TABLE IF EXISTS `customer_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zip_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_contacts_organization_id_foreign` (`organization_id`),
  KEY `customer_contacts_customer_id_organization_id_index` (`customer_id`,`organization_id`),
  CONSTRAINT `customer_contacts_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_contacts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_contacts`
--

LOCK TABLES `customer_contacts` WRITE;
/*!40000 ALTER TABLE `customer_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customs_declarations`
--

DROP TABLE IF EXISTS `customs_declarations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customs_declarations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `declaration_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gift',
  `items` json NOT NULL,
  `declared_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `insurance_required` tinyint(1) NOT NULL DEFAULT '0',
  `insurance_value` decimal(12,2) DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customs_declarations_shipment_id_index` (`shipment_id`),
  KEY `customs_declarations_organization_id_index` (`organization_id`),
  CONSTRAINT `customs_declarations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customs_declarations_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customs_declarations`
--

LOCK TABLES `customs_declarations` WRITE;
/*!40000 ALTER TABLE `customs_declarations` DISABLE KEYS */;
/*!40000 ALTER TABLE `customs_declarations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `departments_organization_id_index` (`organization_id`),
  CONSTRAINT `departments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,1,'VENTAS',NULL,1,'2026-04-25 07:38:26','2026-04-25 07:38:26'),(2,1,'Operations','OPS',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(3,1,'Customer Service','CS',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(4,1,'Warehouse','WH',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(5,1,'Finance','FIN',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(6,1,'Sales','SLS',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(7,1,'IT Support','IT',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(8,1,'Human Resources','HR',1,'2026-05-02 17:40:52','2026-05-02 17:40:52');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_locations`
--

DROP TABLE IF EXISTS `driver_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `driver_id` bigint unsigned NOT NULL,
  `lat` decimal(10,7) NOT NULL,
  `lng` decimal(10,7) NOT NULL,
  `heading` int unsigned DEFAULT NULL,
  `speed` decimal(8,2) DEFAULT NULL,
  `accuracy` decimal(8,2) DEFAULT NULL,
  `source` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `captured_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `driver_locations_driver_id_captured_at_index` (`driver_id`,`captured_at`),
  CONSTRAINT `driver_locations_driver_id_foreign` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_locations`
--

LOCK TABLES `driver_locations` WRITE;
/*!40000 ALTER TABLE `driver_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `driver_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecommerce_stores`
--

DROP TABLE IF EXISTS `ecommerce_stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ecommerce_stores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `platform` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `credentials` json NOT NULL,
  `scopes` json DEFAULT NULL,
  `settings` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ecommerce_stores_organization_id_foreign` (`organization_id`),
  CONSTRAINT `ecommerce_stores_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecommerce_stores`
--

LOCK TABLES `ecommerce_stores` WRITE;
/*!40000 ALTER TABLE `ecommerce_stores` DISABLE KEYS */;
/*!40000 ALTER TABLE `ecommerce_stores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hs_codes`
--

DROP TABLE IF EXISTS `hs_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hs_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hs_codes_organization_id_code_unique` (`organization_id`,`code`),
  KEY `hs_codes_organization_id_index` (`organization_id`),
  CONSTRAINT `hs_codes_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hs_codes`
--

LOCK TABLES `hs_codes` WRITE;
/*!40000 ALTER TABLE `hs_codes` DISABLE KEYS */;
INSERT INTO `hs_codes` VALUES (1,1,'4324','sfdf','sdfsdf',1,'2026-04-25 08:14:31','2026-04-25 08:14:31'),(2,1,'8471.30','Portable digital automatic data-processing machines (laptops)','Electronics',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(3,1,'8517.13','Smartphones and cellular phones','Electronics',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(4,1,'8528.72','Television receivers, colour','Electronics',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(5,1,'6110.20','Jerseys, pullovers, cardigans — cotton','Apparel',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(6,1,'6204.62','Women\'s trousers — cotton','Apparel',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(7,1,'6403.99','Footwear with outer soles of rubber/plastics','Footwear',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(8,1,'3304.99','Beauty and makeup preparations','Cosmetics',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(9,1,'3401.11','Soap and organic surface-active products','Cosmetics',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(10,1,'0901.21','Coffee, roasted, not decaffeinated','Food & Beverage',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(11,1,'2009.11','Orange juice, frozen','Food & Beverage',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(12,1,'8703.23','Motor vehicles — cylinder capacity 1500-3000cc','Automotive',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(13,1,'8714.10','Parts and accessories of motorcycles','Automotive',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(14,1,'9403.60','Wooden furniture (not office/kitchen/bedroom)','Furniture',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(15,1,'4901.99','Printed books, brochures, leaflets','Books & Media',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(16,1,'9503.00','Toys, scale models, puzzles','Toys & Games',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(17,1,'3004.90','Medicaments in measured doses','Pharmaceuticals',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(18,1,'7113.19','Articles of jewellery — precious metal','Jewelry',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(19,1,'9018.90','Medical instruments and appliances','Medical',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(20,1,'3923.30','Carboys, bottles, flasks — plastics','Packaging',1,'2026-05-02 17:40:52','2026-05-02 17:40:52'),(21,1,'7210.49','Flat-rolled products of iron or non-alloy steel','Industrial',1,'2026-05-02 17:40:52','2026-05-02 17:40:52');
/*!40000 ALTER TABLE `hs_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `idempotency_keys`
--

DROP TABLE IF EXISTS `idempotency_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `idempotency_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `response_status` smallint unsigned NOT NULL,
  `response_body` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idempotency_org_key_unique` (`organization_id`,`key`),
  KEY `idempotency_keys_organization_id_index` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `idempotency_keys`
--

LOCK TABLES `idempotency_keys` WRITE;
/*!40000 ALTER TABLE `idempotency_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `idempotency_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_jobs`
--

DROP TABLE IF EXISTS `import_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'shipments',
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_rows` int NOT NULL DEFAULT '0',
  `processed_rows` int NOT NULL DEFAULT '0',
  `success_rows` int NOT NULL DEFAULT '0',
  `error_rows` int NOT NULL DEFAULT '0',
  `errors` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `import_jobs_created_by_foreign` (`created_by`),
  KEY `import_jobs_organization_id_status_index` (`organization_id`,`status`),
  CONSTRAINT `import_jobs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `import_jobs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_jobs`
--

LOCK TABLES `import_jobs` WRITE;
/*!40000 ALTER TABLE `import_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `import_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `in_app_notifications`
--

DROP TABLE IF EXISTS `in_app_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `in_app_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `type` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bell',
  `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `in_app_notifications_organization_id_user_id_read_at_index` (`organization_id`,`user_id`,`read_at`),
  KEY `in_app_notifications_organization_id_created_at_index` (`organization_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `in_app_notifications`
--

LOCK TABLES `in_app_notifications` WRITE;
/*!40000 ALTER TABLE `in_app_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `in_app_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `integration_request_logs`
--

DROP TABLE IF EXISTS `integration_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integration_request_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `integration_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `integration_id` bigint unsigned NOT NULL,
  `action` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request` json DEFAULT NULL,
  `response` json DEFAULT NULL,
  `status_code` int DEFAULT NULL,
  `duration_ms` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `integration_request_logs_organization_id_created_at_index` (`organization_id`,`created_at`),
  CONSTRAINT `integration_request_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `integration_request_logs`
--

LOCK TABLES `integration_request_logs` WRITE;
/*!40000 ALTER TABLE `integration_request_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `integration_request_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `integrations`
--

DROP TABLE IF EXISTS `integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `config` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `integrations_organization_id_type_unique` (`organization_id`,`type`),
  CONSTRAINT `integrations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `integrations`
--

LOCK TABLES `integrations` WRITE;
/*!40000 ALTER TABLE `integrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `integrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `sku` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `unit` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unit',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `photos` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_items_organization_id_sku_unique` (`organization_id`,`sku`),
  KEY `inventory_items_organization_id_is_active_index` (`organization_id`,`is_active`),
  CONSTRAINT `inventory_items_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items`
--

LOCK TABLES `inventory_items` WRITE;
/*!40000 ALTER TABLE `inventory_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_locations`
--

DROP TABLE IF EXISTS `inventory_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `warehouse_id` bigint unsigned NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `photos` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_locations_warehouse_id_code_unique` (`warehouse_id`,`code`),
  KEY `inventory_locations_organization_id_warehouse_id_index` (`organization_id`,`warehouse_id`),
  CONSTRAINT `inventory_locations_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_locations_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_locations`
--

LOCK TABLES `inventory_locations` WRITE;
/*!40000 ALTER TABLE `inventory_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_movements`
--

DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `warehouse_id` bigint unsigned NOT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `item_id` bigint unsigned DEFAULT NULL,
  `type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` decimal(12,2) NOT NULL,
  `reference_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `shipment_id` bigint unsigned DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `request_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_movements_warehouse_id_foreign` (`warehouse_id`),
  KEY `inventory_movements_location_id_foreign` (`location_id`),
  KEY `inv_mov_org_wh_created_idx` (`organization_id`,`warehouse_id`,`created_at`),
  KEY `inv_mov_item_type_created_idx` (`item_id`,`type`,`created_at`),
  KEY `inventory_movements_shipment_id_foreign` (`shipment_id`),
  CONSTRAINT `inventory_movements_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_movements_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_movements_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_movements_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_movements_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_movements`
--

LOCK TABLES `inventory_movements` WRITE;
/*!40000 ALTER TABLE `inventory_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_stocks`
--

DROP TABLE IF EXISTS `inventory_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_stocks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `warehouse_id` bigint unsigned NOT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `item_id` bigint unsigned NOT NULL,
  `qty_on_hand` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_stocks_warehouse_id_location_id_item_id_unique` (`warehouse_id`,`location_id`,`item_id`),
  KEY `inventory_stocks_location_id_foreign` (`location_id`),
  KEY `inventory_stocks_item_id_foreign` (`item_id`),
  KEY `inventory_stocks_organization_id_warehouse_id_index` (`organization_id`,`warehouse_id`),
  CONSTRAINT `inventory_stocks_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_stocks_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_stocks_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_stocks_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_stocks`
--

LOCK TABLES `inventory_stocks` WRITE;
/*!40000 ALTER TABLE `inventory_stocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB AUTO_INCREMENT=628 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lockers`
--

DROP TABLE IF EXISTS `lockers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lockers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `warehouse_id` bigint unsigned DEFAULT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive','suspended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `assigned_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lockers_organization_id_code_unique` (`organization_id`,`code`),
  KEY `lockers_organization_id_customer_id_index` (`organization_id`,`customer_id`),
  KEY `lockers_organization_id_status_index` (`organization_id`,`status`),
  KEY `lockers_customer_id_foreign` (`customer_id`),
  KEY `lockers_warehouse_id_foreign` (`warehouse_id`),
  CONSTRAINT `lockers_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lockers_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lockers_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lockers`
--

LOCK TABLES `lockers` WRITE;
/*!40000 ALTER TABLE `lockers` DISABLE KEYS */;
/*!40000 ALTER TABLE `lockers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `manifests`
--

DROP TABLE IF EXISTS `manifests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `manifests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manifest_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `driver_id` bigint unsigned DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `manifests_uuid_unique` (`uuid`),
  KEY `manifests_organization_id_status_index` (`organization_id`,`status`),
  KEY `manifests_driver_id_status_index` (`driver_id`,`status`),
  CONSTRAINT `manifests_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manifests`
--

LOCK TABLES `manifests` WRITE;
/*!40000 ALTER TABLE `manifests` DISABLE KEYS */;
/*!40000 ALTER TABLE `manifests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_01_26_103120_create_organizations_table',1),(5,'2026_01_26_103121_add_tenant_fields_to_users_table',1),(6,'2026_01_26_112718_create_permission_tables',1),(7,'2026_01_26_113451_create_shipments_table',1),(8,'2026_01_26_113453_create_shipment_histories_table',1),(9,'2026_01_26_120000_create_carrier_configs_table',1),(10,'2026_01_26_192542_add_financials_to_shipments_table',1),(11,'2026_01_26_204718_create_carrier_accounts_table',1),(12,'2026_01_26_204718_create_numbering_sequences_table',1),(13,'2026_01_26_204718_create_organization_settings_table',1),(14,'2026_01_26_215754_create_audit_logs_table',1),(15,'2026_01_26_215754_create_notification_rules_table',1),(16,'2026_01_26_215755_create_notification_templates_table',1),(17,'2026_01_26_230000_create_enterprise_settings_tables',1),(18,'2026_01_26_234000_add_address_fields_to_users_table',1),(19,'2026_01_27_023058_add_phone_to_users_table',1),(20,'2026_01_29_010336_create_countries_table',1),(21,'2026_01_29_010337_create_states_table',1),(22,'2026_01_29_010338_create_cities_table',1),(23,'2026_01_29_012323_add_location_fields_to_organizations_table',1),(24,'2026_01_29_032037_make_organization_settings_value_nullable',1),(25,'2026_01_29_080000_update_locations_tables',1),(26,'2026_01_29_090000_add_code_to_states_table',1),(27,'2026_01_29_130000_add_location_ids_to_organizations_table',1),(28,'2026_01_29_140000_add_organization_id_to_locations_tables',1),(29,'2026_01_30_031035_create_rate_zones_table',1),(30,'2026_01_30_031036_create_rate_cards_table',1),(31,'2026_01_30_031037_create_rate_rules_table',1),(32,'2026_01_30_051903_add_branding_fields_to_organizations_table',1),(33,'2026_01_30_120000_add_rate_links_to_shipments',1),(34,'2026_01_30_160000_optimize_shipment_search',1),(35,'2026_01_31_030852_create_currencies_table',1),(36,'2026_01_31_031056_add_exchange_rate_to_shipments_table',1),(37,'2026_02_01_000717_create_branches_table',1),(38,'2026_02_01_000719_add_branch_details_to_users_table',1),(39,'2026_02_01_002318_seed_and_link_branches',1),(40,'2026_02_01_153951_add_language_to_notification_templates_table',1),(41,'2026_02_01_174401_add_design_type_to_notification_templates_table',1),(42,'2026_02_01_182148_add_password_changed_at_to_users_table',1),(43,'2026_02_02_003800_add_external_fields_to_shipments_table',1),(44,'2026_02_02_155811_fix_unique_constraint_on_notification_templates',1),(45,'2026_02_03_152227_add_advanced_branding_fields_to_organizations_table',1),(46,'2026_02_03_180000_add_card_skin_and_notification_options_to_organizations',1),(47,'2026_02_04_104024_create_shipment_statuses_table',1),(48,'2026_02_04_111456_update_shipments_table_add_status_foreign_key',1),(49,'2026_02_04_112254_fix_shipment_statuses_code_unique_constraint',1),(50,'2026_02_04_200000_add_customer_super_fields_to_users_table',1),(51,'2026_02_04_210000_add_document_type_to_users_table',1),(52,'2026_02_04_220000_add_state_to_branches_table',1),(53,'2026_02_05_020000_change_countries_iso2_to_organization_scoped_unique',1),(54,'2026_02_05_120000_create_services_table',1),(55,'2026_02_06_100000_add_phone_column_to_users_table',1),(56,'2026_02_06_120000_create_shipment_packages_table',1),(57,'2026_02_06_120001_create_shipment_package_items_table',1),(58,'2026_02_06_140000_create_payments_table',1),(59,'2026_02_06_150000_create_shipment_activities_table',1),(60,'2026_02_06_150001_backfill_shipment_activities_from_history',1),(61,'2026_02_06_180000_create_shipment_attachments_table',1),(62,'2026_02_06_200000_add_price_per_kg_to_rate_rules',1),(63,'2026_02_06_200001_add_origin_dest_any_to_rate_zones',1),(64,'2026_02_06_210000_add_status_id_to_shipment_histories',1),(65,'2026_02_07_000000_add_sublogo_url_to_organizations_table',1),(66,'2026_02_09_132429_add_pricing_to_services_table',1),(67,'2026_02_09_135023_add_currency_to_services_table',1),(68,'2026_02_09_140914_add_estimated_days_to_services_table',1),(69,'2026_02_10_180000_add_is_archived_to_shipments_table',1),(70,'2026_02_11_120000_add_language_to_users_table',1),(71,'2026_02_14_000000_create_driver_locations_table',1),(72,'2026_03_11_000001_add_organization_id_to_branches_table',1),(73,'2026_03_11_000002_add_performance_indexes',1),(74,'2026_03_11_000003_add_webhook_secret_to_carrier_accounts',1),(75,'2026_03_11_000004_add_paypal_pending_order_id_to_shipments',1),(76,'2026_03_25_000001_add_last_seen_at_to_users_table',1),(77,'2026_03_28_000001_create_in_app_notifications_table',1),(78,'2026_04_04_000001_remove_orphaned_permissions',1),(79,'2026_04_05_000001_create_enterprise_module_tables',1),(80,'2026_04_06_000001_add_manifest_id_to_shipments',1),(81,'2026_04_06_000001_create_chat_messages_table',1),(82,'2026_04_08_000001_sync_roles_and_permissions',1),(89,'2026_04_10_100001_create_origin_pickups_table',1),(90,'2026_04_10_200001_create_commissions_table',1),(91,'2026_04_10_300001_add_photos_to_inventory_tables',1),(92,'2026_04_10_400001_create_contracts_table',1),(93,'2026_04_11_500001_add_file_paths_to_contracts_table',1),(94,'2026_04_11_600001_add_signature_path_to_contracts_table',1),(95,'2026_04_11_700001_add_fields_to_commission_rules_table',1),(96,'2026_01_26_191630_create_manifests_table',2),(97,'2026_04_08_000002_create_proof_of_deliveries_table',2),(98,'2026_04_08_000003_create_hs_codes_table',2),(99,'2026_04_08_000004_create_customs_declarations_table',2),(100,'2026_04_08_000005_create_import_jobs_table',2),(101,'2026_04_08_000006_create_return_shipments_table',2),(102,'2026_04_08_000007_add_cod_fields_to_shipments_table',2),(103,'2026_04_09_000001_create_idempotency_keys_table',2),(104,'2026_04_12_100001_extend_commissions_for_lifecycle',2),(105,'2026_04_12_200001_add_indexes_to_audit_logs',2),(106,'2026_04_12_200002_add_performance_indexes_phase9',2),(107,'2026_04_12_300001_create_shipment_exception_reasons_table',2),(108,'2026_04_13_100001_add_lifecycle_states_and_enums',2),(109,'2026_04_14_100001_add_invoice_number_to_shipments_table',2),(110,'2026_04_17_200001_create_lockers_table',2),(111,'2026_04_17_300001_create_pre_alerts_table',2),(112,'2026_04_17_300002_create_pre_alert_attachments_table',2),(113,'2026_04_17_400001_add_locker_and_pre_alert_to_shipments',2),(114,'2026_04_17_400002_add_shipment_id_to_inventory_movements',2),(115,'2026_04_17_500001_make_inventory_movements_item_id_nullable',3),(116,'2026_04_18_000001_fix_customer_role_permissions',4),(117,'2026_04_18_000002_add_module_permissions',5),(118,'2026_04_19_000001_cleanup_orphaned_permissions',6),(119,'2026_04_19_000002_add_missing_module_permissions',7),(120,'2026_04_17_100001_add_driver_assignment_to_origin_pickups',99),(121,'2026_04_17_600001_add_invitation_fields_to_users_table',99),(122,'2026_02_12_000001_create_departments_table',100),(123,'2026_02_12_000002_add_department_id_to_users_table',100),(124,'2026_04_19_100001_add_two_factor_enabled_to_users_table',100),(125,'2026_04_20_000001_create_customer_contacts_table',101),(126,'2026_04_22_000001_add_pre_alert_number_to_pre_alerts_table',102),(127,'2026_04_24_000001_add_recipient_id_to_chat_messages',103);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `model_has_permissions`
--

DROP TABLE IF EXISTS `model_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `model_has_permissions`
--

LOCK TABLES `model_has_permissions` WRITE;
/*!40000 ALTER TABLE `model_has_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `model_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `model_has_roles`
--

DROP TABLE IF EXISTS `model_has_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_roles` (
  `role_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `model_has_roles`
--

LOCK TABLES `model_has_roles` WRITE;
/*!40000 ALTER TABLE `model_has_roles` DISABLE KEYS */;
INSERT INTO `model_has_roles` VALUES (5,'App\\Models\\User',1);
/*!40000 ALTER TABLE `model_has_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_channels`
--

DROP TABLE IF EXISTS `notification_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_channels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `channel_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `config` json NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_channels_organization_id_channel_type_index` (`organization_id`,`channel_type`),
  CONSTRAINT `notification_channels_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_channels`
--

LOCK TABLES `notification_channels` WRITE;
/*!40000 ALTER TABLE `notification_channels` DISABLE KEYS */;
INSERT INTO `notification_channels` VALUES (1,1,'twilio','Twilio',NULL,'active','{\"sid\": null, \"token\": null, \"sms_from\": null, \"whatsapp_from\": null}','2026-04-19 07:17:37','2026-04-19 07:17:37'),(2,1,'smtp','Default SMTP',NULL,'active','{\"host\": \"\", \"port\": \"2525\", \"password\": \"\", \"username\": \"admin@yourcompany.com\", \"from_name\": \"Your Company\", \"encryption\": \"tls\", \"from_email\": \"noreply@yourcompany.com\"}','2026-04-25 01:30:39','2026-04-25 08:00:55');
/*!40000 ALTER TABLE `notification_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_logs`
--

DROP TABLE IF EXISTS `notification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `channel_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `to` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` json NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_response` json DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_logs_organization_id_created_at_index` (`organization_id`,`created_at`),
  CONSTRAINT `notification_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_logs`
--

LOCK TABLES `notification_logs` WRITE;
/*!40000 ALTER TABLE `notification_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_rules`
--

DROP TABLE IF EXISTS `notification_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `event_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `channels` json DEFAULT NULL,
  `recipients` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_rules_organization_id_event_key_unique` (`organization_id`,`event_key`),
  CONSTRAINT `notification_rules_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_rules`
--

LOCK TABLES `notification_rules` WRITE;
/*!40000 ALTER TABLE `notification_rules` DISABLE KEYS */;
INSERT INTO `notification_rules` VALUES (1,1,'shipment_created','[\"email\"]',NULL,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(2,1,'out_for_delivery','[\"email\"]',NULL,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(3,1,'delivered','[\"email\"]',NULL,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(4,1,'exception','[\"email\"]',NULL,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(5,1,'shipment_in_transit','[\"email\"]',NULL,0,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(6,1,'awaiting_payment','[\"email\"]',NULL,0,'2026-04-17 01:02:04','2026-04-17 01:02:04');
/*!40000 ALTER TABLE `notification_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_templates`
--

DROP TABLE IF EXISTS `notification_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `channel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `language` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
  `design_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_chan_evt_lang_unique` (`organization_id`,`channel`,`event_key`,`language`),
  CONSTRAINT `notification_templates_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_templates`
--

LOCK TABLES `notification_templates` WRITE;
/*!40000 ALTER TABLE `notification_templates` DISABLE KEYS */;
INSERT INTO `notification_templates` VALUES (1,1,'email','shipment_created','es','html','Tu envío ha sido registrado — {{tracking_number}}','Hola {{customer_name}},\n\nTu envío ha sido creado exitosamente en Your Company.\n\n📦 Número de guía: {{tracking_number}}\n📍 Origen: {{origin}}\n📍 Destino: {{destination}}\n🚚 Servicio: {{service_name}}\n\nPuedes rastrear tu paquete en cualquier momento usando tu número de guía.\n\nGracias por confiar en Your Company.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(2,1,'email','shipment_created','en','classic','Your shipment has been registered — {{tracking_number}}','<table style=\"border: 1px solid #000;\"><tbody><tr><td data-row=\"1\"><span style=\"background-color: rgb(255, 255, 255); color: rgb(51, 51, 51);\"><img src=\"\" alt=\"Logo\"></span></td><td data-row=\"1\" class=\"ql-align-right\"><strong style=\"color: rgb(79, 70, 229); background-color: rgb(255, 255, 255);\">SHIPMENT&nbsp;NOTIFICATION</strong></td></tr></tbody></table><h3><span style=\"color: rgb(0, 0, 0);\">Dear&nbsp;{{customer_name}},</span></h3><p><span style=\"color: rgb(51, 51, 51);\">Your&nbsp;package&nbsp;with&nbsp;tracking&nbsp;number&nbsp;</span><strong style=\"color: rgb(51, 51, 51);\">{{tracking_number}}</strong><span style=\"color: rgb(51, 51, 51);\">&nbsp;has&nbsp;been&nbsp;updated.</span></p><table style=\"border: 1px solid #000;\"><tbody><tr><td data-row=\"1\"><strong style=\"background-color: rgb(248, 248, 248); color: rgb(51, 51, 51);\">Current&nbsp;Status</strong></td><td data-row=\"1\"><span style=\"background-color: rgb(248, 248, 248); color: rgb(51, 51, 51);\">{{status}}</span></td></tr><tr><td data-row=\"2\"><strong style=\"color: rgb(51, 51, 51);\">Date</strong></td><td data-row=\"2\"><span style=\"color: rgb(51, 51, 51);\">{{date}}</span></td></tr></tbody></table><p><span style=\"color: rgb(51, 51, 51);\">You&nbsp;can&nbsp;track&nbsp;the&nbsp;progress&nbsp;of&nbsp;your&nbsp;delivery&nbsp;at&nbsp;any&nbsp;time:</span></p><p><u style=\"color: rgb(79, 70, 229);\"><a href=\"{{tracking_url}}\" rel=\"noopener noreferrer\" target=\"_blank\">{{tracking_url}}</a></u></p><p><span style=\"color: rgb(153, 153, 153);\">This&nbsp;is&nbsp;an&nbsp;automated&nbsp;message.&nbsp;Please&nbsp;do&nbsp;not&nbsp;reply.</span></p>',1,'2026-04-17 01:02:04','2026-04-25 03:10:45'),(3,1,'email','out_for_delivery','es','html','Tu paquete está en camino — {{tracking_number}}','Hola {{customer_name}},\n\n¡Buenas noticias! Tu paquete está en camino y será entregado hoy.\n\n📦 Número de guía: {{tracking_number}}\n📍 Dirección de entrega: {{destination}}\n🕐 Fecha estimada: {{estimated_date}}\n\nAsegúrate de estar disponible para recibir tu paquete.\n\nTu Equipo de Logística.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(4,1,'email','out_for_delivery','en','html','Your package is out for delivery — {{tracking_number}}','<p>Hello&nbsp;{{customer_name}},&nbsp;Great&nbsp;news!&nbsp;Your&nbsp;package&nbsp;is&nbsp;on&nbsp;its&nbsp;way&nbsp;and&nbsp;will&nbsp;be&nbsp;delivered&nbsp;today.&nbsp;📦&nbsp;Tracking&nbsp;number:&nbsp;{{tracking_number}}&nbsp;📍&nbsp;Delivery&nbsp;address:&nbsp;{{destination}}&nbsp;🕐&nbsp;Estimated&nbsp;date:&nbsp;{{estimated_date}}&nbsp;Please&nbsp;make&nbsp;sure&nbsp;someone&nbsp;is&nbsp;available&nbsp;to&nbsp;receive&nbsp;your&nbsp;package.&nbsp;DEPRIXA&nbsp;PLUS&nbsp;Team.</p>',1,'2026-04-17 01:02:04','2026-04-25 03:10:51'),(5,1,'email','delivered','es','html','¡Tu paquete fue entregado! — {{tracking_number}}','Hola {{customer_name}},\n\nTu paquete ha sido entregado exitosamente. ✅\n\n📦 Número de guía: {{tracking_number}}\n📍 Entregado en: {{destination}}\n📅 Fecha de entrega: {{delivered_at}}\n\nSi tienes alguna pregunta sobre tu envío, no dudes en contactarnos.\n\nGracias por tu preferencia,\nTu Equipo de Logística.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(6,1,'email','delivered','en','html','Your package has been delivered! — {{tracking_number}}','Hello {{customer_name}},\n\nYour package has been successfully delivered. ✅\n\n📦 Tracking number: {{tracking_number}}\n📍 Delivered to: {{destination}}\n📅 Delivery date: {{delivered_at}}\n\nIf you have any questions about your shipment, please don\'t hesitate to contact us.\n\nThank you for your business,\nYour Company Team.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(7,1,'email','exception','es','html','Alerta: Problema con tu envío — {{tracking_number}}','Hola {{customer_name}},\n\nHemos detectado un inconveniente con tu envío y queremos informarte.\n\n📦 Número de guía: {{tracking_number}}\n⚠️ Estado: {{status}}\n📝 Detalle: {{exception_reason}}\n\nNuestro equipo está trabajando para resolver la situación a la brevedad. Te contactaremos con una actualización pronto.\n\nSi tienes preguntas urgentes, escríbenos directamente.\n\nTu Equipo de Logística.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(8,1,'email','exception','en','html','Alert: Issue with your shipment — {{tracking_number}}','Hello {{customer_name}},\n\nWe have detected an issue with your shipment and want to keep you informed.\n\n📦 Tracking number: {{tracking_number}}\n⚠️ Status: {{status}}\n📝 Details: {{exception_reason}}\n\nOur team is working to resolve the situation as quickly as possible. We will contact you with an update soon.\n\nIf you have urgent questions, please reach out to us directly.\n\nYour Company Team.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(9,1,'email','shipment_in_transit','es','html','Tu envío está en tránsito — {{tracking_number}}','Hola {{customer_name}},\n\nTu paquete ya está en tránsito hacia su destino.\n\n📦 Número de guía: {{tracking_number}}\n📍 Destino: {{destination}}\n🚚 Servicio: {{service_name}}\n🕐 Entrega estimada: {{estimated_date}}\n\nTu Equipo de Logística.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(10,1,'email','shipment_in_transit','en','html','Your shipment is in transit — {{tracking_number}}','Hello {{customer_name}},\n\nYour package is now in transit to its destination.\n\n📦 Tracking number: {{tracking_number}}\n📍 Destination: {{destination}}\n🚚 Service: {{service_name}}\n🕐 Estimated delivery: {{estimated_date}}\n\nYour Company Team.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(11,1,'email','awaiting_payment','es','html','Pago pendiente para tu envío — {{tracking_number}}','Hola {{customer_name}},\n\nTu envío está pendiente de pago para ser procesado.\n\n📦 Número de guía: {{tracking_number}}\n💰 Monto: {{amount}} {{currency}}\n\nPor favor realiza el pago para continuar con el proceso de envío. Si ya realizaste el pago, ignora este mensaje.\n\nTu Equipo de Logística.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(12,1,'email','awaiting_payment','en','html','Payment pending for your shipment — {{tracking_number}}','Hello {{customer_name}},\n\nYour shipment is awaiting payment before it can be processed.\n\n📦 Tracking number: {{tracking_number}}\n💰 Amount: {{amount}} {{currency}}\n\nPlease complete the payment to proceed with your shipment. If you have already paid, please disregard this message.\n\nYour Company Team.',1,'2026-04-17 01:02:04','2026-04-17 01:02:04');
/*!40000 ALTER TABLE `notification_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `numbering_sequences`
--

DROP TABLE IF EXISTS `numbering_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `numbering_sequences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `suffix` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `next_number` bigint unsigned NOT NULL DEFAULT '1',
  `padding` tinyint unsigned NOT NULL DEFAULT '8',
  `reset_rule` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'never',
  `last_reset_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numbering_sequences_organization_id_type_unique` (`organization_id`,`type`),
  CONSTRAINT `numbering_sequences_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `numbering_sequences`
--

LOCK TABLES `numbering_sequences` WRITE;
/*!40000 ALTER TABLE `numbering_sequences` DISABLE KEYS */;
INSERT INTO `numbering_sequences` VALUES (1,1,'tracking','TRK','',7,8,'never',NULL,'2026-04-17 01:02:04','2026-05-03 21:16:27'),(2,1,'invoice','INV-','',7,6,'never',NULL,'2026-04-17 01:02:04','2026-05-03 21:16:28');
/*!40000 ALTER TABLE `numbering_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_settings`
--

DROP TABLE IF EXISTS `organization_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `group` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organization_settings_organization_id_group_key_unique` (`organization_id`,`group`,`key`),
  KEY `organization_settings_group_index` (`group`),
  CONSTRAINT `organization_settings_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_settings`
--

LOCK TABLES `organization_settings` WRITE;
/*!40000 ALTER TABLE `organization_settings` DISABLE KEYS */;
INSERT INTO `organization_settings` VALUES (1,1,'shipping_config','weight_unit','\"lb\"','2026-04-17 01:02:03','2026-04-25 08:14:48'),(2,1,'shipping_config','dimension_unit','\"cm\"','2026-04-17 01:02:03','2026-04-17 01:02:03'),(3,1,'shipping_config','volumetric_divisor','5000','2026-04-17 01:02:03','2026-04-17 01:02:03'),(4,1,'shipping_config','tax_rate','0','2026-04-17 01:02:03','2026-04-17 01:02:03'),(5,1,'shipping_config','tax_name','\"Tax\"','2026-04-17 01:02:03','2026-04-17 01:02:03'),(6,1,'shipping_config','fuel_surcharge_percent','0','2026-04-17 01:02:03','2026-04-17 01:02:03'),(7,1,'shipping_config','insurance_percent','0','2026-04-17 01:02:03','2026-04-17 01:02:03'),(8,1,'shipping_config','base_surcharge','0','2026-04-17 01:02:03','2026-04-17 01:02:03'),(9,1,'shipping_config','default_base_price','5','2026-04-17 01:02:03','2026-04-17 01:02:03'),(10,1,'shipping_config','default_price_per_kg','2.99','2026-04-17 01:02:03','2026-04-17 01:02:03'),(11,1,'locale','currency','\"USD\"','2026-04-17 01:02:03','2026-04-17 01:02:03'),(12,1,'locale','language','\"en\"','2026-04-17 01:02:03','2026-04-25 07:37:36'),(13,1,'locale','timezone','\"UTC\"','2026-04-17 01:02:03','2026-04-25 07:37:36'),(14,1,'locale','date_format','\"d\\/m\\/Y\"','2026-04-17 01:02:04','2026-04-25 07:37:36'),(15,1,'locale','time_format','\"12h\"','2026-04-17 01:02:04','2026-04-25 07:37:36'),(16,1,'locale','weight_unit','\"kg\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(17,1,'locale','dimension_unit','\"cm\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(18,1,'company','name','\"Your Company\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(19,1,'company','legal_name','\"Your Company\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(20,1,'company','tax_id','\"\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(21,1,'company','email','\"info@yourcompany.com\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(22,1,'company','phone','\"+1 800 000 0000\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(23,1,'company','website','\"\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(24,1,'company','address','\"123 Main Street\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(25,1,'company','city','\"Medell\\u00edn\"','2026-04-17 01:02:04','2026-04-25 08:39:05'),(26,1,'company','state','\"NY\"','2026-04-17 01:02:04','2026-04-25 08:39:05'),(27,1,'company','country','\"Colombia\"','2026-04-17 01:02:04','2026-04-25 08:39:05'),(28,1,'billing','tax_rate','0','2026-04-17 01:02:04','2026-04-17 01:02:04'),(29,1,'billing','tax_name','\"Tax\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(30,1,'billing','currency','\"USD\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(31,1,'billing','invoice_terms','\"Payment is due upon receipt.\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(32,1,'billing','footer_notes','\"Thank you for your business.\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(33,1,'billing','invoice_theme','\"fedex\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(34,1,'billing','stripe_enabled','\"0\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(35,1,'billing','stripe_test_mode','\"1\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(36,1,'billing','paypal_enabled','\"0\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(37,1,'billing','paypal_test_mode','\"1\"','2026-04-17 01:02:04','2026-04-17 01:02:04'),(38,1,'pricing','volumetric_divisor','5000','2026-04-17 01:02:04','2026-04-17 01:02:04'),(39,1,'pricing','fuel_surcharge_percent','0','2026-04-17 01:02:04','2026-04-17 01:02:04'),(40,1,'pricing','insurance_percent','0','2026-04-17 01:02:04','2026-04-17 01:02:04'),(41,1,'pricing','base_surcharge','0','2026-04-17 01:02:04','2026-04-17 01:02:04'),(42,1,'security','session_timeout_minutes','60','2026-04-17 01:02:04','2026-04-17 01:02:04'),(43,1,'security','require_2fa_admin','false','2026-04-17 01:02:04','2026-04-17 01:02:04'),(44,1,'security','password_expiry_days','0','2026-04-17 01:02:04','2026-04-25 08:01:12'),(45,1,'security','allow_google_login','false','2026-04-17 01:02:04','2026-04-17 01:02:04'),(46,1,'security','ip_whitelist','','2026-04-17 01:02:04','2026-04-17 01:02:04'),(47,1,'ai','provider','null','2026-04-17 01:02:04','2026-04-17 01:02:04'),(48,1,'ai','api_key','null','2026-04-17 01:02:04','2026-04-17 01:02:04'),(49,1,'ai','model','null','2026-04-17 01:02:04','2026-04-17 01:02:04'),(50,1,'public_calculator','enabled','true','2026-04-17 01:02:04','2026-04-17 01:02:04'),(51,1,'lockers','code_prefix','\"LCK\"','2026-04-21 03:00:58','2026-04-21 03:00:58'),(52,1,'lockers','code_format','\"random\"','2026-04-21 03:00:58','2026-04-21 08:28:18'),(53,1,'lockers','code_length','6','2026-04-21 03:00:58','2026-04-21 03:00:58'),(54,1,'labels','paper_size','\"4x6\"','2026-04-25 08:37:53','2026-04-25 08:37:53'),(55,1,'labels','output_format','\"pdf\"','2026-04-25 08:37:53','2026-04-25 08:37:53'),(56,1,'labels','barcode_type','\"code128\"','2026-04-25 08:37:53','2026-04-25 08:37:53'),(57,1,'labels','theme','\"fedex\"','2026-04-25 08:37:53','2026-04-25 08:37:53'),(58,1,'labels','show_logo','true','2026-04-25 08:37:53','2026-04-25 08:37:53'),(59,1,'labels','show_phone','false','2026-04-25 08:37:53','2026-04-25 08:37:53');
/*!40000 ALTER TABLE `organization_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `legal_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sublogo_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settings` json NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city_id` bigint unsigned DEFAULT NULL,
  `state` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_id` bigint unsigned DEFAULT NULL,
  `country` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_id` bigint unsigned DEFAULT NULL,
  `primary_color` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#4F46E5',
  `secondary_color` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accent_color` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_font` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_font` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_font_size` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '16px',
  `layout_density` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `card_skin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'shadow',
  `layout_background` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'oklch(92.9% .013 255.508)',
  `sidebar_menu_order` json DEFAULT NULL,
  `notification_style` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'toast',
  `notification_group_style` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stacked',
  `notification_max_count` tinyint unsigned NOT NULL DEFAULT '4',
  `monochrome_mode` tinyint(1) NOT NULL DEFAULT '0',
  `notification_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'top-right',
  `notification_duration` int NOT NULL DEFAULT '5000',
  `login_welcome_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `login_form_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'right',
  `login_visible_fields` json DEFAULT NULL,
  `favicon_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_logo_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_image_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ui_theme` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `sidebar_compact` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_slug_unique` (`slug`),
  UNIQUE KEY `organizations_domain_unique` (`domain`),
  KEY `organizations_country_id_index` (`country_id`),
  KEY `organizations_state_id_index` (`state_id`),
  KEY `organizations_city_id_index` (`city_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizations`
--

LOCK TABLES `organizations` WRITE;
/*!40000 ALTER TABLE `organizations` DISABLE KEYS */;
INSERT INTO `organizations` VALUES (1,'Your Company',NULL,'Your Company',NULL,'deprixa-plus',NULL,NULL,NULL,'{\"currency\": \"USD\", \"language\": \"en\", \"timezone\": \"America/Bogota\", \"date_format\": \"d/m/Y\", \"weight_unit\": \"lb\", \"dimension_unit\": \"cm\"}','info@yourcompany.com','+1 800 000 0000','123 Main Street','New York',NULL,'NY',NULL,'Colombia',NULL,'#4F46E5','#A78BFA','#C4B5FD','Inter','Inter','16px','normal','bordered','oklch(98.5% 0.002 247.839)',NULL,'toast','stacked',4,0,'top-right',5000,'Welcome to our professional logistics platform','right','[\"email\", \"password\", \"remember\"]',NULL,NULL,NULL,'system',0,1,'2026-04-06 00:00:00','2026-04-25 08:39:05',NULL);
/*!40000 ALTER TABLE `organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `origin_pickups`
--

DROP TABLE IF EXISTS `origin_pickups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `origin_pickups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `shipment_id` bigint unsigned NOT NULL,
  `requested_by` bigint unsigned NOT NULL,
  `confirmed_by` bigint unsigned DEFAULT NULL,
  `driver_id` bigint unsigned DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT NULL,
  `driver_notified_at` timestamp NULL DEFAULT NULL,
  `scheduled_for` datetime NOT NULL,
  `contact_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pickup_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `special_instructions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `photos` json DEFAULT NULL,
  `status` enum('pending','confirmed','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `confirmed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `origin_pickups_requested_by_foreign` (`requested_by`),
  KEY `origin_pickups_confirmed_by_foreign` (`confirmed_by`),
  KEY `origin_pickups_organization_id_status_index` (`organization_id`,`status`),
  KEY `origin_pickups_shipment_id_index` (`shipment_id`),
  KEY `origin_pickups_driver_id_index` (`driver_id`),
  CONSTRAINT `origin_pickups_confirmed_by_foreign` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `origin_pickups_driver_id_foreign` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `origin_pickups_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `origin_pickups_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `origin_pickups_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `origin_pickups`
--

LOCK TABLES `origin_pickups` WRITE;
/*!40000 ALTER TABLE `origin_pickups` DISABLE KEYS */;
/*!40000 ALTER TABLE `origin_pickups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `receipt_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payments_organization_id_foreign` (`organization_id`),
  KEY `payments_created_by_foreign` (`created_by`),
  KEY `payments_shipment_id_organization_id_index` (`shipment_id`,`organization_id`),
  KEY `payments_method_index` (`method`),
  CONSTRAINT `payments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `guard_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'view dashboard',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(2,'dashboard.kpi.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(3,'dashboard.revenue.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(4,'dashboard.analytics.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(5,'dashboard.map.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(6,'dashboard.activity.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(9,'manage shipments',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(10,'create shipments',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(11,'edit shipments',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(12,'delete shipments',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(13,'change status shipments',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(14,'dispatch.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(15,'dispatch.create',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(16,'dispatch.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(17,'dispatch.delete',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(18,'tracking.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(19,'settings.company.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(20,'settings.company.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(21,'settings.branding.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(22,'settings.branding.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(23,'settings.locale.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(24,'settings.locale.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(25,'settings.users.list',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(26,'settings.users.create',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(27,'settings.users.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(28,'settings.users.delete',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(29,'settings.roles.list',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(30,'settings.roles.manage',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(31,'settings.security.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(32,'settings.security.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(33,'settings.branches.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(34,'settings.branches.store',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(35,'settings.branches.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(36,'settings.branches.destroy',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(37,'settings.departments.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(38,'settings.departments.store',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(39,'settings.departments.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(40,'settings.departments.destroy',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(41,'settings.tracking.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(42,'settings.tracking.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(43,'settings.pricing.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(44,'settings.pricing.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(45,'settings.billing.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(46,'settings.billing.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(47,'settings.shipping-config.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(48,'settings.shipping-config.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(49,'settings.integrations.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(50,'settings.integrations.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(51,'settings.notifications.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(52,'settings.notifications.update',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(53,'settings.audit.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(54,'settings.maintenance.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(55,'settings.maintenance.manage',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(61,'warehouse.access',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(62,'dispatch.access',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(63,'customers.access',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(64,'customers.create',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(65,'customers.delete',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(66,'reports.financial.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(67,'finance.view',NULL,'web','2026-04-07 01:33:08','2026-04-07 01:33:08'),(68,'manage pricing',NULL,'web','2026-04-07 01:33:09','2026-04-07 01:33:09'),(74,'pod.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(75,'pod.create',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(76,'customs.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(77,'customs.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(78,'settings.hs-codes.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(79,'settings.hs-codes.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(80,'shipments.import',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(81,'returns.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(82,'returns.create',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(83,'returns.update',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(84,'cod.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(85,'cod.collect',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(86,'cod.remit',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(87,'pickups.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(88,'pickups.create',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(89,'pickups.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(90,'pre-alerts.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(91,'pre-alerts.create',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(92,'pre-alerts.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(93,'lockers.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(94,'lockers.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(95,'commissions.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(96,'commissions.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(97,'contracts.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(98,'contracts.create',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(99,'contracts.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(100,'locations.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(101,'locations.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(102,'settings.shipment-statuses.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(103,'settings.shipment-statuses.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(104,'settings.services.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(105,'settings.services.manage',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(106,'settings.updates.view',NULL,'web','2026-04-20 03:33:28','2026-04-20 03:33:28'),(107,'pickups.complete',NULL,'web','2026-05-04 06:53:43','2026-05-04 06:53:43'),(108,'shipments.view',NULL,'web','2026-05-04 06:53:43','2026-05-04 06:53:43'),(109,'customer.portal',NULL,'web','2026-05-04 16:30:50','2026-05-04 16:30:50');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` json DEFAULT NULL,
  `scopes` json DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `rate_limit_per_minute` int DEFAULT NULL,
  `rate_limit_per_hour` int DEFAULT NULL,
  `rate_limit_per_day` int DEFAULT NULL,
  `ip_whitelist` json DEFAULT NULL,
  `request_count` bigint unsigned NOT NULL DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `last_request_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_organization_id_index` (`organization_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pre_alert_attachments`
--

DROP TABLE IF EXISTS `pre_alert_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pre_alert_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pre_alert_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `type` enum('purchase_invoice','product_photo','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'purchase_invoice',
  `path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` bigint unsigned DEFAULT NULL,
  `invoice_parsed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pre_alert_attachments_pre_alert_id_type_index` (`pre_alert_id`,`type`),
  KEY `pre_alert_attachments_organization_id_foreign` (`organization_id`),
  CONSTRAINT `pre_alert_attachments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pre_alert_attachments_pre_alert_id_foreign` FOREIGN KEY (`pre_alert_id`) REFERENCES `pre_alerts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pre_alert_attachments`
--

LOCK TABLES `pre_alert_attachments` WRITE;
/*!40000 ALTER TABLE `pre_alert_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `pre_alert_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pre_alerts`
--

DROP TABLE IF EXISTS `pre_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pre_alerts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pre_alert_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Human-readable pre-alert number, e.g. PA-2026-00001',
  `organization_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `locker_id` bigint unsigned DEFAULT NULL,
  `store_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_tracking_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `declared_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `declared_currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `declared_weight_kg` decimal(8,2) DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `invoice_data` json DEFAULT NULL,
  `status` enum('pending','received','processing','converted','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `received_at` timestamp NULL DEFAULT NULL,
  `converted_at` timestamp NULL DEFAULT NULL,
  `shipment_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pre_alerts_organization_id_status_index` (`organization_id`,`status`),
  KEY `pre_alerts_organization_id_customer_id_index` (`organization_id`,`customer_id`),
  KEY `pre_alerts_organization_id_locker_id_index` (`organization_id`,`locker_id`),
  KEY `pre_alerts_store_tracking_number_index` (`store_tracking_number`),
  KEY `pre_alerts_customer_id_foreign` (`customer_id`),
  KEY `pre_alerts_locker_id_foreign` (`locker_id`),
  KEY `pre_alerts_shipment_id_foreign` (`shipment_id`),
  KEY `pre_alerts_organization_id_pre_alert_number_index` (`organization_id`,`pre_alert_number`),
  CONSTRAINT `pre_alerts_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pre_alerts_locker_id_foreign` FOREIGN KEY (`locker_id`) REFERENCES `lockers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pre_alerts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pre_alerts_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pre_alerts`
--

LOCK TABLES `pre_alerts` WRITE;
/*!40000 ALTER TABLE `pre_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `pre_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proof_of_deliveries`
--

DROP TABLE IF EXISTS `proof_of_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proof_of_deliveries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `recipient_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_id_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `photos` json DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `delivered_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `proof_of_deliveries_created_by_foreign` (`created_by`),
  KEY `proof_of_deliveries_shipment_id_index` (`shipment_id`),
  KEY `proof_of_deliveries_organization_id_index` (`organization_id`),
  CONSTRAINT `proof_of_deliveries_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proof_of_deliveries_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `proof_of_deliveries_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proof_of_deliveries`
--

LOCK TABLES `proof_of_deliveries` WRITE;
/*!40000 ALTER TABLE `proof_of_deliveries` DISABLE KEYS */;
/*!40000 ALTER TABLE `proof_of_deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_cards`
--

DROP TABLE IF EXISTS `rate_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_cards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `chargeable_weight_rule` enum('actual','volumetric','max') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'max',
  `volumetric_divisor` int DEFAULT '5000',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `rate_cards_organization_id_active_index` (`organization_id`,`active`),
  CONSTRAINT `rate_cards_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_cards`
--

LOCK TABLES `rate_cards` WRITE;
/*!40000 ALTER TABLE `rate_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `rate_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_rules`
--

DROP TABLE IF EXISTS `rate_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `rate_card_id` bigint unsigned NOT NULL,
  `rate_zone_id` bigint unsigned NOT NULL,
  `service_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Standard',
  `min_weight` decimal(10,2) NOT NULL DEFAULT '0.00',
  `max_weight` decimal(10,2) NOT NULL,
  `price_per_lb` decimal(10,2) DEFAULT NULL,
  `price_per_kg` decimal(10,2) DEFAULT NULL,
  `flat_price` decimal(10,2) DEFAULT NULL,
  `min_charge` decimal(10,2) DEFAULT NULL,
  `fuel_surcharge_percent` decimal(5,2) DEFAULT '0.00',
  `insurance_percent` decimal(5,2) DEFAULT '0.00',
  `tax_percent` decimal(5,2) DEFAULT '0.00',
  `handling_fee` decimal(10,2) DEFAULT '0.00',
  `rounding_rule` enum('none','ceil','floor','nearest') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `rate_rules_rate_card_id_foreign` (`rate_card_id`),
  KEY `rate_rules_rate_zone_id_foreign` (`rate_zone_id`),
  KEY `rate_rules_organization_id_rate_card_id_rate_zone_id_index` (`organization_id`,`rate_card_id`,`rate_zone_id`),
  KEY `rate_rules_min_weight_max_weight_index` (`min_weight`,`max_weight`),
  CONSTRAINT `rate_rules_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rate_rules_rate_card_id_foreign` FOREIGN KEY (`rate_card_id`) REFERENCES `rate_cards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rate_rules_rate_zone_id_foreign` FOREIGN KEY (`rate_zone_id`) REFERENCES `rate_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4863 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_rules`
--

LOCK TABLES `rate_rules` WRITE;
/*!40000 ALTER TABLE `rate_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `rate_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_zones`
--

DROP TABLE IF EXISTS `rate_zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_zones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `origin_country_id` bigint unsigned NOT NULL,
  `origin_any` tinyint(1) NOT NULL DEFAULT '0',
  `origin_state_id` bigint unsigned DEFAULT NULL,
  `origin_city_id` bigint unsigned DEFAULT NULL,
  `dest_country_id` bigint unsigned NOT NULL,
  `dest_any` tinyint(1) NOT NULL DEFAULT '0',
  `dest_state_id` bigint unsigned DEFAULT NULL,
  `dest_city_id` bigint unsigned DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `rate_zones_origin_state_id_foreign` (`origin_state_id`),
  KEY `rate_zones_origin_city_id_foreign` (`origin_city_id`),
  KEY `rate_zones_dest_country_id_foreign` (`dest_country_id`),
  KEY `rate_zones_dest_state_id_foreign` (`dest_state_id`),
  KEY `rate_zones_dest_city_id_foreign` (`dest_city_id`),
  KEY `rate_zones_organization_id_active_index` (`organization_id`,`active`),
  KEY `rate_zones_origin_country_id_dest_country_id_index` (`origin_country_id`,`dest_country_id`),
  CONSTRAINT `rate_zones_dest_city_id_foreign` FOREIGN KEY (`dest_city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `rate_zones_dest_country_id_foreign` FOREIGN KEY (`dest_country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `rate_zones_dest_state_id_foreign` FOREIGN KEY (`dest_state_id`) REFERENCES `states` (`id`),
  CONSTRAINT `rate_zones_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rate_zones_origin_city_id_foreign` FOREIGN KEY (`origin_city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `rate_zones_origin_country_id_foreign` FOREIGN KEY (`origin_country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `rate_zones_origin_state_id_foreign` FOREIGN KEY (`origin_state_id`) REFERENCES `states` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_zones`
--

LOCK TABLES `rate_zones` WRITE;
/*!40000 ALTER TABLE `rate_zones` DISABLE KEYS */;
/*!40000 ALTER TABLE `rate_zones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_shipments`
--

DROP TABLE IF EXISTS `return_shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_shipments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `original_shipment_id` bigint unsigned NOT NULL,
  `return_shipment_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `return_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `return_status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `refund_method` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_shipments_return_number_unique` (`return_number`),
  KEY `return_shipments_return_shipment_id_foreign` (`return_shipment_id`),
  KEY `return_shipments_organization_id_status_index` (`organization_id`,`status`),
  KEY `return_shipments_original_shipment_id_index` (`original_shipment_id`),
  KEY `return_shipments_created_by_idx` (`created_by`),
  KEY `return_shipments_return_status_index` (`return_status`),
  CONSTRAINT `return_shipments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_shipments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_shipments_original_shipment_id_foreign` FOREIGN KEY (`original_shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_shipments_return_shipment_id_foreign` FOREIGN KEY (`return_shipment_id`) REFERENCES `shipments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_shipments`
--

LOCK TABLES `return_shipments` WRITE;
/*!40000 ALTER TABLE `return_shipments` DISABLE KEYS */;
/*!40000 ALTER TABLE `return_shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_has_permissions`
--

DROP TABLE IF EXISTS `role_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_has_permissions`
--

LOCK TABLES `role_has_permissions` WRITE;
/*!40000 ALTER TABLE `role_has_permissions` DISABLE KEYS */;
INSERT INTO `role_has_permissions` VALUES (1,1),(10,1),(18,1),(90,1),(91,1),(109,1),(1,2),(6,2),(13,2),(14,2),(18,2),(62,2),(87,2),(107,2),(108,2),(1,3),(2,3),(4,3),(5,3),(6,3),(9,3),(10,3),(11,3),(13,3),(14,3),(15,3),(18,3),(43,3),(61,3),(62,3),(63,3),(64,3),(74,3),(75,3),(76,3),(80,3),(81,3),(82,3),(83,3),(84,3),(85,3),(87,3),(88,3),(89,3),(90,3),(91,3),(92,3),(93,3),(100,3),(102,3),(104,3),(107,3),(108,3),(1,4),(2,4),(3,4),(4,4),(5,4),(6,4),(9,4),(10,4),(11,4),(12,4),(13,4),(14,4),(15,4),(16,4),(17,4),(18,4),(19,4),(20,4),(21,4),(22,4),(23,4),(24,4),(25,4),(26,4),(27,4),(28,4),(29,4),(30,4),(31,4),(32,4),(33,4),(34,4),(35,4),(36,4),(37,4),(38,4),(39,4),(40,4),(41,4),(42,4),(43,4),(44,4),(45,4),(46,4),(47,4),(48,4),(49,4),(50,4),(51,4),(52,4),(53,4),(61,4),(62,4),(63,4),(64,4),(65,4),(66,4),(67,4),(68,4),(74,4),(75,4),(76,4),(77,4),(78,4),(79,4),(80,4),(81,4),(82,4),(83,4),(84,4),(85,4),(86,4),(87,4),(88,4),(89,4),(90,4),(91,4),(92,4),(93,4),(94,4),(95,4),(96,4),(97,4),(98,4),(99,4),(100,4),(101,4),(102,4),(103,4),(104,4),(105,4),(107,4),(108,4),(1,5),(2,5),(3,5),(4,5),(5,5),(6,5),(9,5),(10,5),(11,5),(12,5),(13,5),(14,5),(15,5),(16,5),(17,5),(18,5),(19,5),(20,5),(21,5),(22,5),(23,5),(24,5),(25,5),(26,5),(27,5),(28,5),(29,5),(30,5),(31,5),(32,5),(33,5),(34,5),(35,5),(36,5),(37,5),(38,5),(39,5),(40,5),(41,5),(42,5),(43,5),(44,5),(45,5),(46,5),(47,5),(48,5),(49,5),(50,5),(51,5),(52,5),(53,5),(54,5),(55,5),(61,5),(62,5),(63,5),(64,5),(65,5),(66,5),(67,5),(68,5),(74,5),(75,5),(76,5),(77,5),(78,5),(79,5),(80,5),(81,5),(82,5),(83,5),(84,5),(85,5),(86,5),(87,5),(88,5),(89,5),(90,5),(91,5),(92,5),(93,5),(94,5),(95,5),(96,5),(97,5),(98,5),(99,5),(100,5),(101,5),(102,5),(103,5),(104,5),(105,5),(106,5),(107,5),(108,5),(109,5);
/*!40000 ALTER TABLE `role_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `guard_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'customer',NULL,'web','2026-04-07 01:33:09','2026-04-07 01:33:09'),(2,'Driver',NULL,'web','2026-04-07 01:33:09','2026-04-07 01:33:09'),(3,'Employee',NULL,'web','2026-04-07 01:33:09','2026-04-07 01:33:09'),(4,'admin',NULL,'web','2026-04-07 01:33:09','2026-04-07 01:33:09'),(5,'super-admin',NULL,'web','2026-04-07 01:33:09','2026-04-07 01:33:09');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_invoices`
--

DROP TABLE IF EXISTS `saas_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `subscription_id` bigint unsigned DEFAULT NULL,
  `invoice_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'subscription',
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_period_start` date DEFAULT NULL,
  `billing_period_end` date DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `due_at` timestamp NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saas_invoices_invoice_number_unique` (`invoice_number`),
  KEY `saas_invoices_subscription_id_foreign` (`subscription_id`),
  KEY `saas_invoices_organization_id_status_index` (`organization_id`,`status`),
  CONSTRAINT `saas_invoices_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saas_invoices_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `saas_subscriptions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_invoices`
--

LOCK TABLES `saas_invoices` WRITE;
/*!40000 ALTER TABLE `saas_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_plans`
--

DROP TABLE IF EXISTS `saas_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_monthly` decimal(10,2) NOT NULL DEFAULT '0.00',
  `price_quarterly` decimal(10,2) DEFAULT NULL,
  `price_semiannual` decimal(10,2) DEFAULT NULL,
  `price_annual` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `features` json DEFAULT NULL,
  `limits` json DEFAULT NULL,
  `trial_days` smallint unsigned NOT NULL DEFAULT '14',
  `grace_period_days` smallint unsigned NOT NULL DEFAULT '7',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saas_plans_slug_unique` (`slug`),
  KEY `saas_plans_is_active_sort_order_index` (`is_active`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_plans`
--

LOCK TABLES `saas_plans` WRITE;
/*!40000 ALTER TABLE `saas_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_subscriptions`
--

DROP TABLE IF EXISTS `saas_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `plan_id` bigint unsigned NOT NULL,
  `billing_cycle` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'trial',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `starts_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `grace_period_ends_at` timestamp NULL DEFAULT NULL,
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `last_renewed_at` timestamp NULL DEFAULT NULL,
  `auto_renew` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `saas_subscriptions_plan_id_foreign` (`plan_id`),
  KEY `saas_subscriptions_organization_id_status_index` (`organization_id`,`status`),
  KEY `saas_subscriptions_expires_at_status_index` (`expires_at`,`status`),
  CONSTRAINT `saas_subscriptions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saas_subscriptions_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `saas_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_subscriptions`
--

LOCK TABLES `saas_subscriptions` WRITE;
/*!40000 ALTER TABLE `saas_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_wallet_transactions`
--

DROP TABLE IF EXISTS `saas_wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_wallet_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `balance_before` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `performed_by` bigint unsigned DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `saas_wallet_transactions_wallet_id_type_index` (`wallet_id`,`type`),
  KEY `saas_wallet_transactions_organization_id_created_at_index` (`organization_id`,`created_at`),
  CONSTRAINT `saas_wallet_transactions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saas_wallet_transactions_wallet_id_foreign` FOREIGN KEY (`wallet_id`) REFERENCES `saas_wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_wallet_transactions`
--

LOCK TABLES `saas_wallet_transactions` WRITE;
/*!40000 ALTER TABLE `saas_wallet_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saas_wallets`
--

DROP TABLE IF EXISTS `saas_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saas_wallets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `last_recharged_at` timestamp NULL DEFAULT NULL,
  `last_debited_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saas_wallets_organization_id_unique` (`organization_id`),
  CONSTRAINT `saas_wallets_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saas_wallets`
--

LOCK TABLES `saas_wallets` WRITE;
/*!40000 ALTER TABLE `saas_wallets` DISABLE KEYS */;
/*!40000 ALTER TABLE `saas_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_price` decimal(10,2) NOT NULL DEFAULT '5.00' COMMENT 'Precio base del servicio',
  `price_per_kg` decimal(10,2) NOT NULL DEFAULT '2.00' COMMENT 'Precio por kilogramo',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD' COMMENT 'Moneda ISO 4217 del precio base',
  `estimated_days` int NOT NULL DEFAULT '3' COMMENT 'Días estimados de entrega para este servicio',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `services_org_code_unique` (`organization_id`,`code`),
  KEY `services_organization_id_is_active_index` (`organization_id`,`is_active`),
  CONSTRAINT `services_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,1,'Express Air','Fast air delivery — 1 to 3 business days.','express_air','air',15.00,3.99,'USD',2,1,1,'2026-04-17 01:02:04','2026-04-25 07:41:58'),(2,1,'Standard Air','Standard air freight — 3 to 5 business days.','standard_air','air',10.00,2.99,'USD',4,2,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(3,1,'Land Express','Express ground delivery — 2 to 4 business days.','land_express','land',8.00,1.99,'USD',3,3,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(4,1,'Ground Standard','Economy ground service — 5 to 10 business days.','ground_standard','land',5.00,1.49,'USD',7,4,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(5,1,'Economy Sea','Maritime freight — 15 to 30 business days.','economy_sea','sea',3.00,0.99,'USD',20,5,1,'2026-04-17 01:02:04','2026-04-17 01:02:04');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_activities`
--

DROP TABLE IF EXISTS `shipment_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_activities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_activities_user_id_foreign` (`user_id`),
  KEY `shipment_activities_shipment_id_created_at_index` (`shipment_id`,`created_at`),
  CONSTRAINT `shipment_activities_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_activities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_activities`
--

LOCK TABLES `shipment_activities` WRITE;
/*!40000 ALTER TABLE `shipment_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_attachments`
--

DROP TABLE IF EXISTS `shipment_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_attachments_organization_id_foreign` (`organization_id`),
  KEY `shipment_attachments_shipment_id_type_index` (`shipment_id`,`type`),
  CONSTRAINT `shipment_attachments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_attachments_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_attachments`
--

LOCK TABLES `shipment_attachments` WRITE;
/*!40000 ALTER TABLE `shipment_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_exception_reasons`
--

DROP TABLE IF EXISTS `shipment_exception_reasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_exception_reasons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_exception_reasons_organization_id_is_active_index` (`organization_id`,`is_active`),
  KEY `shipment_exception_reasons_slug_index` (`slug`),
  CONSTRAINT `shipment_exception_reasons_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_exception_reasons`
--

LOCK TABLES `shipment_exception_reasons` WRITE;
/*!40000 ALTER TABLE `shipment_exception_reasons` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_exception_reasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_histories`
--

DROP TABLE IF EXISTS `shipment_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_histories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_id` bigint unsigned NOT NULL,
  `status_id` bigint unsigned DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `user_id` bigint unsigned DEFAULT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_histories_shipment_id_foreign` (`shipment_id`),
  KEY `shipment_histories_user_id_foreign` (`user_id`),
  KEY `shipment_histories_status_id_foreign` (`status_id`),
  KEY `shipment_histories_org_created_index` (`organization_id`,`created_at`),
  CONSTRAINT `shipment_histories_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_histories_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_histories_status_id_foreign` FOREIGN KEY (`status_id`) REFERENCES `shipment_statuses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shipment_histories_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_histories`
--

LOCK TABLES `shipment_histories` WRITE;
/*!40000 ALTER TABLE `shipment_histories` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_histories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_package_items`
--

DROP TABLE IF EXISTS `shipment_package_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_package_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_package_id` bigint unsigned NOT NULL,
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `unit_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `weight` decimal(10,3) DEFAULT NULL,
  `sku` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_package_items_shipment_package_id_index` (`shipment_package_id`),
  CONSTRAINT `shipment_package_items_shipment_package_id_foreign` FOREIGN KEY (`shipment_package_id`) REFERENCES `shipment_packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_package_items`
--

LOCK TABLES `shipment_package_items` WRITE;
/*!40000 ALTER TABLE `shipment_package_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_package_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_packages`
--

DROP TABLE IF EXISTS `shipment_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_packages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shipment_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `weight` decimal(10,3) NOT NULL DEFAULT '0.000',
  `pieces` int unsigned NOT NULL DEFAULT '1',
  `declared_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `length` decimal(8,2) DEFAULT NULL,
  `width` decimal(8,2) DEFAULT NULL,
  `height` decimal(8,2) DEFAULT NULL,
  `content_description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `volumetric_weight` decimal(10,3) DEFAULT NULL,
  `chargeable_weight` decimal(10,3) DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `surcharges_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `meta` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_packages_organization_id_foreign` (`organization_id`),
  KEY `shipment_packages_shipment_id_organization_id_index` (`shipment_id`,`organization_id`),
  CONSTRAINT `shipment_packages_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_packages_shipment_id_foreign` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_packages`
--

LOCK TABLES `shipment_packages` WRITE;
/*!40000 ALTER TABLE `shipment_packages` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_statuses`
--

DROP TABLE IF EXISTS `shipment_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'circle',
  `color` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#6B7280',
  `order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `org_code_unique` (`organization_id`,`code`),
  KEY `shipment_statuses_organization_id_is_active_index` (`organization_id`,`is_active`),
  KEY `shipment_statuses_code_index` (`code`),
  CONSTRAINT `shipment_statuses_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_statuses`
--

LOCK TABLES `shipment_statuses` WRITE;
/*!40000 ALTER TABLE `shipment_statuses` DISABLE KEYS */;
INSERT INTO `shipment_statuses` VALUES (1,1,'pending','Pending',NULL,'Clock','#F39C12',1,1,'2026-04-17 01:02:04','2026-04-25 07:38:45'),(2,1,'processed','Processed',NULL,'check-circle','#2980B9',2,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(3,1,'in_transit','In Transit',NULL,'truck','#3498DB',3,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(4,1,'out_for_delivery','Out for Delivery',NULL,'map-pin','#E67E22',4,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(5,1,'delivered','Delivered',NULL,'package-check','#27AE60',5,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(6,1,'cancelled','Cancelled',NULL,'x-circle','#E74C3C',6,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(7,1,'on_hold','On Hold',NULL,'pause-circle','#95A5A6',7,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(8,1,'returned','Returned',NULL,'rotate-ccw','#E67E22',8,1,'2026-04-17 01:02:04','2026-04-17 01:02:04'),(9,1,'awaiting_payment','Awaiting Payment',NULL,'credit-card','#F39C12',9,1,'2026-04-17 01:02:04','2026-04-17 01:02:04');
/*!40000 ALTER TABLE `shipment_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipments`
--

DROP TABLE IF EXISTS `shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `rate_card_id` bigint unsigned DEFAULT NULL,
  `rate_rule_id` bigint unsigned DEFAULT NULL,
  `sender_details` json NOT NULL,
  `sender_name_search` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (json_unquote(json_extract(`sender_details`,_utf8mb4'$.name'))) VIRTUAL,
  `receiver_details` json NOT NULL,
  `receiver_name_search` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (json_unquote(json_extract(`receiver_details`,_utf8mb4'$.name'))) VIRTUAL,
  `package_details` json NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `status_id` bigint unsigned DEFAULT NULL,
  `payment_status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `financial_status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_cod` tinyint(1) NOT NULL DEFAULT '0',
  `cod_amount` decimal(12,2) DEFAULT NULL,
  `cod_currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cod_status` enum('pending','collected','remitted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cod_collected_at` timestamp NULL DEFAULT NULL,
  `service_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'economy',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cost_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `profit` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `exchange_rate` decimal(12,6) NOT NULL DEFAULT '1.000000',
  `ship_date` timestamp NULL DEFAULT NULL,
  `estimated_delivery_date` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `manifest_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `external_order_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_shipment_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_source` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `label_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paypal_pending_order_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Transient PayPal order ID pending capture; cleared after successful capture or cancellation',
  `cod_collected_by` bigint unsigned DEFAULT NULL,
  `origin_type` enum('standard','locker') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `locker_id` bigint unsigned DEFAULT NULL,
  `pre_alert_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipments_uuid_unique` (`uuid`),
  UNIQUE KEY `shipments_tracking_number_unique` (`tracking_number`),
  UNIQUE KEY `shipments_invoice_number_unique` (`invoice_number`),
  KEY `shipments_organization_id_foreign` (`organization_id`),
  KEY `shipments_created_by_foreign` (`created_by`),
  KEY `shipments_tracking_number_organization_id_index` (`tracking_number`,`organization_id`),
  KEY `shipments_status_index` (`status`),
  KEY `shipments_rate_card_id_foreign` (`rate_card_id`),
  KEY `shipments_rate_rule_id_foreign` (`rate_rule_id`),
  KEY `shipments_external_order_id_index` (`external_order_id`),
  KEY `shipments_external_shipment_id_index` (`external_shipment_id`),
  KEY `shipments_external_source_index` (`external_source`),
  KEY `shipments_status_id_index` (`status_id`),
  KEY `shipments_is_archived_index` (`is_archived`),
  KEY `shipments_organization_id_is_cod_cod_status_index` (`organization_id`,`is_cod`,`cod_status`),
  KEY `shipments_cod_collected_by_idx` (`cod_collected_by`),
  KEY `shipments_financial_status_index` (`financial_status`),
  KEY `shipments_locker_id_foreign` (`locker_id`),
  KEY `shipments_pre_alert_id_foreign` (`pre_alert_id`),
  KEY `shipments_sender_name_search_index` (`sender_name_search`),
  KEY `shipments_receiver_name_search_index` (`receiver_name_search`),
  CONSTRAINT `shipments_cod_collected_by_foreign` FOREIGN KEY (`cod_collected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shipments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shipments_locker_id_foreign` FOREIGN KEY (`locker_id`) REFERENCES `lockers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shipments_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipments_pre_alert_id_foreign` FOREIGN KEY (`pre_alert_id`) REFERENCES `pre_alerts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shipments_rate_card_id_foreign` FOREIGN KEY (`rate_card_id`) REFERENCES `rate_cards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shipments_rate_rule_id_foreign` FOREIGN KEY (`rate_rule_id`) REFERENCES `rate_rules` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shipments_status_id_foreign` FOREIGN KEY (`status_id`) REFERENCES `shipment_statuses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipments`
--

LOCK TABLES `shipments` WRITE;
/*!40000 ALTER TABLE `shipments` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `states`
--

DROP TABLE IF EXISTS `states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `states` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned DEFAULT NULL,
  `country_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iso2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `states_organization_id_country_id_name_unique` (`organization_id`,`country_id`,`name`),
  KEY `states_country_id_iso2_index` (`country_id`,`iso2`),
  KEY `states_code_index` (`code`),
  KEY `states_organization_id_index` (`organization_id`),
  CONSTRAINT `states_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `states`
--

LOCK TABLES `states` WRITE;
/*!40000 ALTER TABLE `states` DISABLE KEYS */;
INSERT INTO `states` VALUES (1,NULL,1,'NY',NULL,'ANT','ANT',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(2,NULL,1,'Cundinamarca',NULL,'CUN','CUN',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(3,NULL,1,'Valle del Cauca',NULL,'VAC','VAC',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(4,NULL,1,'Bogotá D.C.',NULL,'DC','DC',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(5,NULL,1,'Santander',NULL,'SAN','SAN',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(6,NULL,1,'NY',NULL,'ATL','ATL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(7,NULL,1,'Bolívar',NULL,'BOL','BOL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(8,NULL,1,'Nariño',NULL,'NAR','NAR',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(9,NULL,2,'California',NULL,'CA','CA',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(10,NULL,2,'Florida',NULL,'FL','FL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(11,NULL,2,'New York',NULL,'NY','NY',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(12,NULL,2,'Texas',NULL,'TX','TX',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(13,NULL,2,'Illinois',NULL,'IL','IL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(14,NULL,3,'Ciudad de México',NULL,'CDMX','CDMX',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(15,NULL,3,'Jalisco',NULL,'JAL','JAL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(16,NULL,3,'Nuevo León',NULL,'NL','NL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(17,NULL,3,'Estado de México',NULL,'MEX','MEX',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(18,NULL,3,'Quintana Roo',NULL,'QR','QR',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(19,NULL,4,'Madrid',NULL,'MD','MD',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(20,NULL,4,'Cataluña',NULL,'CT','CT',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(21,NULL,4,'Andalucía',NULL,'AN','AN',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(22,NULL,4,'Comunidad Valenciana',NULL,'VC','VC',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(23,NULL,5,'Buenos Aires',NULL,'BA','BA',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(24,NULL,5,'Córdoba',NULL,'CB','CB',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(25,NULL,5,'Santa Fe',NULL,'SF','SF',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(26,NULL,6,'Metropolitana de Santiago',NULL,'RM','RM',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(27,NULL,6,'Valparaíso',NULL,'VS','VS',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(28,NULL,7,'Lima',NULL,'LIM','LIM',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(29,NULL,7,'Arequipa',NULL,'ARE','ARE',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(30,NULL,8,'Pichincha',NULL,'P','P',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(31,NULL,8,'Guayas',NULL,'G','G',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(32,NULL,9,'Panamá',NULL,'PA','PA',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(33,NULL,9,'Colón',NULL,'COL','COL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(34,NULL,10,'San José',NULL,'SJ','SJ',1,'2026-04-07 01:33:09','2026-04-07 01:33:09'),(35,NULL,10,'Alajuela',NULL,'AL','AL',1,'2026-04-07 01:33:09','2026-04-07 01:33:09');
/*!40000 ALTER TABLE `states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `gender` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cédula / documento de identidad',
  `document_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CC, NIF, RUC, Passport, etc.',
  `date_of_birth` date DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_id` bigint unsigned DEFAULT NULL,
  `state_id` bigint unsigned DEFAULT NULL,
  `city_id` bigint unsigned DEFAULT NULL,
  `zip_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invitation_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invitation_sent_at` timestamp NULL DEFAULT NULL,
  `invitation_accepted_at` timestamp NULL DEFAULT NULL,
  `password_changed_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `google_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auth_provider` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `avatar_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `language` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `branch_id` bigint unsigned DEFAULT NULL,
  `department_id` bigint unsigned DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `two_factor_enabled` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_google_id_unique` (`google_id`),
  UNIQUE KEY `invitation_token` (`invitation_token`),
  KEY `users_country_id_foreign` (`country_id`),
  KEY `users_state_id_foreign` (`state_id`),
  KEY `users_city_id_foreign` (`city_id`),
  KEY `users_organization_id_index` (`organization_id`),
  KEY `users_branch_id_index` (`branch_id`),
  KEY `users_department_id_index` (`department_id`),
  KEY `users_is_active_index` (`is_active`),
  KEY `users_organization_id_last_seen_at_index` (`organization_id`,`last_seen_at`),
  CONSTRAINT `users_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_state_id_foreign` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Deprixa Admin',NULL,NULL,NULL,NULL,NULL,'admin@yourcompany.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'$2y$12$Oo3iMrJuD0D89Dh/3W8.VuDTiBE.5Y6WRp.Hpd3etv98/msGxl9.e',NULL,NULL,NULL,NULL,NULL,'2026-04-07 01:33:36','2026-05-04 16:57:27',1,NULL,'email',NULL,'en','2026-05-04 16:57:27',NULL,1,NULL,NULL,0,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `warehouses_organization_id_is_active_index` (`organization_id`,`is_active`),
  CONSTRAINT `warehouses_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'plusenvato_clean'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-04 22:10:02
