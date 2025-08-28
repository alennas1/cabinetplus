package com.cabinetplus.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByPatientIdOrderByDateDesc(Long patientId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.patient.id = :patientId")
    Double sumByPatientId(@Param("patientId") Long patientId);
}
