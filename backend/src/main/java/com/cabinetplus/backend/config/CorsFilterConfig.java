package com.cabinetplus.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Ensures CORS headers are present even on error responses (4xx/5xx),
 * so the frontend can read backend error payloads instead of seeing a generic network error.
 */
@Configuration
public class CorsFilterConfig {

    private final CorsConfigurationSource corsConfigurationSource;

    public CorsFilterConfig(CorsConfigurationSource corsConfigurationSource) {
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public CorsFilter corsFilter() {
        return new CorsFilter(corsConfigurationSource);
    }
}

