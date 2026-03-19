package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
import com.cabinetplus.backend.dto.AppointmentShiftRequest;
import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.AppointmentService;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final UserService userService;
    private final PatientService patientService;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;

    public AppointmentController(AppointmentService appointmentService, UserService userService, PatientService patientService, AuditService auditService, PublicIdResolutionService publicIdResolutionService) {
        this.appointmentService = appointmentService;
        this.userService = userService;
        this.patientService = patientService;
        this.auditService = auditService;
        this.publicIdResolutionService = publicIdResolutionService;
    }

    // Return appointments only for the logged-in practitioner
    @GetMapping
    public List<Appointment> getAllAppointments(Principal principal) {
        User currentUser = getClinicUser(principal);

        return appointmentService.findByPractitioner(currentUser);
    }

    @GetMapping("/{id:\\d+}")
    public Appointment getAppointmentById(@PathVariable Long id, Principal principal) {
        User currentUser = getClinicUser(principal);
        return appointmentService.requireByIdForPractitioner(id, currentUser);
    }

    @PostMapping
    public AppointmentResponse createAppointment(@RequestBody @Valid AppointmentRequest request, Principal principal) {
        User currentUser = getClinicUser(principal);

        Appointment saved = appointmentService.createAppointment(request, currentUser);
        PatientDto patientDto = patientService.findByIdAndUser(request.patientId(), currentUser);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_CREATE,
                "PATIENT",
                String.valueOf(patientDto.id()),
                "Rendez-vous ajoute pour " + formatPatientName(patientDto.firstname(), patientDto.lastname())
        );

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

    @PutMapping("/{id:\\d+}")
    public AppointmentResponse updateAppointment(@PathVariable Long id, @RequestBody @Valid AppointmentRequest request, Principal principal) {
        User currentUser = getClinicUser(principal);

        Appointment saved = appointmentService.updateAppointment(id, request, currentUser);
        PatientDto patientDto = patientService.findByIdAndUser(request.patientId(), currentUser);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_UPDATE,
                "PATIENT",
                String.valueOf(patientDto.id()),
                "Rendez-vous modifie pour " + formatPatientName(patientDto.firstname(), patientDto.lastname())
        );
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

    @PostMapping("/shift")
    public void shiftAppointments(@RequestBody @Valid AppointmentShiftRequest request, Principal principal) {
        User currentUser = getClinicUser(principal);

        if (request == null || request.date() == null || request.minutes() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paramètres manquants pour le décalage");
        }

        int rawMinutes = Math.max(0, request.minutes());
        final int deltaMinutes = "backward".equalsIgnoreCase(request.direction())
                ? -rawMinutes
                : rawMinutes;

        int startMinutes = request.workingDayStartMinutes() != null ? request.workingDayStartMinutes() : 0;
        int endMinutes = request.workingDayEndMinutes() != null ? request.workingDayEndMinutes() : 24 * 60;

        LocalDate baseDate = request.date();
        LocalDateTime dayStart = baseDate.atStartOfDay().plusMinutes(startMinutes);
        LocalDateTime dayEnd = endMinutes >= 24 * 60
                ? baseDate.plusDays(1).atStartOfDay()
                : baseDate.atStartOfDay().plusMinutes(endMinutes);

        List<Appointment> dayAppointments = appointmentService.findByPractitioner(currentUser).stream()
                .filter(a -> a.getDateTimeStart() != null)
                .filter(a -> a.getDateTimeEnd() != null)
                .filter(a -> a.getDateTimeStart().toLocalDate().equals(baseDate))
                .collect(Collectors.toList());

        List<Appointment> candidates = dayAppointments.stream()
                .filter(a -> a.getStatus() == null || a.getStatus().name().equals("SCHEDULED"))
                .collect(Collectors.toList());

        List<Appointment> filteredCandidates;
        if ("range".equalsIgnoreCase(request.scope())) {
            LocalTime startTime = parseTime(request.startTime());
            LocalTime endTime = parseTime(request.endTime());
            if (startTime == null || endTime == null || !endTime.isAfter(startTime)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Intervalle horaire invalide");
            }
            filteredCandidates = candidates.stream()
                    .filter(a -> {
                        LocalTime apptTime = a.getDateTimeStart().toLocalTime();
                        return !apptTime.isBefore(startTime) && apptTime.isBefore(endTime);
                    })
                    .collect(Collectors.toList());
        } else {
            filteredCandidates = candidates;
        }

        if (filteredCandidates.isEmpty()) {
            return;
        }

        class ShiftItem {
            final Appointment appt;
            final LocalDateTime newStart;
            final LocalDateTime newEnd;
            ShiftItem(Appointment appt, LocalDateTime newStart, LocalDateTime newEnd) {
                this.appt = appt;
                this.newStart = newStart;
                this.newEnd = newEnd;
            }
        }

        List<ShiftItem> shifted = filteredCandidates.stream()
                .map(a -> new ShiftItem(
                        a,
                        a.getDateTimeStart().plusMinutes(deltaMinutes),
                        a.getDateTimeEnd().plusMinutes(deltaMinutes)
                ))
                .collect(Collectors.toList());

        boolean outOfBounds = shifted.stream().anyMatch(item ->
                item.newStart.isBefore(dayStart) || item.newEnd.isAfter(dayEnd)
        );
        if (outOfBounds) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de décaler : certains rendez-vous sortiraient des horaires. Modifiez vos horaires dans Préférences."
            );
        }

        List<Appointment> blockers = dayAppointments.stream()
                .filter(a -> filteredCandidates.stream().noneMatch(c -> c.getId().equals(a.getId())))
                .filter(a -> !isCancelled(a))
                .collect(Collectors.toList());

        boolean overlaps = shifted.stream().anyMatch(item ->
                blockers.stream().anyMatch(other ->
                        item.newStart.isBefore(other.getDateTimeEnd()) &&
                        item.newEnd.isAfter(other.getDateTimeStart())
                )
        );
        if (overlaps) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de décaler : chevauchement avec d'autres rendez-vous."
            );
        }

        shifted.forEach(item -> {
            item.appt.setDateTimeStart(item.newStart);
            item.appt.setDateTimeEnd(item.newEnd);
        });

        List<AppointmentService.RescheduleItem> updates = shifted.stream()
                .map(item -> new AppointmentService.RescheduleItem(item.appt.getId(), item.newStart, item.newEnd))
                .collect(Collectors.toList());
        appointmentService.rescheduleAppointments(updates, currentUser);
    }

    @DeleteMapping("/{id:\\d+}")
    public void deleteAppointment(@PathVariable Long id, Principal principal) {
        User currentUser = getClinicUser(principal);
        Appointment existing = appointmentService.deleteAppointment(id, currentUser);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_DELETE,
                "PATIENT",
                existing != null && existing.getPatient() != null
                        ? String.valueOf(existing.getPatient().getId())
                        : null,
                existing != null
                        ? "Rendez-vous supprime pour " + formatPatientName(
                                existing.getPatient() != null ? existing.getPatient().getFirstname() : null,
                                existing.getPatient() != null ? existing.getPatient().getLastname() : null
                        )
                        : "Rendez-vous supprime: #" + id
        );
    }

    @GetMapping("/patient/{patientId}")
    public List<Appointment> getAppointmentsByPatient(@PathVariable String patientId, Principal principal) {
        User ownerDentist = getClinicUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();
        Patient patient = new Patient();
        patient.setId(internalPatientId);
        return appointmentService.findByPatient(patient);
    }

    @GetMapping("/practitioner/{practitionerId}")
    public List<Appointment> getAppointmentsByPractitioner(@PathVariable Long practitionerId, Principal principal) {
        User requester = getClinicUser(principal);
        User practitioner = requireClinicPractitioner(practitionerId, requester);
        return appointmentService.findByPractitioner(practitioner);
    }

  @GetMapping("/stats/completed-today")
public Map<String, Object> getComparisonStats(Principal principal) {

    User user = getClinicUser(principal);

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

    private User getClinicUser(Principal principal) {
        User currentUser = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        return userService.resolveClinicOwner(currentUser);
    }

    private User requireClinicPractitioner(Long practitionerId, User clinicOwner) {
        User target = userService.findById(practitionerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Praticien introuvable"));

        User targetOwner = userService.resolveClinicOwner(target);
        if (targetOwner == null
                || clinicOwner == null
                || clinicOwner.getId() == null
                || targetOwner.getId() == null
                || !targetOwner.getId().equals(clinicOwner.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Praticien introuvable");
        }

        return target;
    }

    private LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalTime.parse(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean isCancelled(Appointment appointment) {
        if (appointment == null || appointment.getStatus() == null) return false;
        String status = appointment.getStatus().name();
        return "CANCELLED".equalsIgnoreCase(status) || "CANCELED".equalsIgnoreCase(status);
    }

    private String formatPatientName(String firstname, String lastname) {
        String first = firstname != null ? firstname.trim() : "";
        String last = lastname != null ? lastname.trim() : "";
        String fullName = (first + " " + last).trim();
        return fullName.isEmpty() ? "patient inconnu" : fullName;
    }

}
