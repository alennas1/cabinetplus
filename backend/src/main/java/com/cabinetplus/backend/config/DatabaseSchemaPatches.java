package com.cabinetplus.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseSchemaPatches {
    private static final Logger logger = LoggerFactory.getLogger(DatabaseSchemaPatches.class);

    @Bean
    @Order(0)
    CommandLineRunner ensureGestionCabinetPinColumns(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute(
                        "ALTER TABLE users " +
                                "ADD COLUMN IF NOT EXISTS gestion_cabinet_pin_enabled boolean NOT NULL DEFAULT false"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE users " +
                                "ADD COLUMN IF NOT EXISTS gestion_cabinet_pin_hash varchar(100)"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE users " +
                                "ADD COLUMN IF NOT EXISTS gestion_cabinet_pin_updated_at timestamp"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE users " +
                                "ADD COLUMN IF NOT EXISTS clinic_access_role varchar(40)"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE users " +
                                "ADD COLUMN IF NOT EXISTS owner_dentist_id bigint"
                );
                jdbcTemplate.execute(
                        "UPDATE users SET clinic_access_role = 'DENTIST' " +
                                "WHERE role = 'DENTIST' AND (clinic_access_role IS NULL OR clinic_access_role = '')"
                );
                jdbcTemplate.execute(
                        "UPDATE users u " +
                                "SET owner_dentist_id = e.dentist_id " +
                                "FROM employees e " +
                                "WHERE u.id = e.user_id " +
                                "AND u.role = 'DENTIST' " +
                                "AND u.owner_dentist_id IS NULL"
                );
                jdbcTemplate.execute(
                        "UPDATE users SET clinic_access_role = 'RECEPTION' " +
                                "WHERE role = 'DENTIST' AND owner_dentist_id IS NOT NULL " +
                                "AND (clinic_access_role IS NULL OR clinic_access_role = '' OR clinic_access_role = 'DENTIST')"
                );

                jdbcTemplate.execute(
                        "ALTER TABLE treatment_catalog " +
                                "ADD COLUMN IF NOT EXISTS is_flat_fee boolean NOT NULL DEFAULT false"
                );

                jdbcTemplate.execute(
                        "ALTER TABLE prothesis_catalog " +
                                "ADD COLUMN IF NOT EXISTS default_lab_cost double precision NOT NULL DEFAULT 0"
                );

                jdbcTemplate.execute(
                        "ALTER TABLE protheses " +
                                "ADD COLUMN IF NOT EXISTS code varchar(120)"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE employees " +
                                "ADD COLUMN IF NOT EXISTS user_id bigint"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE documents " +
                                "ADD COLUMN IF NOT EXISTS file_size_bytes bigint NOT NULL DEFAULT 0"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE plans " +
                                "ADD COLUMN IF NOT EXISTS max_dentists integer NOT NULL DEFAULT 1"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE plans " +
                                "ADD COLUMN IF NOT EXISTS max_employees integer NOT NULL DEFAULT 0"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE plans " +
                                "ADD COLUMN IF NOT EXISTS max_patients integer NOT NULL DEFAULT 0"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE plans " +
                                "ADD COLUMN IF NOT EXISTS max_storage_gb double precision NOT NULL DEFAULT 0"
                );

                jdbcTemplate.execute(
                        "CREATE TABLE IF NOT EXISTS audit_logs (" +
                                "id BIGSERIAL PRIMARY KEY, " +
                                "occurred_at timestamp NOT NULL, " +
                                "request_id varchar(64), " +
                                "actor_user_id bigint, " +
                                "actor_username varchar(100), " +
                                "actor_role varchar(30), " +
                                "event_type varchar(80) NOT NULL, " +
                                "target_type varchar(80), " +
                                "target_id varchar(120), " +
                                "status varchar(20) NOT NULL, " +
                                "message varchar(300), " +
                                "http_method varchar(10), " +
                                "path varchar(255), " +
                                "ip_address varchar(100), " +
                                "location varchar(120)" +
                                ")"
                );

                jdbcTemplate.execute(
                        "ALTER TABLE audit_logs " +
                                "ADD COLUMN IF NOT EXISTS location varchar(120)"
                );

                jdbcTemplate.execute(
                        "CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id)"
                );
                jdbcTemplate.execute(
                        "CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON audit_logs(actor_role)"
                );
                jdbcTemplate.execute(
                        "CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC)"
                );

                // Keep audit table lean: delete logs older than 90 days.
                int deletedRows = jdbcTemplate.update(
                        "DELETE FROM audit_logs WHERE occurred_at < NOW() - INTERVAL '90 days'"
                );
                if (deletedRows > 0) {
                    logger.info("Audit logs cleanup: {} old rows deleted", deletedRows);
                }

                
            } catch (Exception e) {
                // Best-effort patch for existing databases; startup should proceed.
                logger.warn("Schema patch skipped: {}", e.getMessage());
            }
        };
    }

    @Bean
    @Order(1)
    CommandLineRunner ensurePlanStorageColumnSupportsDecimals(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute(
                        "ALTER TABLE plans " +
                                "ADD COLUMN IF NOT EXISTS max_storage_gb double precision NOT NULL DEFAULT 0"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE plans " +
                                "ALTER COLUMN max_storage_gb TYPE double precision USING max_storage_gb::double precision"
                );
            } catch (Exception e) {
                logger.warn("Plan storage column patch skipped: {}", e.getMessage());
            }
        };
    }
}
