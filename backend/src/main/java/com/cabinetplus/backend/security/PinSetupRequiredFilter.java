package com.cabinetplus.backend.security;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class PinSetupRequiredFilter extends OncePerRequestFilter {

    private final UserService userService;
    private final ObjectMapper objectMapper;

    public PinSetupRequiredFilter(UserService userService, ObjectMapper objectMapper) {
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    private boolean isAllowedWhilePinMissing(String path) {
        if (path == null) return false;
        return path.startsWith("/api/users/me")
                || path.startsWith("/api/security/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            filterChain.doFilter(request, response);
            return;
        }

        String username = null;
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) {
            username = ud.getUsername();
        } else if (principal instanceof String s) {
            username = s;
        }

        if (username == null || username.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        User user = userService.findByPhoneNumber(username).orElse(null);
        if (user == null || user.getRole() == UserRole.ADMIN) {
            filterChain.doFilter(request, response);
            return;
        }

        User owner = userService.resolveClinicOwner(user);
        if (owner == null) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean enforce = owner.isPhoneVerified()
                && owner.getPlanStatus() == UserPlanStatus.ACTIVE
                && !owner.isGestionCabinetPinConfigured();

        if (!enforce || isAllowedWhilePinMissing(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (response.isCommitted()) {
            return;
        }
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), Map.of(
                "status", HttpStatus.FORBIDDEN.value(),
                "fieldErrors", Map.of("_", "Code PIN requis. Configurez-le dans Paramètres → Sécurité.")
        ));
    }
}

