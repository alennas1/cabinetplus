package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.HandPaymentResponseDTO;
import com.cabinetplus.backend.enums.PaymentStatus;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.HandPaymentRepository;
import com.cabinetplus.backend.repositories.UserRepository;

import lombok.RequiredArgsConstructor;
@Service
@RequiredArgsConstructor
public class HandPaymentService {

    private final HandPaymentRepository handPaymentRepository;
    private final UserRepository userRepository;

    private boolean hasValidActiveSubscription(User user) {
        return user.getPlan() != null
                && user.getExpirationDate() != null
                && user.getExpirationDate().isAfter(LocalDateTime.now());
    }

    public List<HandPaymentResponseDTO> getAllPendingPayments() {
    return handPaymentRepository.findByStatus(PaymentStatus.PENDING)
            .stream()
            .map(p -> new HandPaymentResponseDTO(
                    p.getId(),
                    p.getAmount(),
                    p.getPaymentDate(),
                    p.getStatus().name(),
                    p.getPaymentMethod().name(),
                    p.getBillingCycle() != null ? p.getBillingCycle().name() : "MONTHLY",
                    p.getNotes(),

                    p.getUser().getId(),
                    p.getUser().getUsername(),
                    p.getUser().getFirstname() + " " + p.getUser().getLastname(),
                    p.getUser().getPhoneNumber(),

                    p.getPlan().getId(),
                    p.getPlan().getName(),
                    p.getPlan().getDurationDays()
            ))
            .toList();
}
public List<HandPaymentResponseDTO> getPaymentsByUser(User user) {
    return handPaymentRepository.findByUser(user)
            .stream()
            .map(p -> new HandPaymentResponseDTO(
                    p.getId(),
                    p.getAmount(),
                    p.getPaymentDate(),
                    p.getStatus().name(),
                    p.getPaymentMethod().name(),
                    p.getBillingCycle() != null ? p.getBillingCycle().name() : "MONTHLY",
                    p.getNotes(),

                    p.getUser().getId(),
                    p.getUser().getUsername(),
                    p.getUser().getFirstname() + " " + p.getUser().getLastname(),
                    p.getUser().getPhoneNumber(),

                    p.getPlan().getId(),
                    p.getPlan().getName(),
                    p.getPlan().getDurationDays()
            ))
            .toList();
}
public List<HandPaymentResponseDTO> getAllPayments() {
    return handPaymentRepository.findAll()
            .stream()
            .map(p -> new HandPaymentResponseDTO(
                    p.getId(),
                    p.getAmount(),
                    p.getPaymentDate(),
                    p.getStatus().name(),
                    p.getPaymentMethod().name(),
                    p.getBillingCycle() != null ? p.getBillingCycle().name() : "MONTHLY",
                    p.getNotes(),

                    p.getUser().getId(),
                    p.getUser().getUsername(),
                    p.getUser().getFirstname() + " " + p.getUser().getLastname(),
                    p.getUser().getPhoneNumber(),

                    p.getPlan().getId(),
                    p.getPlan().getName(),
                    p.getPlan().getDurationDays()
            ))
            .toList();
}


    public HandPayment createHandPayment(HandPayment payment) {
        payment.setStatus(PaymentStatus.PENDING);
        if (payment.getPaymentMethod() == null) {
            payment.setPaymentMethod(com.cabinetplus.backend.enums.PaymentMethod.HAND);
        }

        // Save the payment
        HandPayment savedPayment = handPaymentRepository.save(payment);

        // Only set WAITING if user does not currently have a valid active subscription.
        // If they are still active and request renewal/upgrade, keep ACTIVE.
        User user = savedPayment.getUser();
        if (!hasValidActiveSubscription(user)) {
            user.setPlanStatus(UserPlanStatus.WAITING);
        }
        userRepository.save(user);

        return savedPayment;
    }

    /**
     * Confirm a pending payment
     * Sets user's planStatus to ACTIVE
     */
   @Transactional
public HandPayment confirmPayment(Long paymentId) {
    HandPayment payment = handPaymentRepository.findById(paymentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable"));

    if (payment.getStatus() != PaymentStatus.PENDING) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce paiement est deja traite");
    }

    // 1. Confirm the payment status
    payment.setStatus(PaymentStatus.CONFIRMED);
    handPaymentRepository.save(payment);

    // 2. Update user plan details
    User user = payment.getUser();
    user.setPlan(payment.getPlan());
    user.setPlanStatus(UserPlanStatus.ACTIVE);
    
    LocalDateTime startDate = LocalDateTime.now();
    LocalDateTime expirationDate;

    // 3. Logic for Expiration Date based on Plan type and Billing Cycle
    if (payment.getPlan().getMonthlyPrice() == 0) {
        // Logic for FREE/TRIAL plan (7 days as per your React frontend)
        expirationDate = startDate.plusDays(7);
    } else {
        // Logic for PAID plans based on the BillingCycle attribute
        switch (payment.getBillingCycle()) {
            case YEARLY:
                expirationDate = startDate.plusYears(1);
                break;
            case MONTHLY:
            default:
                expirationDate = startDate.plusMonths(1);
                break;
        }
    }

    user.setExpirationDate(expirationDate);
    userRepository.save(user);

    return payment;
}


    /**
     * Reject a pending payment
     * Preserves ACTIVE if user still has a valid subscription, otherwise reverts state.
     */
    @Transactional
    public HandPayment rejectPayment(Long paymentId) {
        HandPayment payment = handPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce paiement est deja traite");
        }

        payment.setStatus(PaymentStatus.REJECTED);
        HandPayment rejectedPayment = handPaymentRepository.save(payment);

        // Do not downgrade active users who still have a valid plan window.
        User user = rejectedPayment.getUser();
        if (hasValidActiveSubscription(user)) {
            user.setPlanStatus(UserPlanStatus.ACTIVE);
        } else if (user.getExpirationDate() != null && user.getExpirationDate().isBefore(LocalDateTime.now())) {
            user.setPlanStatus(UserPlanStatus.INACTIVE);
        } else {
            user.setPlanStatus(UserPlanStatus.PENDING);
        }
        userRepository.save(user);

        return rejectedPayment;
    }

    /**
     * Check and update expiration for a user
     * Should be called periodically or on login
     */
    public void checkAndUpdateExpiration(User user) {
        if (user.getExpirationDate() != null && LocalDateTime.now().isAfter(user.getExpirationDate())) {
            user.setPlanStatus(UserPlanStatus.INACTIVE);
            userRepository.save(user);
        }
    }
}
