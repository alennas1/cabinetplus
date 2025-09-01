package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.web.bind.annotation.*;

import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final UserService userService;

    public PatientController(PatientService patientService, UserService userService) {
        this.patientService = patientService;
        this.userService = userService;
    }

    // Dentist sees DTO list
    @GetMapping
    public List<PatientDto> getAllPatients() {
        return patientService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<PatientDto> getPatientById(@PathVariable Long id) {
        return patientService.findById(id);
    }

    // ✅ Create Patient (backend fills createdBy + createdAt)
    @PostMapping
    public PatientDto createPatient(@RequestBody Patient patient, Principal principal) {
        String username = principal.getName(); // comes from JWT
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        patient.setCreatedBy(currentUser);
        patient.setCreatedAt(LocalDateTime.now());

        return patientService.saveAndConvert(patient);
    }

    // ✅ Update patient (only patient data, keep createdBy/createdAt untouched)
    @PutMapping("/{id}")
    public PatientDto updatePatient(@PathVariable Long id, @RequestBody Patient patient) {
        return patientService.update(id, patient);
    }

    @DeleteMapping("/{id}")
    public void deletePatient(@PathVariable Long id) {
        patientService.delete(id);
    }
}
