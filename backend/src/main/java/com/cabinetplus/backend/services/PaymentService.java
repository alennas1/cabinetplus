package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.repositories.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository; // assume exists

    @Transactional
    public PaymentResponse create(PaymentRequest request) {
        Patient patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + request.patientId()));

        User receivedBy = null;
        if (request.receivedByUserId() != null) {
            receivedBy = userRepository.findById(request.receivedByUserId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + request.receivedByUserId()));
        }

        LocalDateTime when = request.date() != null ? request.date() : LocalDateTime.now();

        Payment saved = paymentRepository.save(
                Payment.builder()
                        .patient(patient)
                        .amount(request.amount())
                        .method(request.method())
                        .date(when)
                        .receivedBy(receivedBy)
                        .build()
        );

        return new PaymentResponse(
                saved.getId(),
                patient.getId(),
                saved.getAmount(),
                saved.getMethod(),
                saved.getDate(),
                receivedBy != null ? receivedBy.getId() : null
        );
    }

    public List<Payment> listByPatient(Long patientId) {
        return paymentRepository.findByPatientIdOrderByDateDesc(patientId);
    }

    public void delete(Long paymentId) {
        paymentRepository.deleteById(paymentId);
    }
}
