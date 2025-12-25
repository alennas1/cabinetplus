package com.cabinetplus.backend.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
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

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final CustomUserDetailsService userDetailsService;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          CustomUserDetailsService userDetailsService) {
        this.jwtFilter = jwtFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            // ✅ CSRF ENABLED (cookie-based auth requires this)
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/auth/**")
            )

            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            .authorizeHttpRequests(auth -> auth
                // 1️⃣ PUBLIC ENDPOINTS
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/verify/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // 2️⃣ ADMIN ONLY
                .requestMatchers(
                    "/api/hand-payments/all",
                    "/api/hand-payments/pending",
                    "/api/hand-payments/confirm/**",
                    "/api/hand-payments/reject/**",
                    "/api/users/dentists",
                    "/api/users/admins",
                    "/admin/**"
                ).hasRole("ADMIN")

                // 3️⃣ SHARED (ADMIN + DENTIST)
                .requestMatchers(
                    "/api/hand-payments/create",
                    "/api/hand-payments/my-payments",
                    "/api/users/me/**"
                ).hasAnyRole("DENTIST", "ADMIN")

                // 4️⃣ ALL OTHER API
                .requestMatchers("/api/**").hasAnyRole("DENTIST", "ADMIN")

                .anyRequest().authenticated()
            );

        // ✅ Cookie-based JWT filter
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ---------------- AUTH ----------------

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // ---------------- CORS ----------------

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "https://cabinetplusdz.com",
            "https://www.cabinetplusdz.com",
            "https://cabinetplus.vercel.app"
        ));

        configuration.setAllowedOriginPatterns(List.of(
            "https://*.vercel.app"
        ));

        configuration.setAllowedMethods(
            Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
        );

        configuration.setAllowedHeaders(Arrays.asList(
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Set-Cookie"));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
