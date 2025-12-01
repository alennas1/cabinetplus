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

    // Count completed appointments for a practitioner today
@Query("SELECT COUNT(a) FROM Appointment a WHERE a.practitioner = :practitioner AND a.status = 'COMPLETED' AND a.dateTimeStart >= :startOfDay")
Long countCompletedAppointmentsTodayForPractitioner(@Param("practitioner") User practitioner, @Param("startOfDay") LocalDateTime startOfDay);

@Query("SELECT COUNT(a) FROM Appointment a " +
       "WHERE a.practitioner = :practitioner " +
       "AND a.status = 'COMPLETED' " +
       "AND a.patient.createdAt >= :startOfDay " +
       "AND a.dateTimeStart >= :startOfDay")
Long countCompletedAppointmentsWithNewPatientsTodayForPractitioner(
    @Param("practitioner") User practitioner,
    @Param("startOfDay") LocalDateTime startOfDay
);

}
