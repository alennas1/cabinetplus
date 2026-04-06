package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.AdminPlanGrantRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AdminPlanGrantService;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/subscriptions")
public class AdminSubscriptionController {

    private final AdminPlanGrantService adminPlanGrantService;
    private final UserService userService;
    private final AuditService auditService;

    public AdminSubscriptionController(
            AdminPlanGrantService adminPlanGrantService,
            UserService userService,
            AuditService auditService
    ) {
        this.adminPlanGrantService = adminPlanGrantService;
        this.userService = userService;
        this.auditService = auditService;
    }

    @PostMapping("/users/{userId}/grant")
    public ResponseEntity<User> grantPlan(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails adminDetails,
            @PathVariable Long userId,
            @Valid @RequestBody AdminPlanGrantRequest request
    ) {
        User admin = userService.findByPhoneNumber(adminDetails.getUsername()).orElse(null);
        User saved = adminPlanGrantService.grant(userId, request);
        auditService.logSuccessAsUser(
                admin,
                AuditEventType.USER_PLAN_ADMIN_GRANT,
                "USER",
                String.valueOf(saved.getId()),
                "Plan attribue par admin"
        );
        return ResponseEntity.ok(saved);
    }
}

