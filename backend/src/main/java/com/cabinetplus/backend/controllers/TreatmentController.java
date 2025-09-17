package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
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

    public TreatmentController(TreatmentService treatmentService, UserService userService) {
        this.treatmentService = treatmentService;
        this.userService = userService;
    }

    private User getCurrentUser(Principal principal) {
        return userService.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
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
        return ResponseEntity.ok(saved);
    }

    // Update treatment
    @PutMapping("/{id}")
    public ResponseEntity<Treatment> updateTreatment(@PathVariable Long id,
                                                     @RequestBody Treatment treatment,
                                                     Principal principal) {
        User currentUser = getCurrentUser(principal);
        Optional<Treatment> updated = treatmentService.update(id, treatment, currentUser);
        return updated.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // Delete treatment
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTreatment(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        boolean deleted = treatmentService.deleteByPractitioner(id, currentUser);
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
}
