package com.cabinetplus.backend.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.services.PrescriptionMedicationService;

@RestController
@RequestMapping("/api/prescription-medications")
public class PrescriptionMedicationController {

    private final PrescriptionMedicationService prescriptionMedicationService;

    public PrescriptionMedicationController(PrescriptionMedicationService prescriptionMedicationService) {
        this.prescriptionMedicationService = prescriptionMedicationService;
    }

    // ===================== GET =====================
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR')")
    public List<PrescriptionMedication> getAllPrescriptionMedications() {
        return prescriptionMedicationService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR')")
    public Optional<PrescriptionMedication> getPrescriptionMedicationById(@PathVariable Long id) {
        return prescriptionMedicationService.findById(id);
    }

    @GetMapping("/prescription/{prescriptionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR')")
    public List<PrescriptionMedication> getByPrescription(@PathVariable Long prescriptionId) {
        Prescription prescription = new Prescription();
        prescription.setId(prescriptionId);
        return prescriptionMedicationService.findByPrescription(prescription);
    }

    // ===================== POST =====================
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR')")
    public PrescriptionMedication createPrescriptionMedication(@RequestBody PrescriptionMedication med) {
        return prescriptionMedicationService.save(med);
    }

    // ===================== PUT =====================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR')")
    public PrescriptionMedication updatePrescriptionMedication(@PathVariable Long id, @RequestBody PrescriptionMedication med) {
        med.setId(id);
        return prescriptionMedicationService.save(med);
    }

    // ===================== DELETE =====================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR')")
    public void deletePrescriptionMedication(@PathVariable Long id) {
        prescriptionMedicationService.delete(id);
    }
}
