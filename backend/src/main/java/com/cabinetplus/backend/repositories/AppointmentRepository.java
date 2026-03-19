package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatient(Patient patient);
    List<Appointment> findByPractitioner(User practitioner);
    Optional<Appointment> findByIdAndPractitioner(Long id, User practitioner);
    List<Appointment> findByIdInAndPractitioner(List<Long> ids, User practitioner);
    List<Appointment> findByDateTimeStartBetween(LocalDateTime start, LocalDateTime end);
    List<Appointment> findByPatientId(Long patientId);

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
    
    // Optional: If you want them ordered by date in the PDF
    List<Appointment> findByPatientIdOrderByDateTimeStartDesc(Long patientId);
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
