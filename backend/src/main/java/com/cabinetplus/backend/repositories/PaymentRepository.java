package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import com.cabinetplus.backend.models.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Existing methods
    List<Payment> findByPatientIdOrderByDateDesc(Long patientId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.patient.id = :patientId")
    Double sumByPatientId(@Param("patientId") Long patientId);

     @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.patient IN " +
           "(SELECT t.patient FROM Treatment t WHERE t.practitioner = :dentist) " +
           "AND p.date BETWEEN :start AND :end")
    Optional<Double> sumAmountByDentist(@Param("dentist") User dentist,
                                        @Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end);

    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.patient.id = :patientId AND p.patient IN " +
           "(SELECT t.patient FROM Treatment t WHERE t.id = :treatmentId)")
    Optional<Double> sumByPatientAndTreatment(@Param("patientId") Long patientId,
                                              @Param("treatmentId") Long treatmentId);
}


