package com.cabinetplus.backend.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.cabinetplus.backend.security.CustomUserDetailsService;
import com.cabinetplus.backend.security.JwtAuthenticationFilter;
import com.cabinetplus.backend.security.RequestTracingFilter;
import com.cabinetplus.backend.services.AuditService;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtFilter;
    private final RequestTracingFilter requestTracingFilter;
    private final CustomUserDetailsService userDetailsService;
    private final List<String> allowedOrigins;
    private final List<String> allowedOriginPatterns;

    public SecurityConfig(
            JwtAuthenticationFilter jwtFilter,
            RequestTracingFilter requestTracingFilter,
            CustomUserDetailsService userDetailsService,
            @Value("${app.cors.allowed-origins}") String allowedOrigins,
            @Value("${app.cors.allowed-origin-patterns}") String allowedOriginPatterns
    ) {
        this.jwtFilter = jwtFilter;
        this.requestTracingFilter = requestTracingFilter;
        this.userDetailsService = userDetailsService;
        this.allowedOrigins = splitCsv(allowedOrigins);
        this.allowedOriginPatterns = splitCsv(allowedOriginPatterns);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                // 1. PUBLIC ENDPOINTS
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/verify/**").permitAll() // KEPT FOR PHONE VERIFICATION
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // 2. ADMIN-ONLY ENDPOINTS
                .requestMatchers(
                    "/api/hand-payments/all",
                    "/api/hand-payments/pending",
                    "/api/hand-payments/user/**",
                    "/api/hand-payments/confirm/**",
                    "/api/hand-payments/reject/**",
                    "/api/users/dentists",
                    "/api/users/admins",
                    "/admin/**"
                ).hasRole("ADMIN")

                // 3. SHARED PROTECTED ENDPOINTS (DENTIST & ADMIN)
                .requestMatchers(
                    "/api/hand-payments/create",
                    "/api/hand-payments/my-payments",
                    "/api/users/me/**"
                ).hasAnyRole("DENTIST", "ADMIN")

                // 4. GENERAL API PROTECTION
                .requestMatchers("/api/**").hasAnyRole("DENTIST", "ADMIN")

                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(requestTracingFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Use explicit origins for your live domains
        configuration.setAllowedOrigins(allowedOrigins);
        
        // Use pattern for Vercel dynamic preview branches
        configuration.setAllowedOriginPatterns(allowedOriginPatterns);

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Type", 
            "X-Requested-With", 
            "X-Request-Id",
            "Accept", 
            "Origin", 
            "Access-Control-Request-Method", 
            "Access-Control-Request-Headers"
        ));
        
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Set-Cookie", AuditService.REQUEST_ID_HEADER));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }
}
