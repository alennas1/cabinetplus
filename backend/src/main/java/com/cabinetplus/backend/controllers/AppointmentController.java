package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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
    private final UserService userService;
    private final PatientService patientService;

    public AppointmentController(AppointmentService appointmentService, UserService userService, PatientService patientService) {
        this.appointmentService = appointmentService;
        this.userService = userService;
        this.patientService = patientService;
    }

    // Return appointments only for the logged-in practitioner
    @GetMapping
    public List<Appointment> getAllAppointments(Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Overlap check
        List<Appointment> overlapping = appointmentService.findByPractitioner(currentUser).stream()
                .filter(a ->
                        a.getDateTimeStart().isBefore(request.dateTimeEnd()) &&
                        a.getDateTimeEnd().isAfter(request.dateTimeStart())
                )
                .collect(Collectors.toList());

        if (!overlapping.isEmpty()) {
            // Retourner 409 CONFLICT
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Appointment overlaps with existing appointments");
        }

        // Build appointment
        Appointment appointment = new Appointment();
        appointment.setDateTimeStart(request.dateTimeStart());
        appointment.setDateTimeEnd(request.dateTimeEnd());
        appointment.setStatus(request.status());

        PatientDto patientDto = patientService.findById(request.patientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found"));
        Patient patientEntity = new Patient();
        patientEntity.setId(patientDto.id());
        appointment.setPatient(patientEntity);

        appointment.setPractitioner(currentUser);

        Appointment saved = appointmentService.save(appointment);

        return new AppointmentResponse(
                saved.getId(),
                saved.getDateTimeStart(),
                saved.getDateTimeEnd(),
                saved.getStatus(),
                saved.getNotes(),
                patientDto,
                currentUser.getId(),
                currentUser.getFirstname(),
                currentUser.getLastname()
        );
    }

    @PutMapping("/{id}")
    public Appointment updateAppointment(@PathVariable Long id, @RequestBody Appointment updatedAppointment, Principal principal) {
        String username = principal.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Overlap check (ignore current appointment)
        List<Appointment> overlapping = appointmentService.findByPractitioner(currentUser).stream()
                .filter(a -> !a.getId().equals(id)) // ignore itself
                .filter(a ->
                        a.getDateTimeStart().isBefore(updatedAppointment.getDateTimeEnd()) &&
                        a.getDateTimeEnd().isAfter(updatedAppointment.getDateTimeStart())
                )
                .collect(Collectors.toList());

        if (!overlapping.isEmpty()) {
            // Retourner 409 CONFLICT
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Appointment overlaps with existing appointments");
        }

        updatedAppointment.setId(id);
        updatedAppointment.setPractitioner(currentUser);

        return appointmentService.save(updatedAppointment);
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

  @GetMapping("/stats/completed-today")
public Map<String, Object> getComparisonStats(Principal principal) {

    User user = userService.findByUsername(principal.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    LocalDate today = LocalDate.now();
    LocalDate yesterday = today.minusDays(1);

    Long todayCompleted = appointmentService.getCompletedAppointmentsForPractitionerOnDate(user, today);
    Long yesterdayCompleted = appointmentService.getCompletedAppointmentsForPractitionerOnDate(user, yesterday);

    Long todayNewPatients = appointmentService.getCompletedAppointmentsWithNewPatientsForPractitionerOnDate(user, today);
    Long yesterdayNewPatients = appointmentService.getCompletedAppointmentsWithNewPatientsForPractitionerOnDate(user, yesterday);

    return Map.of(
        "completed", Map.of(
                "today", todayCompleted,
                "yesterday", yesterdayCompleted,
                "difference", todayCompleted - yesterdayCompleted
        ),
        "newPatients", Map.of(
                "today", todayNewPatients,
                "yesterday", yesterdayNewPatients,
                "difference", todayNewPatients - yesterdayNewPatients
        )
    );
}

}
