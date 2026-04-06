package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.LaboratoryConnectionInviteRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.LaboratoryConnection;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.LaboratoryConnectionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/laboratory-connections")
public class LaboratoryConnectionController {

    private final LaboratoryConnectionService laboratoryConnectionService;
    private final UserService userService;
    private final AuditService auditService;

    public LaboratoryConnectionController(
            LaboratoryConnectionService laboratoryConnectionService,
            UserService userService,
            AuditService auditService
    ) {
        this.laboratoryConnectionService = laboratoryConnectionService;
        this.userService = userService;
        this.auditService = auditService;
    }

    @PostMapping("/invite")
    public ResponseEntity<?> invite(@Valid @RequestBody LaboratoryConnectionInviteRequest payload, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        User dentist = userService.resolveClinicOwner(actor);

        LaboratoryConnection connection = laboratoryConnectionService.invite(
                dentist,
                payload.labPublicId(),
                payload.mergeFromLaboratoryId()
        );

        auditService.logSuccess(
                AuditEventType.LABORATORY_UPDATE,
                "LAB_CONNECTION",
                String.valueOf(connection.getId()),
                "Invitation laboratoire envoyee"
        );

        return ResponseEntity.ok(Map.of(
                "id", connection.getId(),
                "status", connection.getStatus() != null ? connection.getStatus().name() : null,
                "invitedAt", connection.getInvitedAt(),
                "laboratoryPublicId", connection.getLaboratory() != null ? connection.getLaboratory().getPublicId() : null
        ));
    }
}

