package com.cabinetplus.backend.services;

import java.util.ArrayList;
import java.util.List;
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
import com.cabinetplus.backend.events.LabOpsChangedEvent;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.dto.LabDentistFinancialSummaryResponse;
import com.cabinetplus.backend.dto.CountTotalResponseDTO;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryPaymentRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import org.springframework.context.ApplicationEventPublisher;
import com.cabinetplus.backend.services.NotificationService;
import com.cabinetplus.backend.enums.NotificationType;

@Service
public class LabPortalService {

    private final LaboratoryAccessService laboratoryAccessService;
    private final ProthesisRepository prothesisRepository;
    private final LaboratoryPaymentRepository laboratoryPaymentRepository;
    private final RealtimeRecipientsService realtimeRecipientsService;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    public LabPortalService(
            LaboratoryAccessService laboratoryAccessService,
            ProthesisRepository prothesisRepository,
            LaboratoryPaymentRepository laboratoryPaymentRepository,
            RealtimeRecipientsService realtimeRecipientsService,
            ApplicationEventPublisher eventPublisher,
            NotificationService notificationService
    ) {
        this.laboratoryAccessService = laboratoryAccessService;
        this.prothesisRepository = prothesisRepository;
        this.laboratoryPaymentRepository = laboratoryPaymentRepository;
        this.realtimeRecipientsService = realtimeRecipientsService;
        this.eventPublisher = eventPublisher;
        this.notificationService = notificationService;
    }

    public Page<Prothesis> getMyProthesesPaged(
            User labUser,
            String q,
            String status,
            String filterBy,
            String dateType,
            UUID dentistPublicId,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable
    ) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);

        String statusNorm = status != null ? status.trim().toUpperCase(Locale.ROOT) : "";
        String filterKey = filterBy != null ? filterBy.trim().toLowerCase(Locale.ROOT) : "";
        if (!java.util.Set.of("", "work", "code", "dentist").contains(filterKey)) {
            filterKey = "";
        }

        String dateTypeKey = dateType != null ? dateType.trim() : "";
        if (!java.util.Set.of("", "sentToLabDate", "readyAt", "actualReturnDate").contains(dateTypeKey)) {
            dateTypeKey = "";
        }

        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String qLike = qNorm.isBlank() ? "" : "%" + qNorm + "%";

        return prothesisRepository.searchForLabPortal(
                lab,
                RecordStatus.ARCHIVED,
                dentistPublicId,
                statusNorm,
                filterKey,
                dateTypeKey,
                from != null,
                from,
                to != null,
                to,
                qLike,
                 pageable
         );
     }

    public List<Prothesis> getMyPendingProthesisCancellations(User labUser) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        return prothesisRepository.findPendingCancellationForLabPortal(lab, RecordStatus.ARCHIVED);
    }

    public List<LaboratoryPayment> getMyPendingPaymentCancellations(User labUser) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        return laboratoryPaymentRepository.findPendingCancellationForLabPortal(lab, RecordStatus.ARCHIVED);
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

    public CountTotalResponseDTO getMyPaymentsSummary(User labUser, String q, UUID dentistPublicId, LocalDateTime from, LocalDateTime to) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        String qNorm = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        String qLike = qNorm.isBlank() ? "" : "%" + qNorm + "%";

        Object[] row = laboratoryPaymentRepository.getPaymentsSummaryForLabPortal(
                lab,
                RecordStatus.ARCHIVED,
                dentistPublicId,
                from != null,
                from,
                to != null,
                to,
                qLike
        );

        long count = 0L;
        double total = 0.0;
        if (row != null && row.length >= 2) {
            Object countObj = row[0];
            Object totalObj = row[1];
            if (countObj instanceof Number n) count = n.longValue();
            if (totalObj instanceof Number n) total = n.doubleValue();
        }
        return new CountTotalResponseDTO(count, total);
    }

    public LabDentistFinancialSummaryResponse getDentistFinancialSummary(User labUser, User dentist) {
        if (labUser == null || dentist == null) {
            return new LabDentistFinancialSummaryResponse(0.0, 0.0, 0.0);
        }

        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        Double owed = prothesisRepository.sumLabCostByPractitionerAndLaboratory(dentist, lab.getId());
        Double paid = laboratoryPaymentRepository.sumAmountByLaboratoryIdAndCreatedBy(lab.getId(), dentist);

        double totalOwed = owed != null ? owed : 0.0;
        double totalPaid = paid != null ? paid : 0.0;
        double remainingToPay = totalOwed - totalPaid;

        return new LabDentistFinancialSummaryResponse(totalOwed, totalPaid, remainingToPay);
    }

    @Transactional
    public Prothesis decideProthesisCancellation(User labUser, Long prothesisId, boolean approve) {
        if (prothesisId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prothese introuvable");
        }
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        // Use lightweight fetch graph to avoid Hibernate eager-join explosion on User -> permissions/preferences/etc.
        Prothesis p = prothesisRepository.findForResponseById(prothesisId)
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

        Prothesis saved = prothesisRepository.save(p);
        String decisionStr = approve ? "APPROVED" : "REJECTED";
        try {
            notificationService.updateDecisionPayload(labUser, NotificationType.PROTHESIS_CANCELLATION_REQUESTED, saved.getId(), decisionStr);
        } catch (Exception ignore) {}
        publishProthesisRealtime(saved, "CANCEL_DECIDED", saved.getCancelRequestDecision() != null ? saved.getCancelRequestDecision().name() : null);
        return saved;
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

        LaboratoryPayment saved = laboratoryPaymentRepository.save(payment);
        String decisionStr = approve ? "APPROVED" : "REJECTED";
        try {
            notificationService.updateDecisionPayload(labUser, NotificationType.LAB_PAYMENT_CANCELLATION_REQUESTED, saved.getId(), decisionStr);
        } catch (Exception ignore) {}
        publishPaymentRealtime(saved, "CANCEL_DECIDED", saved.getCancelRequestDecision() != null ? saved.getCancelRequestDecision().name() : null);
        return saved;
    }

    @Transactional
    public List<Prothesis> updateMyProthesesStatus(User labUser, List<Long> prothesisIds, String status) {
        if (prothesisIds == null || prothesisIds.isEmpty()) {
            throw new BadRequestException(java.util.Map.of("ids", "Aucune prothèse sélectionnée"));
        }

        String statusNorm = status != null ? status.trim().toUpperCase(Locale.ROOT) : "";
        if (!"PRETE".equals(statusNorm)) {
            throw new BadRequestException(java.util.Map.of("status", "Statut invalide"));
        }

        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        List<Prothesis> updated = new ArrayList<>();

        for (Long id : prothesisIds) {
            if (id == null) continue;
            // Use lightweight fetch graph to avoid Hibernate eager-join explosion on User -> permissions/preferences/etc.
            Prothesis p = prothesisRepository.findForResponseById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prothese introuvable"));

            if (p.getLaboratory() == null || p.getLaboratory().getId() == null || !p.getLaboratory().getId().equals(lab.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
            }
            if (p.getRecordStatus() == RecordStatus.CANCELLED) {
                throw new BadRequestException(java.util.Map.of("_", "Prothèse annulée : lecture seule."));
            }

            String currentStatus = p.getStatus() != null ? p.getStatus().trim().toUpperCase(Locale.ROOT) : "PENDING";
            boolean allowed = "SENT_TO_LAB".equals(currentStatus) || "PRETE".equals(currentStatus);
            if (!allowed) {
                throw new BadRequestException(java.util.Map.of("status", "Transition de statut invalide"));
            }

            p.setStatus(statusNorm);
            if ("PRETE".equals(statusNorm) && p.getReadyAt() == null) {
                p.setReadyAt(LocalDateTime.now());
            }
            p.setUpdatedBy(labUser);
            updated.add(p);
        }

        // Entities are managed (@Transactional), changes will flush on commit.
        publishBulkProthesisStatusUpdated(updated);
        return updated;
    }

    private void publishProthesisRealtime(Prothesis prothesis, String action, String decision) {
        if (prothesis == null || prothesis.getId() == null) return;
        User clinicOwner = prothesis.getPractitioner();
        UUID dentistPublicId = clinicOwner != null ? clinicOwner.getPublicId() : null;
        Laboratory lab = prothesis.getLaboratory();
        UUID labPublicId = lab != null ? lab.getPublicId() : null;

        eventPublisher.publishEvent(new LabOpsChangedEvent(
                realtimeRecipientsService.clinicPhones(clinicOwner),
                realtimeRecipientsService.labPhones(lab),
                "PROTHESIS_UPDATED",
                action != null ? action : "UPDATED",
                java.util.Collections.singletonList(prothesis.getId()),
                decision,
                dentistPublicId,
                labPublicId
        ));
    }

    private void publishPaymentRealtime(LaboratoryPayment payment, String action, String decision) {
        if (payment == null || payment.getId() == null) return;
        User dentist = payment.getCreatedBy();
        UUID dentistPublicId = dentist != null ? dentist.getPublicId() : null;
        Laboratory lab = payment.getLaboratory();
        UUID labPublicId = lab != null ? lab.getPublicId() : null;

        eventPublisher.publishEvent(new LabOpsChangedEvent(
                realtimeRecipientsService.clinicPhones(dentist),
                realtimeRecipientsService.labPhones(lab),
                "LAB_PAYMENT_UPDATED",
                action != null ? action : "UPDATED",
                java.util.Collections.singletonList(payment.getId()),
                decision,
                dentistPublicId,
                labPublicId
        ));
    }

    private void publishBulkProthesisStatusUpdated(List<Prothesis> updated) {
        if (updated == null || updated.isEmpty()) return;

        // Group by dentist so embedded lab portal tabs can refresh selectively.
        java.util.Map<UUID, java.util.List<Long>> idsByDentistPublicId = new java.util.HashMap<>();
        java.util.Map<UUID, User> dentistByPublicId = new java.util.HashMap<>();
        Laboratory lab = null;

        for (Prothesis p : updated) {
            if (p == null || p.getId() == null) continue;
            User dentist = p.getPractitioner();
            UUID dentistPublicId = dentist != null ? dentist.getPublicId() : null;
            if (dentistPublicId == null) continue;
            dentistByPublicId.putIfAbsent(dentistPublicId, dentist);
            idsByDentistPublicId.computeIfAbsent(dentistPublicId, __ -> new java.util.ArrayList<>()).add(p.getId());
            if (lab == null) lab = p.getLaboratory();
        }

        for (var e : idsByDentistPublicId.entrySet()) {
            UUID dentistPublicId = e.getKey();
            User dentist = dentistByPublicId.get(dentistPublicId);
            List<Long> ids = e.getValue();
            if (ids == null || ids.isEmpty()) continue;

            UUID labPublicId = lab != null ? lab.getPublicId() : null;
            eventPublisher.publishEvent(new LabOpsChangedEvent(
                    realtimeRecipientsService.clinicPhones(dentist),
                    realtimeRecipientsService.labPhones(lab),
                    "PROTHESIS_UPDATED",
                    "STATUS_CHANGED_BY_LAB",
                    ids,
                    "PRETE",
                    dentistPublicId,
                    labPublicId
            ));
        }
    }
}
