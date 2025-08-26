package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.TreatmentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    private final TreatmentService treatmentService;

    public TreatmentController(TreatmentService treatmentService) {
        this.treatmentService = treatmentService;
    }

    @GetMapping
    public List<Treatment> getAllTreatments() {
        return treatmentService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<Treatment> getTreatmentById(@PathVariable Long id) {
        return treatmentService.findById(id);
    }

    @PostMapping
    public Treatment createTreatment(@RequestBody Treatment treatment) {
        return treatmentService.save(treatment);
    }

    @PutMapping("/{id}")
    public Treatment updateTreatment(@PathVariable Long id, @RequestBody Treatment treatment) {
        treatment.setId(id);
        return treatmentService.save(treatment);
    }

    @DeleteMapping("/{id}")
    public void deleteTreatment(@PathVariable Long id) {
        treatmentService.delete(id);
    }

    // Extra endpoints
    @GetMapping("/patient/{patientId}")
    public List<Treatment> getTreatmentsByPatient(@PathVariable Long patientId) {
        Patient patient = new Patient();
        patient.setId(patientId);
        return treatmentService.findByPatient(patient);
    }

    @GetMapping("/practitioner/{practitionerId}")
    public List<Treatment> getTreatmentsByPractitioner(@PathVariable Long practitionerId) {
        User practitioner = new User();
        practitioner.setId(practitionerId);
        return treatmentService.findByPractitioner(practitioner);
    }
}
