package com.cabinetplus.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.AppointmentRequest;
import com.cabinetplus.backend.enums.AppointmentStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.ConflictException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.AppointmentRepository;
import com.cabinetplus.backend.repositories.PatientRepository;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final ReferenceCodeGeneratorService referenceCodeGeneratorService;

    public AppointmentService(AppointmentRepository appointmentRepository, PatientRepository patientRepository, ReferenceCodeGeneratorService referenceCodeGeneratorService) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.referenceCodeGeneratorService = referenceCodeGeneratorService;
    }

    public List<Appointment> findAll() {
        return appointmentRepository.findAll();
    }

    public Optional<Appointment> findById(Long id) {
        return appointmentRepository.findById(id);
    }

    public List<Appointment> findByPatient(Patient patient) {
        return appointmentRepository.findByPatient(patient);
    }

    public Page<Appointment> searchByPatientId(
            Long patientId,
            AppointmentStatus status,
            boolean fromEnabled,
            LocalDateTime fromStart,
            boolean toEnabled,
            LocalDateTime toEndExclusive,
            String notesLike,
            Pageable pageable
    ) {
        if (patientId == null) {
            return Page.empty(pageable);
        }
        return appointmentRepository.searchByPatientId(
                patientId,
                status,
                fromEnabled,
                fromStart,
                toEnabled,
                toEndExclusive,
                notesLike,
                pageable
        );
    }

    public List<Appointment> findByPractitioner(User practitioner) {
        return appointmentRepository.findByPractitioner(practitioner);
    }

    public List<Appointment> findByPractitionerInRange(User practitioner, LocalDateTime startInclusive, LocalDateTime endExclusive) {
        if (practitioner == null || startInclusive == null || endExclusive == null) {
            return List.of();
        }
        return appointmentRepository.findByPractitionerAndDateTimeStartGreaterThanEqualAndDateTimeStartLessThanOrderByDateTimeStartAsc(
                practitioner,
                startInclusive,
                endExclusive
        );
    }

    public List<Appointment> findBetween(LocalDateTime start, LocalDateTime end) {
        return appointmentRepository.findByDateTimeStartBetween(start, end);
    }

    public Appointment requireByIdForPractitioner(Long id, User practitioner) {
        return appointmentRepository.findByIdAndPractitioner(id, practitioner)
                .orElseThrow(() -> new NotFoundException("Rendez-vous introuvable"));
    }

    public Appointment createAppointment(AppointmentRequest request, User practitioner, User actor) {
        validateTimeRange(request.dateTimeStart(), request.dateTimeEnd());
        assertNoOverlap(practitioner, request.dateTimeStart(), request.dateTimeEnd(), null);

        Patient patient = patientRepository.findByIdAndCreatedBy(request.patientId(), practitioner)
                .orElseThrow(() -> new NotFoundException("Patient introuvable"));
        if (patient.getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        Appointment appointment = new Appointment();
        appointment.setDateTimeStart(request.dateTimeStart());
        appointment.setDateTimeEnd(request.dateTimeEnd());
        appointment.setStatus(request.status());
        appointment.setNotes(request.notes());
        appointment.setPatient(patient);
        appointment.setPractitioner(practitioner);
        appointment.setCreatedBy(actor != null ? actor : practitioner);
        appointment.setUpdatedBy(actor != null ? actor : practitioner);
        LocalDateTime createdAt = LocalDateTime.now();
        appointment.setCreatedAt(createdAt);
        appointment.setUpdatedAt(createdAt);

        long count = appointmentRepository.countByPractitionerAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                practitioner,
                referenceCodeGeneratorService.dayStart(createdAt),
                referenceCodeGeneratorService.nextDayStart(createdAt)
        );
        appointment.setCode(referenceCodeGeneratorService.generate("RV", createdAt, count));

        return appointmentRepository.save(appointment);
    }

    public Appointment updateAppointment(Long id, AppointmentRequest request, User practitioner, User actor) {
        validateTimeRange(request.dateTimeStart(), request.dateTimeEnd());
        assertNoOverlap(practitioner, request.dateTimeStart(), request.dateTimeEnd(), id);

        Appointment existing = requireByIdForPractitioner(id, practitioner);
        if (existing.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException(java.util.Map.of("_", "Rendez-vous annulé : lecture seule."));
        }

        Patient patient = patientRepository.findByIdAndCreatedBy(request.patientId(), practitioner)
                .orElseThrow(() -> new NotFoundException("Patient introuvable"));
        if (patient.getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        existing.setDateTimeStart(request.dateTimeStart());
        existing.setDateTimeEnd(request.dateTimeEnd());
        existing.setStatus(request.status());
        existing.setNotes(request.notes());
        existing.setPatient(patient);
        existing.setPractitioner(practitioner);
        existing.setUpdatedBy(actor != null ? actor : practitioner);

        return appointmentRepository.save(existing);
    }

    public Appointment cancelAppointment(Long id, User practitioner, User actor, String reason) {
        Appointment existing = requireByIdForPractitioner(id, practitioner);
        if (existing.getPatient() != null && existing.getPatient().getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }
        if (existing.getStatus() != AppointmentStatus.CANCELLED) {
            existing.setStatus(AppointmentStatus.CANCELLED);
            existing.setCancelledAt(LocalDateTime.now());
            existing.setCancelledBy(actor != null ? actor : practitioner);
            String normalizedReason = reason != null ? reason.trim() : "";
            if (!normalizedReason.isBlank()) {
                existing.setCancelReason(normalizedReason);
            }
            existing.setUpdatedBy(actor != null ? actor : practitioner);
            appointmentRepository.save(existing);
        }
        return existing;
    }

    public record RescheduleItem(Long appointmentId, LocalDateTime start, LocalDateTime end) {
    }

    @org.springframework.transaction.annotation.Transactional
    public void rescheduleAppointments(List<RescheduleItem> updates, User practitioner, User actor) {
        if (updates == null || updates.isEmpty()) {
            return;
        }

        List<Long> ids = updates.stream().map(RescheduleItem::appointmentId).distinct().toList();
        if (ids.size() != updates.size()) {
            throw new BadRequestException("Ids invalides");
        }

        // Ownership: must all belong to practitioner.
        List<Appointment> appointments = appointmentRepository.findByIdInAndPractitioner(ids, practitioner);
        if (appointments.size() != ids.size()) {
            throw new NotFoundException("Rendez-vous introuvable");
        }

        java.util.Map<Long, RescheduleItem> updateById = updates.stream()
                .collect(java.util.stream.Collectors.toMap(RescheduleItem::appointmentId, u -> u));

        // Validate time ranges + cross-field consistency.
        for (RescheduleItem u : updates) {
            validateTimeRange(u.start(), u.end());
        }

        // In-group overlap check (pure in-memory).
        List<RescheduleItem> sorted = updates.stream()
                .sorted(java.util.Comparator.comparing(RescheduleItem::start))
                .toList();
        for (int i = 1; i < sorted.size(); i++) {
            RescheduleItem prev = sorted.get(i - 1);
            RescheduleItem cur = sorted.get(i);
            if (cur.start().isBefore(prev.end())) {
                throw new ConflictException("Ce rendez-vous chevauche un autre rendez-vous");
            }
        }

        // Overlap check vs other appointments (exclude the whole reschedule set).
        for (RescheduleItem u : updates) {
            boolean overlaps = appointmentRepository.existsOverlappingExcludingIds(practitioner, u.start(), u.end(), ids);
            if (overlaps) {
                throw new ConflictException("Ce rendez-vous chevauche un autre rendez-vous");
            }
        }

        // Apply updates.
        appointments.forEach(appt -> {
            if (appt.getPatient() != null && appt.getPatient().getArchivedAt() != null) {
                throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
            }
            RescheduleItem u = updateById.get(appt.getId());
            appt.setDateTimeStart(u.start());
            appt.setDateTimeEnd(u.end());
            appt.setUpdatedBy(actor != null ? actor : practitioner);
        });
        appointmentRepository.saveAll(appointments);
    }

    public Long getCompletedAppointmentsForPractitionerOnDate(User practitioner, LocalDate date) {
    return appointmentRepository.countCompletedAppointmentsForPractitionerOnDate(
            practitioner, date.atStartOfDay(), date.plusDays(1).atStartOfDay());
}

public Long getCompletedAppointmentsWithNewPatientsForPractitionerOnDate(User practitioner, LocalDate date) {
    return appointmentRepository.countCompletedAppointmentsWithNewPatientsForPractitionerOnDate(
            practitioner, date.atStartOfDay(), date.plusDays(1).atStartOfDay());
}

    private void validateTimeRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new BadRequestException("Dates invalides");
        }
        if (!end.isAfter(start)) {
            throw new BadRequestException(
                    "Intervalle horaire invalide",
                    java.util.Map.of("dateTimeEnd", "La date de fin doit etre apres la date de debut")
            );
        }
    }

    private void assertNoOverlap(User practitioner, LocalDateTime start, LocalDateTime end, Long excludeId) {
        boolean overlaps = appointmentRepository.existsOverlapping(practitioner, start, end, excludeId);
        if (overlaps) {
            throw new ConflictException("Ce rendez-vous chevauche un autre rendez-vous");
        }
    }

}
