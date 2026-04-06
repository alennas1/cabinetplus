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
                || path.startsWith("/api/users/me/")
                || path.startsWith("/api/security/")
                || path.startsWith("/api/verify/")
                || path.startsWith("/api/plans")
                || path.startsWith("/api/plan");
    }

    private static String requiredPermissionForRequest(HttpServletRequest request) {
        if (request == null) return null;
        String path = request.getRequestURI();
        if (path == null) return null;
        String method = request.getMethod();

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
        // Inventory needs read access to item defaults, but writing remains "CATALOGUE".
        if (path.startsWith("/api/item-defaults")) {
            return "GET".equalsIgnoreCase(method) ? "CATALOGUE_OR_INVENTORY" : "CATALOGUE";
        }
        if (path.startsWith("/api/disease-catalog")) return "CATALOGUE";
        if (path.startsWith("/api/allergy-catalog")) return "CATALOGUE";

        // Inventory
        if (path.startsWith("/api/items")) return "INVENTORY";

        // Patient dossier / prostheses tracking (allow if either module is enabled)
        if (path.startsWith("/api/protheses")) {
            return "GET".equalsIgnoreCase(method) ? "PROTHESIS_ANY" : "PROSTHESES";
        }
        if (path.startsWith("/api/payments")) return "PATIENTS";

        // Gestion cabinet / back-office
        if (path.startsWith("/api/finance")) return "GESTION_CABINET";
        if (path.startsWith("/api/employees")) return "GESTION_CABINET";
        if (path.startsWith("/api/expenses")) return "EXPENSES";
        if (path.startsWith("/api/laboratories")) return "LABORATORIES";
        if (path.startsWith("/api/fournisseurs")) return "FOURNISSEURS";
        if (path.startsWith("/api/hand-payments")) return "GESTION_CABINET";

        // Settings / audit
        if (path.startsWith("/api/audit")) return "SETTINGS";
        if (path.startsWith("/api/users/me/")) return "SETTINGS";

        return null;
    }

    private static String requiredActionForRequest(HttpServletRequest request) {
        if (request == null) return null;
        String method = request.getMethod();
        if (method == null) return null;
        if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) {
            return null;
        }
        String path = request.getRequestURI();
        if (path != null) {
            String p = path.toLowerCase();
            // Some endpoints use POST as a read/query operation.
            if (p.contains("/by-ids")) return null;
            if (p.contains("/cancel")) return "CANCEL";
            if (p.contains("/archive") || p.contains("/unarchive")) return "ARCHIVE";
            if (p.contains("/status")) return "STATUS";
        }
        if ("POST".equalsIgnoreCase(method)) return "CREATE";
        if ("DELETE".equalsIgnoreCase(method)) return "DELETE";
        return "UPDATE"; // PUT/PATCH and any other mutating method
    }

    private static String moduleForAction(String required) {
        if (required == null) return null;
        if ("CATALOGUE_OR_INVENTORY".equals(required)) return "CATALOGUE";
        if ("PROTHESIS_ANY".equals(required)) return "PROSTHESES";
        return required;
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

        String required = requiredPermissionForRequest(request);
        if (required == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Set<String> permissions = user.getPermissions();
        boolean allowedBase;
        if ("SUPPORT".equals(required)) {
            allowedBase = true; // Support is always enabled for employees/staff (not configurable).
        } else if ("GESTION_CABINET".equals(required)) {
            allowedBase = false; // Finance + employee management are forbidden for employees/staff.
        } else if ("CATALOGUE_OR_INVENTORY".equals(required)) {
            allowedBase = permissions != null && (permissions.contains("CATALOGUE") || permissions.contains("INVENTORY"));
        } else if ("PROTHESIS_ANY".equals(required)) {
            allowedBase = permissions != null && (permissions.contains("PATIENTS") || permissions.contains("PROSTHESES"));
        } else {
            allowedBase = permissions != null && permissions.contains(required);
        }

        String action = requiredActionForRequest(request);
        if (action != null && !"GESTION_CABINET".equals(required) && !"SUPPORT".equals(required)) {
            String module = moduleForAction(required);
            String actionKey = module != null ? (module + "_" + action) : null;
            boolean hasAction = actionKey != null && permissions != null && permissions.contains(actionKey);
            allowedBase = hasAction;
        }

        if (!allowedBase) {
            deny(response);
            return;
        }

        filterChain.doFilter(request, response);
    }
}
