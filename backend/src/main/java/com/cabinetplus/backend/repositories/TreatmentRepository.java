package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.models.Patient;

public interface TreatmentRepository extends JpaRepository<Treatment, Long> {

    // All treatments of a practitioner
    List<Treatment> findByPractitioner(User practitioner);

    // Find treatment by ID scoped to practitioner
    Optional<Treatment> findByIdAndPractitioner(Long id, User practitioner);

    // Treatments for a patient scoped to practitioner
    List<Treatment> findByPatientAndPractitioner(Patient patient, User practitioner);

    // Price sum queries
    @Query("SELECT SUM(t.price) FROM Treatment t WHERE t.practitioner = :dentist AND t.date BETWEEN :start AND :end")
    Optional<Double> sumPriceByDentist(@Param("dentist") User dentist,
                                       @Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end);

    @Query("SELECT t FROM Treatment t WHERE t.practitioner = :dentist AND t.date BETWEEN :start AND :end")
    List<Treatment> findByDentistAndDateBetween(@Param("dentist") User dentist,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    List<Treatment> findByPractitionerAndDateBetween(User dentist, LocalDateTime start, LocalDateTime end);
}
