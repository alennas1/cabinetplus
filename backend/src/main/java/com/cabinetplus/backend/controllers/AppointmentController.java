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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.AppointmentRequest;
import com.cabinetplus.backend.dto.AppointmentResponse;
import com.cabinetplus.backend.dto.AppointmentShiftRequest;
import com.cabinetplus.backend.dto.AppointmentCancellationRequest;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.AppointmentStatus;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.AppointmentService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PagedQueryUtil;
import com.cabinetplus.backend.util.PaginationUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final UserService userService;
    private final PatientService patientService;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final CancellationSecurityService cancellationSecurityService;

    public AppointmentController(AppointmentService appointmentService,
                                 UserService userService,
                                 PatientService patientService,
                                 AuditService auditService,
                                 PublicIdResolutionService publicIdResolutionService,
                                 CancellationSecurityService cancellationSecurityService) {
        this.appointmentService = appointmentService;
        this.userService = userService;
        this.patientService = patientService;
        this.auditService = auditService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.cancellationSecurityService = cancellationSecurityService;
    }

    // Return appointments only for the logged-in practitioner
    @GetMapping
    public List<Appointment> getAllAppointments(
            @RequestParam(name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Principal principal
    ) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parametres from et to obligatoires (format ISO: yyyy-MM-dd)");
        }
        User currentUser = getClinicUser(principal);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_READ,
                "APPOINTMENT",
                null,
                "Rendez-vous consultes"
        );
        LocalDateTime fromStart = from.atStartOfDay();
        LocalDateTime toEndExclusive = to.plusDays(1).atStartOfDay();
        return appointmentService.findByPractitionerInRange(currentUser, fromStart, toEndExclusive);
    }

    @GetMapping("/{id:\\d+}")
    public Appointment getAppointmentById(@PathVariable Long id, Principal principal) {
        User currentUser = getClinicUser(principal);
        Appointment appointment = appointmentService.requireByIdForPractitioner(id, currentUser);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_READ,
                "PATIENT",
                appointment != null && appointment.getPatient() != null && appointment.getPatient().getId() != null
                        ? String.valueOf(appointment.getPatient().getId())
                        : null,
                "Rendez-vous consulte"
        );
        return appointment;
    }

    @PostMapping
    public AppointmentResponse createAppointment(@RequestBody @Valid AppointmentRequest request, Principal principal) {
        User actor = getActor(principal);
        User currentUser = userService.resolveClinicOwner(actor);

        Appointment saved = appointmentService.createAppointment(request, currentUser, actor);
        PatientDto patientDto = patientService.findByIdAndUser(request.patientId(), currentUser);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_CREATE,
                "PATIENT",
                String.valueOf(patientDto.id()),
                "Rendez-vous ajoute"
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
        User actor = getActor(principal);
        User currentUser = userService.resolveClinicOwner(actor);

        Appointment saved = appointmentService.updateAppointment(id, request, currentUser, actor);
        PatientDto patientDto = patientService.findByIdAndUser(request.patientId(), currentUser);
        boolean cancelled = isCancelled(saved);
        auditService.logSuccess(
                cancelled ? AuditEventType.APPOINTMENT_CANCEL : AuditEventType.APPOINTMENT_UPDATE,
                "PATIENT",
                String.valueOf(patientDto.id()),
                cancelled ? "Rendez-vous annule" : "Rendez-vous modifie"
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
        User actor = getActor(principal);
        User currentUser = userService.resolveClinicOwner(actor);

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

        List<Appointment> dayAppointments = appointmentService.findByPractitionerInRange(currentUser, dayStart, dayEnd).stream()
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
        appointmentService.rescheduleAppointments(updates, currentUser, actor);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_UPDATE,
                "APPOINTMENT",
                null,
                "Rendez-vous decales"
        );
    }

    @PutMapping("/{id:\\d+}/cancel")
    public void cancelAppointment(@PathVariable Long id, @Valid @RequestBody AppointmentCancellationRequest payload, Principal principal) {
        User actor = getActor(principal);
        User currentUser = userService.resolveClinicOwner(actor);
        String reason = cancellationSecurityService.requireReason(payload.reason());
        Appointment existing = appointmentService.cancelAppointment(id, currentUser, actor, reason);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_CANCEL,
                "PATIENT",
                existing != null && existing.getPatient() != null
                        ? String.valueOf(existing.getPatient().getId())
                        : null,
                existing != null
                        ? ("Rendez-vous annulé. Motif: " + reason)
                        : ("Rendez-vous annulé: #" + id + ". Motif: " + reason)
        );
    }

    @GetMapping("/patient/{patientId}")
    public List<Appointment> getAppointmentsByPatient(@PathVariable String patientId, Principal principal) {
        User ownerDentist = getClinicUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_READ,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Rendez-vous patient consultes"
        );
        Patient patient = new Patient();
        patient.setId(internalPatientId);
        return appointmentService.findByPatient(patient);
    }

    @GetMapping("/patient/{patientId}/paged")
    public PageResponse<Appointment> getAppointmentsByPatientPaged(
            @PathVariable String patientId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "field", required = false) String field,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal
    ) {
        User ownerDentist = getClinicUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, ownerDentist).getId();

        String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        fieldNorm = fieldNorm.isBlank() ? "notes" : fieldNorm;
        final String fieldKey = fieldNorm;
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        String statusNorm = status != null ? status.trim().toUpperCase() : "";

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        AppointmentStatus statusEnum = null;
        if (!statusNorm.isBlank()) {
            try {
                statusEnum = AppointmentStatus.valueOf(statusNorm);
            } catch (Exception ignored) {
                statusEnum = null;
            }
        }

        String qNorm = q != null ? q.trim() : "";
        boolean hasQuery = !qNorm.isBlank();

        LocalDate effectiveFrom = from;
        LocalDate effectiveTo = to;

        if (hasQuery && "date".equalsIgnoreCase(fieldKey)) {
            try {
                LocalDate parsed = LocalDate.parse(qNorm.trim());
                if (effectiveFrom == null) effectiveFrom = parsed;
                if (effectiveTo == null) effectiveTo = parsed;
                hasQuery = false;
            } catch (Exception ignored) {
                // Unparseable "date" query -> empty result set.
                effectiveFrom = LocalDate.of(3000, 1, 1);
                effectiveTo = LocalDate.of(3000, 1, 1);
                hasQuery = false;
            }
        }

        boolean fromEnabled = effectiveFrom != null;
        boolean toEnabled = effectiveTo != null;
        LocalDateTime fromStart = fromEnabled ? effectiveFrom.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
        LocalDateTime toEndExclusive = toEnabled ? effectiveTo.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

        String notesLike = "";
        if (hasQuery && ("notes".equalsIgnoreCase(fieldKey) || fieldKey.isBlank())) {
            notesLike = "%" + qNorm.trim().toLowerCase() + "%";
        }

        Sort.Direction direction = desc ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = switch (sortKeyNorm) {
            case "date", "time" -> Sort.by(direction, "dateTimeStart");
            case "status" -> Sort.by(direction, "status");
            case "notes" -> Sort.by(direction, "notes");
            default -> Sort.by(Sort.Direction.DESC, "dateTimeStart");
        };
        sort = sort.and(Sort.by(Sort.Direction.ASC, "id"));

        PageRequest pageable = PageRequest.of(safePage, safeSize, sort);
        var paged = appointmentService.searchByPatientId(
                internalPatientId,
                statusEnum,
                fromEnabled,
                fromStart,
                toEnabled,
                toEndExclusive,
                notesLike,
                pageable
        );
        return PaginationUtil.toPageResponse(paged);
    }

    @GetMapping("/practitioner/{practitionerId}")
    public List<Appointment> getAppointmentsByPractitioner(@PathVariable Long practitionerId, Principal principal) {
        User requester = getClinicUser(principal);
        User practitioner = requireClinicPractitioner(practitionerId, requester);
        auditService.logSuccess(
                AuditEventType.APPOINTMENT_READ,
                "USER",
                practitioner != null && practitioner.getId() != null ? String.valueOf(practitioner.getId()) : null,
                "Rendez-vous praticien consultes"
        );
        return appointmentService.findByPractitioner(practitioner);
    }

  @GetMapping("/stats/completed-today")
public Map<String, Object> getComparisonStats(Principal principal) {

    User user = getClinicUser(principal);
    auditService.logSuccess(
        AuditEventType.APPOINTMENT_READ,
        "USER",
        user != null && user.getId() != null ? String.valueOf(user.getId()) : null,
        "Stats rendez-vous consultees"
    );

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
        return userService.resolveClinicOwner(getActor(principal));
    }

    private User getActor(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
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

    private static java.util.Comparator<Appointment> buildAppointmentSortComparator(String sortKeyNorm, boolean desc) {
        var stringComparator = PagedQueryUtil.stringComparator(desc);
        var dateTimeComparator = PagedQueryUtil.dateTimeComparator(desc);

        java.util.Comparator<Appointment> comparator = switch (sortKeyNorm) {
            case "date", "time" -> java.util.Comparator.comparing(
                    a -> a != null ? a.getDateTimeStart() : null,
                    dateTimeComparator
            );
            case "notes" -> java.util.Comparator.comparing(a -> a != null ? a.getNotes() : null, stringComparator);
            case "status" -> java.util.Comparator.comparing(
                    a -> a != null && a.getStatus() != null ? a.getStatus().name() : null,
                    stringComparator
            );
            default -> java.util.Comparator.comparing(
                    a -> a != null ? a.getDateTimeStart() : null,
                    PagedQueryUtil.dateTimeComparator(true)
            );
        };

        return comparator.thenComparing(a -> a != null ? a.getId() : null, PagedQueryUtil.longComparator(false));
    }

}
