package com.cabinetplus.backend.security;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class EmployeePermissionsFilter extends OncePerRequestFilter {

    private final UserService userService;
    private final ObjectMapper objectMapper;

    public EmployeePermissionsFilter(UserService userService, ObjectMapper objectMapper) {
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    private boolean isAlwaysAllowed(String path) {
        if (path == null) return true;
        return "/api/users/me".equals(path)
                || path.startsWith("/api/security/")
                || path.startsWith("/api/verify/")
                || path.startsWith("/api/plans")
                || path.startsWith("/api/plan");
    }

    private static String requiredPermissionForPath(String path) {
        if (path == null) return null;

        // Core pages
        if (path.startsWith("/api/appointments")) return "APPOINTMENTS";
        if (path.startsWith("/api/patients")) return "PATIENTS";
        if (path.startsWith("/api/devises")) return "DEVIS";
        if (path.startsWith("/api/support")) return "SUPPORT";

        // Catalogue
        if (path.startsWith("/api/medications")) return "CATALOGUE";
        if (path.startsWith("/api/treatment-catalog")) return "CATALOGUE";
        if (path.startsWith("/api/prothesis-catalog")) return "CATALOGUE";
        if (path.startsWith("/api/justification-content")) return "CATALOGUE";
        if (path.startsWith("/api/materials")) return "CATALOGUE";
        if (path.startsWith("/api/items")) return "CATALOGUE";
        if (path.startsWith("/api/item-defaults")) return "CATALOGUE";
        if (path.startsWith("/api/disease-catalog")) return "CATALOGUE";
        if (path.startsWith("/api/allergy-catalog")) return "CATALOGUE";

        // Patient dossier / prostheses tracking (allow if either module is enabled)
        if (path.startsWith("/api/protheses")) return "PROTHESIS_ANY";
        if (path.startsWith("/api/payments")) return "PATIENTS";

        // Gestion cabinet / back-office
        if (path.startsWith("/api/finance")) return "GESTION_CABINET";
        if (path.startsWith("/api/expenses")) return "GESTION_CABINET";
        if (path.startsWith("/api/employees")) return "GESTION_CABINET";
        if (path.startsWith("/api/laboratories")) return "GESTION_CABINET";
        if (path.startsWith("/api/fournisseurs")) return "GESTION_CABINET";
        if (path.startsWith("/api/hand-payments")) return "GESTION_CABINET";

        // Settings / audit
        if (path.startsWith("/api/audit")) return "SETTINGS";
        if (path.startsWith("/api/users/me/")) return "SETTINGS";

        return null;
    }

    private void deny(HttpServletResponse response) throws IOException {
        if (response.isCommitted()) return;
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), Map.of(
                "status", HttpStatus.FORBIDDEN.value(),
                "fieldErrors", Map.of("_", "Acces refuse")
        ));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (isAlwaysAllowed(path)) {
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
        if (user == null) {
            filterChain.doFilter(request, response);
            return;
        }
        if (user.getRole() == UserRole.ADMIN) {
            filterChain.doFilter(request, response);
            return;
        }

        // Dentist owner has full access.
        boolean isStaff = user.getRole() == UserRole.EMPLOYEE || user.getOwnerDentist() != null;
        if (!isStaff) {
            filterChain.doFilter(request, response);
            return;
        }

        String required = requiredPermissionForPath(path);
        if (required == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Set<String> permissions = user.getPermissions();
        boolean allowed;
        if ("PROTHESIS_ANY".equals(required)) {
            allowed = permissions != null && (permissions.contains("PATIENTS") || permissions.contains("PROSTHESES"));
        } else {
            allowed = permissions != null && permissions.contains(required);
        }

        if (!allowed) {
            deny(response);
            return;
        }

        filterChain.doFilter(request, response);
    }
}
