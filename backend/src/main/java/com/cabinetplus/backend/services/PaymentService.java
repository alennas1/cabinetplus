package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.PaymentRequest;
import com.cabinetplus.backend.dto.PaymentResponse;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Payment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
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
    public PaymentResponse create(PaymentRequest request, User actor) {
        User clinicOwner = resolveClinicOwner(actor);
        Patient patient = patientRepository.findByIdAndCreatedBy(request.patientId(), clinicOwner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));
        if (patient.getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        User receivedBy = resolveReceivedBy(request.receivedByUserId(), clinicOwner, actor);

        // Force server-side timestamp for traceability (ignore any client-provided date).
        LocalDateTime when = LocalDateTime.now();

        Payment saved = paymentRepository.save(
                Payment.builder()
                        .patient(patient)
                        .amount(request.amount())
                        .method(request.method())
                        .date(when)
                        .receivedBy(receivedBy)
                        .recordStatus(RecordStatus.ACTIVE)
                        .build()
        );

        String receivedByName = null;
        if (receivedBy != null) {
            String first = receivedBy.getFirstname() != null ? receivedBy.getFirstname().trim() : "";
            String last = receivedBy.getLastname() != null ? receivedBy.getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            receivedByName = combined.isBlank() ? null : combined;
        }

        return new PaymentResponse(
                saved.getId(),
                patient.getId(),
                saved.getAmount(),
                saved.getMethod(),
                saved.getDate(),
                receivedBy != null ? receivedBy.getId() : null,
                receivedByName
        );
    }

    public List<Payment> listByPatient(Long patientId, User actor) {
        User clinicOwner = resolveClinicOwner(actor);
        boolean owned = patientRepository.findByIdAndCreatedBy(patientId, clinicOwner).isPresent();
        if (!owned) {
            throw new NotFoundException("Patient introuvable");
        }
        return paymentRepository.findByPatientIdOrderByDateDesc(patientId).stream()
                .filter(p -> p != null && p.getRecordStatus() != RecordStatus.ARCHIVED)
                .toList();
    }

    public Page<Payment> searchPatientPayments(
            Long patientId,
            User actor,
            Payment.Method method,
            boolean fromEnabled,
            LocalDateTime fromDateTime,
            boolean toEnabled,
            LocalDateTime toDateTimeExclusive,
            String qLike,
            String fieldKey,
            Pageable pageable
    ) {
        User clinicOwner = resolveClinicOwner(actor);
        boolean owned = patientRepository.findByIdAndCreatedBy(patientId, clinicOwner).isPresent();
        if (!owned) {
            throw new NotFoundException("Patient introuvable");
        }
        return paymentRepository.searchPatientPayments(
                patientId,
                RecordStatus.ARCHIVED,
                method,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                pageable
        );
    }

    public Payment cancel(Long paymentId, User actor, String reason) {
        User clinicOwner = resolveClinicOwner(actor);
        Payment existing = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException("Paiement introuvable"));
        if (existing.getPatient() != null && existing.getPatient().getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        Long ownerId = existing.getPatient() != null && existing.getPatient().getCreatedBy() != null
                ? existing.getPatient().getCreatedBy().getId()
                : null;
        if (ownerId == null || clinicOwner == null || clinicOwner.getId() == null || !ownerId.equals(clinicOwner.getId())) {
            throw new NotFoundException("Paiement introuvable");
        }

        boolean changed = false;
        if (existing.getRecordStatus() != RecordStatus.CANCELLED) {
            existing.setRecordStatus(RecordStatus.CANCELLED);
            existing.setCancelledAt(LocalDateTime.now());
            changed = true;
        } else if (existing.getCancelledAt() == null) {
            existing.setCancelledAt(LocalDateTime.now());
            changed = true;
        }

        if (actor != null && existing.getCancelledBy() == null) {
            existing.setCancelledBy(actor);
            changed = true;
        }

        String normalizedReason = reason != null ? reason.trim() : "";
        if (!normalizedReason.isBlank() && (existing.getCancelReason() == null || existing.getCancelReason().isBlank())) {
            existing.setCancelReason(normalizedReason);
            changed = true;
        }

        return changed ? paymentRepository.save(existing) : existing;
    }

    private User resolveClinicOwner(User user) {
        if (user == null) return null;
        return user.getOwnerDentist() != null ? user.getOwnerDentist() : user;
    }

    private User resolveReceivedBy(Long receivedByUserId, User clinicOwner, User actor) {
        if (receivedByUserId == null) {
            return actor;
        }

        User receivedBy = userRepository.findById(receivedByUserId)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("receivedByUserId", "Utilisateur introuvable")));

        if (!isUserInClinic(receivedBy, clinicOwner)) {
            throw new BadRequestException(java.util.Map.of("receivedByUserId", "Utilisateur invalide"));
        }

        return receivedBy;
    }

    private boolean isUserInClinic(User user, User clinicOwner) {
        if (user == null || clinicOwner == null) return false;
        if (user.getId() != null && user.getId().equals(clinicOwner.getId())) return true;
        return user.getOwnerDentist() != null
                && user.getOwnerDentist().getId() != null
                && user.getOwnerDentist().getId().equals(clinicOwner.getId());
    }
}


