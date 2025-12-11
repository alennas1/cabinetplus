package com.cabinetplus.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.enums.PaymentStatus;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.User;

@Repository
public interface HandPaymentRepository extends JpaRepository<HandPayment, Long> {

    // Find all payments by status (already exists)
    List<HandPayment> findByStatus(PaymentStatus status);

    // Find all payments for a specific user (dentist)
    List<HandPayment> findByUser(User user);

    // Optional: find by status and user
    List<HandPayment> findByUserAndStatus(User user, PaymentStatus status);

    List<HandPayment> findAll();

}
