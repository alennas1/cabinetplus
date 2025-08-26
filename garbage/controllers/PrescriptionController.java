package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Prescription;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.PrescriptionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @GetMapping
    public List<Prescription> getAllPrescriptions() {
        return prescriptionService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<Prescription> getPrescriptionById(@PathVariable Long id) {
        return prescriptionService.findById(id);
    }

    @PostMapping
    public Prescription createPrescription(@RequestBody Prescription prescription) {
        return prescriptionService.save(prescription);
    }

    @PutMapping("/{id}")
    public Prescription updatePrescription(@PathVariable Long id, @RequestBody Prescription prescription) {
        prescription.setId(id);
        return prescriptionService.save(prescription);
    }

    @DeleteMapping("/{id}")
    public void deletePrescription(@PathVariable Long id) {
        prescriptionService.delete(id);
    }

    // 🔍 Extra endpoint: prescriptions by patient
    @GetMapping("/patient/{patientId}")
    public List<Prescription> getPrescriptionsByPatient(@PathVariable Long patientId) {
        Patient patient = new Patient();
        patient.setId(patientId);
        return prescriptionService.findByPatient(patient);
    }

    // 🔍 Extra endpoint: prescriptions by practitioner
    @GetMapping("/practitioner/{practitionerId}")
    public List<Prescription> getPrescriptionsByPractitioner(@PathVariable Long practitionerId) {
        User practitioner = new User();
        practitioner.setId(practitionerId);
        return prescriptionService.findByPractitioner(practitioner);
    }
}
