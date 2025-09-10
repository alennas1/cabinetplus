package com.cabinetplus.backend.controllers;

import java.security.Principal;
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

import com.cabinetplus.backend.dto.AppointmentRequest;
import com.cabinetplus.backend.dto.AppointmentResponse;
import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AppointmentService;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final UserService userService; //  inject userService
    private final PatientService patientService; // 💡 inject patientService

    public AppointmentController(AppointmentService appointmentService, UserService userService, PatientService patientService) {
        this.appointmentService = appointmentService;
        this.userService = userService;
        this.patientService = patientService;
    }

    //  Return appointments only for the logged-in practitioner
    @GetMapping
    public List<Appointment> getAllAppointments(Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return appointmentService.findByPractitioner(currentUser);
    }

    @GetMapping("/{id}")
    public Optional<Appointment> getAppointmentById(@PathVariable Long id) {
        return appointmentService.findById(id);
    }

  @PostMapping
public AppointmentResponse createAppointment(@RequestBody AppointmentRequest request, Principal principal) {
    String username = principal.getName();
    User currentUser = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

    // Build entity
    Appointment appointment = new Appointment();
    appointment.setDateTimeStart(request.dateTimeStart());
    appointment.setDateTimeEnd(request.dateTimeEnd());
    appointment.setStatus(request.status());

   PatientDto patientDto = patientService.findById(request.patientId())
        .orElseThrow(() -> new RuntimeException("Patient not found")); Patient patientEntity = new Patient();
    patientEntity.setId(patientDto.id());
    appointment.setPatient(patientEntity);

    appointment.setPractitioner(currentUser);

    Appointment saved = appointmentService.save(appointment);

    return new AppointmentResponse(
            saved.getId(),
            saved.getDateTimeStart(),
            saved.getDateTimeEnd(),
            saved.getStatus(),   // status is already AppointmentStatus
            saved.getNotes(),
            patientDto,
            currentUser.getId(),
            currentUser.getFirstname(),
            currentUser.getLastname()
    );
}



    @PutMapping("/{id}")
    public Appointment updateAppointment(@PathVariable Long id, @RequestBody Appointment appointment) {
        appointment.setId(id);
        return appointmentService.save(appointment);
    }

    @DeleteMapping("/{id}")
    public void deleteAppointment(@PathVariable Long id) {
        appointmentService.delete(id);
    }

    @GetMapping("/patient/{patientId}")
    public List<Appointment> getAppointmentsByPatient(@PathVariable Long patientId) {
        Patient patient = new Patient();
        patient.setId(patientId);
        return appointmentService.findByPatient(patient);
    }

    @GetMapping("/practitioner/{practitionerId}")
    public List<Appointment> getAppointmentsByPractitioner(@PathVariable Long practitionerId) {
        User practitioner = new User();
        practitioner.setId(practitionerId);
        return appointmentService.findByPractitioner(practitioner);
    }
}
