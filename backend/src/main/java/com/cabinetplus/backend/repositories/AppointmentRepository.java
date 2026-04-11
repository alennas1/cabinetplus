package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.enums.AppointmentStatus;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatient(Patient patient);
    List<Appointment> findByPractitioner(User practitioner);
    Page<Appointment> findByPractitioner(User practitioner, Pageable pageable);
    Optional<Appointment> findByIdAndPractitioner(Long id, User practitioner);
    List<Appointment> findByIdInAndPractitioner(List<Long> ids, User practitioner);
    List<Appointment> findByDateTimeStartBetween(LocalDateTime start, LocalDateTime end);
    List<Appointment> findByPatientId(Long patientId);

    List<Appointment> findByPractitionerAndDateTimeStartGreaterThanEqualAndDateTimeStartLessThanOrderByDateTimeStartAsc(
            User practitioner,
            LocalDateTime startInclusive,
            LocalDateTime endExclusive
    );

    @Query("""
        SELECT (COUNT(a) > 0)
        FROM Appointment a
        WHERE a.practitioner = :practitioner
          AND (a.status IS NULL OR a.status <> 'CANCELLED')
          AND (:excludeId IS NULL OR a.id <> :excludeId)
          AND a.dateTimeStart < :end
          AND a.dateTimeEnd > :start
    """)
    boolean existsOverlapping(
            @Param("practitioner") User practitioner,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("excludeId") Long excludeId
    );

    @Query("""
        SELECT (COUNT(a) > 0)
        FROM Appointment a
        WHERE a.practitioner = :practitioner
          AND (a.status IS NULL OR a.status <> 'CANCELLED')
          AND a.id NOT IN :excludeIds
          AND a.dateTimeStart < :end
          AND a.dateTimeEnd > :start
    """)
    boolean existsOverlappingExcludingIds(
            @Param("practitioner") User practitioner,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("excludeIds") List<Long> excludeIds
    );

    @Query("""
        SELECT a.patient.id, COUNT(a)
        FROM Appointment a
        WHERE a.patient.id IN :patientIds
          AND a.status = 'CANCELLED'
        GROUP BY a.patient.id
    """)
    List<Object[]> countCancelledByPatientIds(@Param("patientIds") List<Long> patientIds);

    @Query("""
        select a
        from Appointment a
        where a.patient.id = :patientId
          and (:status is null or a.status = :status)
          and (:fromEnabled = false or a.dateTimeStart >= :fromStart)
          and (:toEnabled = false or a.dateTimeStart < :toEndExclusive)
          and (:notesLike is null or :notesLike = '' or lower(coalesce(a.notes, '')) like :notesLike)
    """)
    Page<Appointment> searchByPatientId(
            @Param("patientId") Long patientId,
            @Param("status") AppointmentStatus status,
            @Param("fromEnabled") boolean fromEnabled,
            @Param("fromStart") LocalDateTime fromStart,
            @Param("toEnabled") boolean toEnabled,
            @Param("toEndExclusive") LocalDateTime toEndExclusive,
            @Param("notesLike") String notesLike,
            Pageable pageable
    );
    
    // Optional: If you want them ordered by date in the PDF
    List<Appointment> findByPatientIdOrderByDateTimeStartDesc(Long patientId);

    long countByPractitionerAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(User practitioner, LocalDateTime fromInclusive, LocalDateTime toExclusive);
   @Query("SELECT COUNT(a) FROM Appointment a " +
       "WHERE a.practitioner = :practitioner " +
       "AND a.status = 'COMPLETED' " +
       "AND a.dateTimeStart >= :startOfDay AND a.dateTimeStart < :endOfDay")
Long countCompletedAppointmentsForPractitionerOnDate(
        @Param("practitioner") User practitioner,
        @Param("startOfDay") LocalDateTime startOfDay,
        @Param("endOfDay") LocalDateTime endOfDay);

@Query("SELECT COUNT(a) FROM Appointment a " +
       "WHERE a.practitioner = :practitioner " +
       "AND a.status = 'COMPLETED' " +
       "AND a.dateTimeStart >= :startOfDay AND a.dateTimeStart < :endOfDay " +
       "AND a.patient.createdAt >= :startOfDay AND a.patient.createdAt < :endOfDay")
Long countCompletedAppointmentsWithNewPatientsForPractitionerOnDate(
        @Param("practitioner") User practitioner,
        @Param("startOfDay") LocalDateTime startOfDay,
        @Param("endOfDay") LocalDateTime endOfDay);


}
