package com.cabinetplus.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.PaymentRepository;
import com.cabinetplus.backend.repositories.UserRepository;

class PaymentServiceTest {

    private PaymentRepository paymentRepository;
    private PatientRepository patientRepository;
    private UserRepository userRepository;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        patientRepository = mock(PatientRepository.class);
        userRepository = mock(UserRepository.class);
        paymentService = new PaymentService(paymentRepository, patientRepository, userRepository);
    }

    @Test
    void createPaymentSetsRecordStatusActive() {
        User dentist = new User();
        dentist.setId(2L);

        Patient patient = new Patient();
        patient.setId(4L);
        patient.setCreatedBy(dentist);

        PaymentRequest request = new PaymentRequest(patient.getId(), 20000.0, Payment.Method.CASH, null, null);

        when(patientRepository.findByIdAndCreatedBy(eq(patient.getId()), eq(dentist))).thenReturn(Optional.of(patient));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            assertNotNull(p.getRecordStatus());
            assertEquals(RecordStatus.ACTIVE, p.getRecordStatus());
            p.setId(10L);
            if (p.getDate() == null) {
                p.setDate(LocalDateTime.now());
            }
            return p;
        });

        var resp = paymentService.create(request, dentist);
        assertEquals(10L, resp.id());
        assertEquals(patient.getId(), resp.patientId());
        assertEquals(20000.0, resp.amount());
        assertEquals(Payment.Method.CASH, resp.method());
    }
}

