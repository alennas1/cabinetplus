package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.cabinetplus.backend.enums.CancellationRequestDecision;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryPaymentRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;

@Service
public class LabPortalService {

    private final LaboratoryAccessService laboratoryAccessService;
    private final ProthesisRepository prothesisRepository;
    private final LaboratoryPaymentRepository laboratoryPaymentRepository;

    public LabPortalService(
            LaboratoryAccessService laboratoryAccessService,
            ProthesisRepository prothesisRepository,
            LaboratoryPaymentRepository laboratoryPaymentRepository
    ) {
        this.laboratoryAccessService = laboratoryAccessService;
        this.prothesisRepository = prothesisRepository;
        this.laboratoryPaymentRepository = laboratoryPaymentRepository;
    }

    public Page<Prothesis> getMyProthesesPaged(User labUser, String q, String status, UUID dentistPublicId, LocalDateTime from, LocalDateTime to, Pageable pageable) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);

        String statusNorm = status != null ? status.trim().toUpperCase(Locale.ROOT) : "";
        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String qLike = qNorm.isBlank() ? "" : "%" + qNorm + "%";

        return prothesisRepository.searchForLabPortal(
                lab,
                RecordStatus.ARCHIVED,
                dentistPublicId,
                statusNorm,
                from != null,
                from,
                to != null,
                to,
                qLike,
                pageable
        );
    }

    public Page<LaboratoryPayment> getMyPaymentsPaged(User labUser, String q, UUID dentistPublicId, LocalDateTime from, LocalDateTime to, Pageable pageable) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String qLike = qNorm.isBlank() ? "" : "%" + qNorm + "%";

        return laboratoryPaymentRepository.searchForLabPortal(
                lab,
                RecordStatus.ARCHIVED,
                dentistPublicId,
                from != null,
                from,
                to != null,
                to,
                qLike,
                pageable
        );
    }

    @Transactional
    public Prothesis decideProthesisCancellation(User labUser, Long prothesisId, boolean approve) {
        if (prothesisId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prothese introuvable");
        }
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        Prothesis p = prothesisRepository.findById(prothesisId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prothese introuvable"));

        if (p.getLaboratory() == null || p.getLaboratory().getId() == null || !p.getLaboratory().getId().equals(lab.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        if (p.getCancelRequestDecision() != CancellationRequestDecision.PENDING) {
            throw new BadRequestException(java.util.Map.of("_", "Aucune demande d'annulation en attente."));
        }

        p.setCancelRequestDecidedAt(LocalDateTime.now());
        p.setCancelRequestDecidedBy(labUser);
        p.setCancelRequestDecision(approve ? CancellationRequestDecision.APPROVED : CancellationRequestDecision.REJECTED);

        if (approve) {
            if (p.getRecordStatus() != RecordStatus.CANCELLED) {
                p.setRecordStatus(RecordStatus.CANCELLED);
                p.setCancelledAt(LocalDateTime.now());
                p.setCancelledBy(labUser);
            }
            if ((p.getCancelReason() == null || p.getCancelReason().isBlank()) && p.getCancelRequestReason() != null) {
                p.setCancelReason(p.getCancelRequestReason());
            }
        }

        return prothesisRepository.save(p);
    }

    @Transactional
    public LaboratoryPayment decidePaymentCancellation(User labUser, Long paymentId, boolean approve) {
        if (paymentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paiement introuvable");
        }
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        LaboratoryPayment payment = laboratoryPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable"));

        if (payment.getLaboratory() == null || payment.getLaboratory().getId() == null || !payment.getLaboratory().getId().equals(lab.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        if (payment.getCancelRequestDecision() != CancellationRequestDecision.PENDING) {
            throw new BadRequestException(java.util.Map.of("_", "Aucune demande d'annulation en attente."));
        }

        payment.setCancelRequestDecidedAt(LocalDateTime.now());
        payment.setCancelRequestDecidedBy(labUser);
        payment.setCancelRequestDecision(approve ? CancellationRequestDecision.APPROVED : CancellationRequestDecision.REJECTED);

        if (approve) {
            if (payment.getRecordStatus() != RecordStatus.CANCELLED) {
                payment.setRecordStatus(RecordStatus.CANCELLED);
                payment.setCancelledAt(LocalDateTime.now());
            }
        }

        return laboratoryPaymentRepository.save(payment);
    }
}
