package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/protheses")
@RequiredArgsConstructor
public class ProtheticsController {
    private final ProthesisService service;
    private final UserService userService;
    private final AuditService auditService;
    private final ProthesisRepository prothesisRepository;
    private final PublicIdResolutionService publicIdResolutionService;

    // --- MERGED GET ALL METHOD ---
    @GetMapping
    public ResponseEntity<List<ProthesisResponse>> getAll(
            @RequestParam(required = false) String status, 
            Principal principal) {
        
        User user = getCurrentUser(principal);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_READ,
                "PROTHESIS",
                null,
                status != null && !status.isEmpty() ? "Protheses consultees (filtre statut)" : "Protheses consultees"
        );
        List<Prothesis> results;

        if (status != null && !status.isEmpty()) {
            // Handles: GET /api/protheses?status=SENT_TO_LAB
            results = service.findByPractitionerAndStatus(user, status.toUpperCase());
        } else {
            // Handles: GET /api/protheses
            results = service.findAllByUser(user);
        }

        return ResponseEntity.ok(results.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<ProthesisResponse> create(@Valid @RequestBody ProthesisRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis created = service.create(dto, user);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_CREATE,
                "PATIENT",
                created.getPatient() != null ? String.valueOf(created.getPatient().getId()) : null,
                "Prothese ajoutee"
        );
        return ResponseEntity.ok(mapToResponse(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProthesisResponse> update(@PathVariable Long id, @Valid @RequestBody ProthesisRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis updated = service.update(id, dto, user);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_UPDATE,
                "PATIENT",
                updated.getPatient() != null ? String.valueOf(updated.getPatient().getId()) : null,
                "Prothese modifiee"
        );
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @PutMapping("/{id}/assign-lab")
    public ResponseEntity<ProthesisResponse> assignLab(@PathVariable Long id, @Valid @RequestBody LabAssignmentRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis updated = service.assignToLab(id, dto, user);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_ASSIGN_LAB,
                "PATIENT",
                updated.getPatient() != null ? String.valueOf(updated.getPatient().getId()) : null,
                "Prothese envoyee au laboratoire"
        );
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ProthesisResponse> changeStatus(
            @PathVariable Long id, 
            @RequestParam String status, 
            Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis updated = service.updateStatus(id, status, user);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_STATUS_CHANGE,
                "PATIENT",
                updated.getPatient() != null ? String.valueOf(updated.getPatient().getId()) : null,
                "Statut prothese modifie: " + updated.getStatus()
        );
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis existing = prothesisRepository.findById(id)
                .filter(p -> user.getRole() == UserRole.ADMIN || (p.getPractitioner() != null && p.getPractitioner().equals(user)))
                .orElse(null);
        service.delete(id, user);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_DELETE,
                "PATIENT",
                existing != null && existing.getPatient() != null
                        ? String.valueOf(existing.getPatient().getId())
                        : null,
                existing != null
                        ? "Prothese supprimee"
                        : "Prothese supprimee: #" + id
        );
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

  private ProthesisResponse mapToResponse(Prothesis p) {
    String patientFullName = p.getPatient().getFirstname() + " " + p.getPatient().getLastname();
    
    return new ProthesisResponse(
        p.getId(),
        p.getProthesisCatalog().getId(),
        p.getPatient().getId(),
        patientFullName,
        p.getProthesisCatalog().getName(),
        (p.getProthesisCatalog().getMaterial() != null) ? p.getProthesisCatalog().getMaterial().getName() : "N/A",
        p.getTeeth(),
        p.getFinalPrice(),
        p.getLabCost(),
        p.getCode(),
        p.getNotes(),
        p.getStatus(),
        p.getLaboratory() != null ? p.getLaboratory().getName() : "Not Sent",
        p.getDateCreated(),
        p.getSentToLabDate(),
        p.getActualReturnDate()
    );
}

@GetMapping("/patient/{patientId}")
public ResponseEntity<List<ProthesisResponse>> getByPatient(
        @PathVariable String patientId,
        Principal principal) {
    
    User user = getCurrentUser(principal);
    Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, user).getId();
    auditService.logSuccess(
            AuditEventType.PROTHESIS_READ,
            "PATIENT",
            internalPatientId != null ? String.valueOf(internalPatientId) : null,
            "Protheses patient consultees"
    );
    List<Prothesis> results = service.findByPatientAndPractitioner(internalPatientId, user);

    return ResponseEntity.ok(results.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList()));
}


}

