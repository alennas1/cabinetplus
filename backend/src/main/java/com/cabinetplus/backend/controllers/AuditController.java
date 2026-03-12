package com.cabinetplus.backend.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.AuditLogResponse;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/audit")
public class AuditController {
    private final AuditService auditService;
    private final UserService userService;

    public AuditController(AuditService auditService, UserService userService) {
        this.auditService = auditService;
        this.userService = userService;
    }

    @GetMapping("/my")
    public List<AuditLogResponse> myLogs(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal
    ) {
        User user = userService.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        return auditService.getMyLogs(user);
    }

    @GetMapping("/security")
    public List<AuditLogResponse> securityLogs(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal
    ) {
        User user = userService.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        return auditService.getSecurityLogsForAdmin();
    }
}
