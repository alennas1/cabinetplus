package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.TreatmentCreateRequest;
import com.cabinetplus.backend.dto.TreatmentUpdateRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.TreatmentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    private final TreatmentService treatmentService;
    private final UserService userService;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;

    public TreatmentController(TreatmentService treatmentService, UserService userService, AuditService auditService, PublicIdResolutionService publicIdResolutionService) {
        this.treatmentService = treatmentService;
        this.userService = userService;
        this.auditService = auditService;
        this.publicIdResolutionService = publicIdResolutionService;
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    // Get all treatments for current user
    @GetMapping
    public ResponseEntity<List<Treatment>> getAllTreatments(Principal principal) {
        User currentUser = getCurrentUser(principal);
        List<Treatment> treatments = treatmentService.findByPractitioner(currentUser);
        return ResponseEntity.ok(treatments);
    }

    // Get treatment by ID for current user
    @GetMapping("/{id}")
    public ResponseEntity<Treatment> getTreatmentById(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment treatment = treatmentService.findByIdAndPractitioner(id, currentUser)
                .orElseThrow(() -> new NotFoundException("Traitement introuvable"));
        return ResponseEntity.ok(treatment);
    }

    // Create treatment
    @PostMapping
    public ResponseEntity<Treatment> createTreatment(@Valid @RequestBody TreatmentCreateRequest request, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment saved = treatmentService.createTreatment(request, currentUser);
        auditService.logSuccess(
                AuditEventType.TREATMENT_CREATE,
                "PATIENT",
                saved.getPatient() != null ? String.valueOf(saved.getPatient().getId()) : null,
                "Traitement ajoute"
        );
        return ResponseEntity.ok(saved);
    }

    // Update treatment
    @PutMapping("/{id}")
    public ResponseEntity<Treatment> updateTreatment(@PathVariable Long id,
                                                     @Valid @RequestBody TreatmentUpdateRequest request,
                                                     Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment saved = treatmentService.updateTreatment(id, request, currentUser);
        auditService.logSuccess(
                AuditEventType.TREATMENT_UPDATE,
                "PATIENT",
                saved.getPatient() != null ? String.valueOf(saved.getPatient().getId()) : null,
                "Traitement modifie"
        );
        return ResponseEntity.ok(saved);
    }

    // Delete treatment
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTreatment(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment existing = treatmentService.findByIdAndPractitioner(id, currentUser)
                .orElseThrow(() -> new NotFoundException("Traitement introuvable"));

        boolean deleted = treatmentService.deleteByPractitioner(id, currentUser);
        if (!deleted) {
            throw new NotFoundException("Traitement introuvable");
        }

        auditService.logSuccess(
                AuditEventType.TREATMENT_DELETE,
                "PATIENT",
                existing.getPatient() != null ? String.valueOf(existing.getPatient().getId()) : null,
                "Traitement supprime"
        );
        return ResponseEntity.noContent().build();
    }

    // Get treatments by patient scoped to current user
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Treatment>> getTreatmentsByPatient(@PathVariable String patientId,
                                                                  Principal principal) {
        User currentUser = getCurrentUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, currentUser).getId();
        Patient patient = new Patient();
        patient.setId(internalPatientId);
        List<Treatment> treatments = treatmentService.findByPatientAndPractitioner(patient, currentUser);
        return ResponseEntity.ok(treatments);
    }


}

