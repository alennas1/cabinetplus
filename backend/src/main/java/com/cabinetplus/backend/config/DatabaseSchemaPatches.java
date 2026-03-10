package com.cabinetplus.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseSchemaPatches {

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
                        "ALTER TABLE treatment_catalog " +
                                "ADD COLUMN IF NOT EXISTS is_flat_fee boolean NOT NULL DEFAULT false"
                );
                jdbcTemplate.execute(
                        "ALTER TABLE treatment_catalog " +
                                "ADD COLUMN IF NOT EXISTS is_flat_fee boolean NOT NULL DEFAULT false"
                );

                
            } catch (Exception ignored) {
                // Best-effort patch for existing databases.
            }
        };
    }
}
