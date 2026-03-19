package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.SecurityPinChangeRequest;
import com.cabinetplus.backend.dto.SecurityPinEnableRequest;
import com.cabinetplus.backend.dto.SecurityPinVerifyRequest;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SecurityPinControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuditService auditService;

    private SecurityPinController controller;
    private UserDetails userDetails;
    private User user;

    @BeforeEach
    void setUp() {
        controller = new SecurityPinController(userService, passwordEncoder, auditService);
        userDetails = org.springframework.security.core.userdetails.User
                .withUsername("dentist")
                .password("x")
                .authorities("ROLE_DENTIST")
                .build();

        user = new User();
        user.setId(1L);
        user.setUsername("dentist");
        user.setPasswordHash("hash");
        user.setGestionCabinetPinEnabled(false);
    }

    @Test
    void enableWithInvalidPinThrowsBadRequest() {
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(user));
        assertThrows(BadRequestException.class,
                () -> controller.enable(userDetails, new SecurityPinEnableRequest("12")));
    }

    @Test
    void changeWithWrongPasswordThrowsForbidden() {
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad", "hash")).thenReturn(false);

        assertThrows(BadRequestException.class,
                () -> controller.change(userDetails, new SecurityPinChangeRequest("bad", "1234")));
    }

    @Test
    void statusWhenUserMissingThrowsNotFound() {
        when(userService.findByUsername("dentist")).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> controller.status(userDetails));
    }

    @Test
    void verifyReturnsFalseWhenDisabled() {
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(user));
        var out = controller.verify(userDetails, new SecurityPinVerifyRequest("1234"));
        assertFalse((Boolean) out.get("valid"));
    }

    @Test
    void enableSetsHashAndEnabled() {
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("1234")).thenReturn("hashedPin");
        when(userService.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var out = controller.enable(userDetails, new SecurityPinEnableRequest("1234"));

        assertTrue((Boolean) out.get("enabled"));
        assertTrue(user.isGestionCabinetPinEnabled());
        assertEquals("hashedPin", user.getGestionCabinetPinHash());
        assertTrue(user.getGestionCabinetPinUpdatedAt().isBefore(LocalDateTime.now().plusSeconds(1)));
        verify(userService).save(user);
    }
}
