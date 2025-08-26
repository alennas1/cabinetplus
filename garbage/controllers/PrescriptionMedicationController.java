package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.PrescriptionMedication;
import com.cabinetplus.backend.services.PrescriptionMedicationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/prescription-medications")
public class PrescriptionMedicationController {

    private final PrescriptionMedicationService prescriptionMedicationService;

    public PrescriptionMedicationController(PrescriptionMedicationService prescriptionMedicationService) {
        this.prescriptionMedicationService = prescriptionMedicationService;
    }

    @GetMapping
    public List<PrescriptionMedication> getAllPrescriptionMedications() {
        return prescriptionMedicationService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<PrescriptionMedication> getPrescriptionMedicationById(@PathVariable Long id) {
        return prescriptionMedicationService.findById(id);
    }

    @PostMapping
    public PrescriptionMedication createPrescriptionMedication(@RequestBody PrescriptionMedication prescriptionMedication) {
        return prescriptionMedicationService.save(prescriptionMedication);
    }

    @PutMapping("/{id}")
    public PrescriptionMedication updatePrescriptionMedication(@PathVariable Long id, @RequestBody PrescriptionMedication prescriptionMedication) {
        prescriptionMedication.setId(id);
        return prescriptionMedicationService.save(prescriptionMedication);
    }

    @DeleteMapping("/{id}")
    public void deletePrescriptionMedication(@PathVariable Long id) {
        prescriptionMedicationService.delete(id);
    }

    // 🔍 Extra endpoint: prescription medications by prescription
    @GetMapping("/prescription/{prescriptionId}")
    public List<PrescriptionMedication> getByPrescription(@PathVariable Long prescriptionId) {
        Prescription prescription = new Prescription();
        prescription.setId(prescriptionId);
        return prescriptionMedicationService.findByPrescription(prescription);
    }
}
