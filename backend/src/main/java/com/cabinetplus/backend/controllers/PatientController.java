package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AppointmentService;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final UserService userService;
    private final AppointmentService appointmentService;

    public PatientController(PatientService patientService, UserService userService, AppointmentService appointmentService) {
        this.patientService = patientService;
        this.userService = userService;
        this.appointmentService = appointmentService;
    }

    // Dentist sees DTO list
  @GetMapping
public List<PatientDto> getAllPatients(Principal principal) {
    String username = principal.getName();
    User currentUser = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
    return patientService.findByCreatedBy(currentUser); // only patients created by this user
}

    @GetMapping("/{id}")
    public Optional<PatientDto> getPatientById(@PathVariable Long id) {
        return patientService.findById(id);
    }

    //  Create Patient (backend fills createdBy + createdAt)
    @PostMapping
    public PatientDto createPatient(@RequestBody Patient patient, Principal principal) {
        String username = principal.getName(); // comes from JWT
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        patient.setCreatedBy(currentUser);
        patient.setCreatedAt(LocalDateTime.now());

        return patientService.saveAndConvert(patient);
    }

    //  Update patient (only patient data, keep createdBy/createdAt untouched)
    @PutMapping("/{id}")
    public PatientDto updatePatient(@PathVariable Long id, @RequestBody Patient patient) {
        return patientService.update(id, patient);
    }

    @DeleteMapping("/{id}")
    public void deletePatient(@PathVariable Long id) {
        patientService.delete(id);
    }
  @PostMapping("/with-appointment")
    public PatientDto createPatientWithAppointment(@RequestBody Patient patient, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        patient.setCreatedBy(currentUser);
        patient.setCreatedAt(LocalDateTime.now());

        // Save patient
        PatientDto savedPatient = patientService.saveAndConvert(patient);

        // Fake next available slot: today at 9h or now+1h if already passed
        LocalDateTime nextSlot = LocalDateTime.now().withHour(9).withMinute(0).withSecond(0);
        if (nextSlot.isBefore(LocalDateTime.now())) {
            nextSlot = LocalDateTime.now().plusHours(1);
        }

        // Create appointment
        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setPractitioner(currentUser);
        appointment.setDateTimeStart(nextSlot);
        appointment.setDateTimeEnd(nextSlot.plusMinutes(30));

        appointmentService.save(appointment);

        return savedPatient;
    }
}

