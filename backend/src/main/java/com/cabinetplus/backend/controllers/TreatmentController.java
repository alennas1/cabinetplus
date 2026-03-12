package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.TreatmentService;
import com.cabinetplus.backend.services.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    private final TreatmentService treatmentService;
    private final UserService userService;
    private final AuditService auditService;

    public TreatmentController(TreatmentService treatmentService, UserService userService, AuditService auditService) {
        this.treatmentService = treatmentService;
        this.userService = userService;
        this.auditService = auditService;
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
        Optional<Treatment> treatment = treatmentService.findByIdAndPractitioner(id, currentUser);
        return treatment.map(ResponseEntity::ok)
                        .orElse(ResponseEntity.notFound().build());
    }

    // Create treatment
    @PostMapping
    public ResponseEntity<Treatment> createTreatment(@RequestBody Treatment treatment, Principal principal) {
        User currentUser = getCurrentUser(principal);
        treatment.setPractitioner(currentUser);
        Treatment saved = treatmentService.save(treatment);
        auditService.logSuccess(
                AuditEventType.TREATMENT_CREATE,
                "TREATMENT",
                String.valueOf(saved.getId()),
                "Traitement ajoute pour " + formatPatientName(saved.getPatient())
        );
        return ResponseEntity.ok(saved);
    }

    // Update treatment
    @PutMapping("/{id}")
    public ResponseEntity<Treatment> updateTreatment(@PathVariable Long id,
                                                     @RequestBody Treatment treatment,
                                                     Principal principal) {
        User currentUser = getCurrentUser(principal);
        Optional<Treatment> updated = treatmentService.update(id, treatment, currentUser);
        updated.ifPresent(saved -> auditService.logSuccess(
                AuditEventType.TREATMENT_UPDATE,
                "TREATMENT",
                String.valueOf(saved.getId()),
                "Traitement modifie pour " + formatPatientName(saved.getPatient())
        ));
        return updated.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // Delete treatment
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTreatment(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Optional<Treatment> existing = treatmentService.findByIdAndPractitioner(id, currentUser);
        boolean deleted = treatmentService.deleteByPractitioner(id, currentUser);
        if (deleted) {
            auditService.logSuccess(
                    AuditEventType.TREATMENT_DELETE,
                    "TREATMENT",
                    String.valueOf(id),
                    existing.map(treatment -> "Traitement supprime pour " + formatPatientName(treatment.getPatient()))
                            .orElse("Traitement supprime: #" + id)
            );
        }
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // Get treatments by patient scoped to current user
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Treatment>> getTreatmentsByPatient(@PathVariable Long patientId,
                                                                  Principal principal) {
        User currentUser = getCurrentUser(principal);
        Patient patient = new Patient();
        patient.setId(patientId);
        List<Treatment> treatments = treatmentService.findByPatientAndPractitioner(patient, currentUser);
        return ResponseEntity.ok(treatments);
    }

    private String formatPatientName(Patient patient) {
        if (patient == null) return "patient inconnu";
        String first = patient.getFirstname() != null ? patient.getFirstname().trim() : "";
        String last = patient.getLastname() != null ? patient.getLastname().trim() : "";
        String fullName = (first + " " + last).trim();
        return fullName.isEmpty() ? "patient inconnu" : fullName;
    }
}

