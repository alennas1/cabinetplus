package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatient(Patient patient);
    List<Appointment> findByPractitioner(User practitioner);
    List<Appointment> findByDateTimeStartBetween(LocalDateTime start, LocalDateTime end);
List<Appointment> findByPatientId(Long patientId);
    
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
