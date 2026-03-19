package com.cabinetplus.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.AuditLogResponse;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.UserService;

class AuditControllerTest {

    private UserService userService;
    private AuditService auditService;
    private AuditController controller;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        auditService = mock(AuditService.class);
        controller = new AuditController(auditService, userService);
    }

    @Test
    void myLogsReturnsConnectedUserLogs() {
        User user = new User();
        user.setId(9L);
        user.setUsername("dentist");
        user.setRole(UserRole.DENTIST);
        UserDetails principal = org.springframework.security.core.userdetails.User
                .withUsername("dentist")
                .password("x")
                .authorities("ROLE_DENTIST")
                .build();

        AuditLogResponse entry = new AuditLogResponse(
                LocalDateTime.now(),
                "AUTH_LOGIN",
                "SUCCESS",
                "Connexion reussie",
                null,
                null,
                null,
                9L,
                "Dentiste",
                "41.220.77.14",
                "Alger, DZ"
        );

        when(userService.findByUsername("dentist")).thenReturn(Optional.of(user));
        when(auditService.getMyLogs(user)).thenReturn(List.of(entry));

        List<AuditLogResponse> result = controller.myLogs(principal);
        assertEquals(1, result.size());
        assertEquals("AUTH_LOGIN", result.get(0).eventType());
    }

    @Test
    void securityLogsForDentistReturnsForbidden() {
        User user = new User();
        user.setId(10L);
        user.setUsername("dentist");
        user.setRole(UserRole.DENTIST);
        UserDetails principal = org.springframework.security.core.userdetails.User
                .withUsername("dentist")
                .password("x")
                .authorities("ROLE_DENTIST")
                .build();

        when(userService.findByUsername("dentist")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> controller.securityLogs(principal));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void securityLogsForAdminReturnsSecurityEntries() {
        User user = new User();
        user.setId(1L);
        user.setUsername("admin");
        user.setRole(UserRole.ADMIN);
        UserDetails principal = org.springframework.security.core.userdetails.User
                .withUsername("admin")
                .password("x")
                .authorities("ROLE_ADMIN")
                .build();

        when(userService.findByUsername("admin")).thenReturn(Optional.of(user));
        when(auditService.getSecurityLogsForAdmin()).thenReturn(List.of(
                new AuditLogResponse(
                        LocalDateTime.now(),
                        "USER_ADMIN_CREATE",
                        "SUCCESS",
                        "Creation d'un compte admin",
                        null,
                        null,
                        null,
                        1L,
                        "Admin",
                        "197.112.5.8",
                        "Localisation indisponible"
                )
        ));

        List<AuditLogResponse> result = controller.securityLogs(principal);
        assertEquals(1, result.size());
        assertEquals("USER_ADMIN_CREATE", result.get(0).eventType());
    }
}
