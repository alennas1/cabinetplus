package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByPatientIdOrderByDateDesc(Long patientId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.patient.id = :patientId")
    Double sumByPatientId(@Param("patientId") Long patientId);


     @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.date BETWEEN :from AND :to")
    Double sumPaymentsBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT p.method, SUM(p.amount) FROM Payment p WHERE p.date BETWEEN :from AND :to GROUP BY p.method")
    List<Object[]> sumByMethod(LocalDateTime from, LocalDateTime to);


    @Query("SELECT COALESCE(SUM(p.amount), 0) " +
       "FROM Payment p " +
       "WHERE EXTRACT(YEAR FROM p.date) = :year AND EXTRACT(MONTH FROM p.date) = :month")
Double sumByMonth(@Param("year") int year, @Param("month") int month);

}
