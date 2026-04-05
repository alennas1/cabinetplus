package com.cabinetplus.backend.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

import com.cabinetplus.backend.dto.AuditLogResponse;
import com.cabinetplus.backend.dto.AuditLogPageResponse;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/audit")
public class AuditController {
    private final AuditService auditService;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;

    public AuditController(AuditService auditService, UserService userService, PublicIdResolutionService publicIdResolutionService) {
        this.auditService = auditService;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
    }

    @GetMapping("/my")
    public List<AuditLogResponse> myLogs(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal
    ) {
        User user = userService.findByPhoneNumber(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        return auditService.getMyLogs(user);
    }

    @GetMapping("/my/paged")
    public AuditLogPageResponse myLogsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "entity", required = false) String entity,
            @RequestParam(name = "action", required = false) String action,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal
    ) {
        User user = userService.findByPhoneNumber(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        return auditService.getMyLogsPaged(user, page, size, q, status, entity, action, sortKey, sortDirection, from, to);
    }

    @GetMapping("/security")
    public List<AuditLogResponse> securityLogs(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal
    ) {
        User user = userService.findByPhoneNumber(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        return auditService.getSecurityLogsForAdmin();
    }

    @GetMapping("/security/paged")
    public AuditLogPageResponse securityLogsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal
    ) {
        User user = userService.findByPhoneNumber(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        return auditService.getSecurityLogsForAdminPaged(user, page, size, q, status, from, to);
    }

	    @GetMapping("/patient/{patientId}")
	    public AuditLogPageResponse patientLogs(
	            @PathVariable String patientId,
	            @RequestParam(name = "page", defaultValue = "0") int page,
	            @RequestParam(name = "size", defaultValue = "20") int size,
	            @RequestParam(name = "q", required = false) String q,
	            @RequestParam(name = "status", required = false) String status,
	            @RequestParam(name = "entity", required = false) String entity,
	            @RequestParam(name = "action", required = false) String action,
	            @RequestParam(name = "sortKey", required = false) String sortKey,
	            @RequestParam(name = "sortDirection", required = false) String sortDirection,
	            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
	            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
	            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails principal
	    ) {
	        User user = userService.findByPhoneNumber(principal.getUsername())
	                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
	        User clinicOwner = userService.resolveClinicOwner(user);
	        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, clinicOwner).getId();
	        return auditService.getPatientLogs(user, internalPatientId, page, size, q, status, entity, action, sortKey, sortDirection, from, to);
	    }
	}
