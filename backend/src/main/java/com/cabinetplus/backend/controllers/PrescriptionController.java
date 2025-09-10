package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PrescriptionDTO;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.PrescriptionService;
import com.cabinetplus.backend.services.UserService;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final UserService userService;

    public PrescriptionController(PrescriptionService prescriptionService, UserService userService) {
        this.prescriptionService = prescriptionService;
        this.userService = userService;
    }

    // Get all prescriptions for the logged-in practitioner
    @GetMapping
    public List<Prescription> getAllPrescriptions(Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return prescriptionService.findByPractitioner(currentUser);
    }

    @GetMapping("/{id}")
    public Optional<Prescription> getPrescriptionById(@PathVariable Long id, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<Prescription> prescription = prescriptionService.findById(id);
        // Ensure the prescription belongs to the logged-in practitioner
        if (prescription.isPresent() && !prescription.get().getPractitioner().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }
        return prescription;
    }

    @PostMapping
    public Prescription createPrescription(@RequestBody PrescriptionDTO dto, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Override practitionerId to logged-in user for security
        PrescriptionDTO dtoWithPractitioner = new PrescriptionDTO(
                dto.patientId(),
                currentUser.getId(),
                dto.notes(),
                dto.medications()
        );

        return prescriptionService.createPrescription(dtoWithPractitioner);
    }

    @PutMapping("/{id}")
    public Prescription updatePrescription(@PathVariable Long id,
                                           @RequestBody PrescriptionDTO dto,
                                           Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Override practitionerId to logged-in user
        PrescriptionDTO dtoWithPractitioner = new PrescriptionDTO(
                dto.patientId(),
                currentUser.getId(),
                dto.notes(),
                dto.medications()
        );

        return prescriptionService.updatePrescription(id, dtoWithPractitioner);
    }

    @DeleteMapping("/{id}")
    public void deletePrescription(@PathVariable Long id, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<Prescription> prescription = prescriptionService.findById(id);
        if (prescription.isPresent() && !prescription.get().getPractitioner().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }

        prescriptionService.delete(id);
    }

    @GetMapping("/patient/{patientId}")
    public List<Prescription> getPrescriptionsByPatient(@PathVariable Long patientId, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Filter prescriptions for patient and current practitioner
        Patient patient = new Patient();
        patient.setId(patientId);
        return prescriptionService.findByPatientAndPractitioner(patient, currentUser);
    }
}
