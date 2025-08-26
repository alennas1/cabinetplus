package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.services.MedicationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    private final MedicationService medicationService;

    public MedicationController(MedicationService medicationService) {
        this.medicationService = medicationService;
    }

    @GetMapping
    public List<Medication> getAllMedications() {
        return medicationService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<Medication> getMedicationById(@PathVariable Long id) {
        return medicationService.findById(id);
    }

    @PostMapping
    public Medication createMedication(@RequestBody Medication medication) {
        return medicationService.save(medication);
    }

    @PutMapping("/{id}")
    public Medication updateMedication(@PathVariable Long id, @RequestBody Medication medication) {
        medication.setId(id);
        return medicationService.save(medication);
    }

    @DeleteMapping("/{id}")
    public void deleteMedication(@PathVariable Long id) {
        medicationService.delete(id);
    }
}
