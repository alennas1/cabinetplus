package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.LabDentistListItemResponse;
import com.cabinetplus.backend.dto.LabInvitationResponse;
import com.cabinetplus.backend.dto.LabMeResponse;
import com.cabinetplus.backend.dto.LabPaymentListItemResponse;
import com.cabinetplus.backend.dto.LabProthesisListItemResponse;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryConnection;
import com.cabinetplus.backend.models.LaboratoryPayment;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.LabPortalService;
import com.cabinetplus.backend.services.LaboratoryAccessService;
import com.cabinetplus.backend.services.LaboratoryConnectionService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/lab")
public class LabPortalController {

    private final UserService userService;
    private final LaboratoryAccessService laboratoryAccessService;
    private final LaboratoryConnectionService laboratoryConnectionService;
    private final LabPortalService labPortalService;

    public LabPortalController(
            UserService userService,
            LaboratoryAccessService laboratoryAccessService,
            LaboratoryConnectionService laboratoryConnectionService,
            LabPortalService labPortalService
    ) {
        this.userService = userService;
        this.laboratoryAccessService = laboratoryAccessService;
        this.laboratoryConnectionService = laboratoryConnectionService;
        this.labPortalService = labPortalService;
    }

    @GetMapping("/me")
    public ResponseEntity<LabMeResponse> me(Principal principal) {
        User labUser = requireLabUser(principal);
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        return ResponseEntity.ok(new LabMeResponse(
                lab.getPublicId(),
                lab.getName(),
                lab.getContactPerson(),
                lab.getPhoneNumber(),
                lab.getAddress()
        ));
    }

    @GetMapping("/invitations")
    @Transactional(readOnly = true)
    public ResponseEntity<List<LabInvitationResponse>> invitations(Principal principal) {
        User labUser = requireLabUser(principal);
        List<LaboratoryConnection> pending = laboratoryConnectionService.getPendingInvitationsForLab(labUser);
        return ResponseEntity.ok(pending.stream().map(this::mapInvitation).toList());
    }

    @PostMapping("/invitations/{id}/accept")
    @Transactional
    public ResponseEntity<LabInvitationResponse> acceptInvitation(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryConnection accepted = laboratoryConnectionService.acceptInvitation(labUser, id);
        return ResponseEntity.ok(mapInvitation(accepted));
    }

    @PostMapping("/invitations/{id}/reject")
    @Transactional
    public ResponseEntity<LabInvitationResponse> rejectInvitation(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryConnection rejected = laboratoryConnectionService.rejectInvitation(labUser, id);
        return ResponseEntity.ok(mapInvitation(rejected));
    }

    @GetMapping("/dentists")
    public ResponseEntity<List<LabDentistListItemResponse>> dentists(Principal principal) {
        User labUser = requireLabUser(principal);
        List<LaboratoryConnection> accepted = laboratoryConnectionService.getAcceptedDentistsForLab(labUser);
        return ResponseEntity.ok(accepted.stream().map(conn -> {
            User dentist = conn.getDentist();
            return new LabDentistListItemResponse(
                    dentist != null ? dentist.getPublicId() : null,
                    fullName(dentist),
                    dentist != null ? dentist.getClinicName() : null,
                    dentist != null ? dentist.getPhoneNumber() : null
            );
        }).toList());
    }

    @GetMapping("/protheses/paged")
    public ResponseEntity<PageResponse<LabProthesisListItemResponse>> prothesesPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "dentistId", required = false) String dentistId,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);
        UUID dentistPublicId = parseUuidOrNull(dentistId);

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Order.desc("sentToLabDate"), Sort.Order.desc("dateCreated"), Sort.Order.desc("id"))
        );

        var paged = labPortalService.getMyProthesesPaged(labUser, q, status, dentistPublicId, fromDt, toDt, pageable);
        var items = paged.getContent().stream().map(this::mapProthesis).toList();
        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/payments/paged")
    public ResponseEntity<PageResponse<LabPaymentListItemResponse>> paymentsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "dentistId", required = false) String dentistId,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            Principal principal
    ) {
        User labUser = requireLabUser(principal);
        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);
        UUID dentistPublicId = parseUuidOrNull(dentistId);

        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Order.desc("paymentDate"), Sort.Order.desc("id"))
        );

        var paged = labPortalService.getMyPaymentsPaged(labUser, q, dentistPublicId, fromDt, toDt, pageable);
        var items = paged.getContent().stream().map(this::mapPayment).toList();
        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @PutMapping("/protheses/{id}/cancel/approve")
    public ResponseEntity<LabProthesisListItemResponse> approveProthesisCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        Prothesis updated = labPortalService.decideProthesisCancellation(labUser, id, true);
        return ResponseEntity.ok(mapProthesis(updated));
    }

    @PutMapping("/protheses/{id}/cancel/reject")
    public ResponseEntity<LabProthesisListItemResponse> rejectProthesisCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        Prothesis updated = labPortalService.decideProthesisCancellation(labUser, id, false);
        return ResponseEntity.ok(mapProthesis(updated));
    }

    @PutMapping("/payments/{id}/cancel/approve")
    public ResponseEntity<LabPaymentListItemResponse> approvePaymentCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryPayment updated = labPortalService.decidePaymentCancellation(labUser, id, true);
        return ResponseEntity.ok(mapPayment(updated));
    }

    @PutMapping("/payments/{id}/cancel/reject")
    public ResponseEntity<LabPaymentListItemResponse> rejectPaymentCancel(@PathVariable Long id, Principal principal) {
        User labUser = requireLabUser(principal);
        LaboratoryPayment updated = labPortalService.decidePaymentCancellation(labUser, id, false);
        return ResponseEntity.ok(mapPayment(updated));
    }

    private User requireLabUser(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        if (user.getRole() != UserRole.LAB) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        return user;
    }

    private LabInvitationResponse mapInvitation(LaboratoryConnection conn) {
        User dentist = conn != null ? conn.getDentist() : null;
        Laboratory mergeFrom = conn != null ? conn.getMergeFromLaboratory() : null;
        return new LabInvitationResponse(
                conn != null ? conn.getId() : null,
                dentist != null ? dentist.getPublicId() : null,
                fullName(dentist),
                dentist != null ? dentist.getClinicName() : null,
                conn != null ? conn.getInvitedAt() : null,
                conn != null && conn.getStatus() != null ? conn.getStatus().name() : null,
                mergeFrom != null ? mergeFrom.getPublicId() : null,
                mergeFrom != null ? mergeFrom.getName() : null
        );
    }

    private LabProthesisListItemResponse mapProthesis(Prothesis p) {
        String patientName = null;
        if (p != null && p.getPatient() != null) {
            String first = p.getPatient().getFirstname() != null ? p.getPatient().getFirstname().trim() : "";
            String last = p.getPatient().getLastname() != null ? p.getPatient().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            patientName = combined.isBlank() ? null : combined;
        }

        String dentistName = fullName(p != null ? p.getPractitioner() : null);
        String prothesisName = p != null && p.getProthesisCatalog() != null ? p.getProthesisCatalog().getName() : null;
        String status = p != null && p.getRecordStatus() == RecordStatus.CANCELLED ? "CANCELLED" : (p != null ? p.getStatus() : null);
        LocalDateTime billingDate = p != null && p.getSentToLabDate() != null ? p.getSentToLabDate() : (p != null ? p.getDateCreated() : null);
        return new LabProthesisListItemResponse(
                p != null ? p.getId() : null,
                patientName,
                prothesisName,
                status,
                p != null ? p.getLabCost() : null,
                billingDate,
                dentistName,
                p != null ? p.getCancelledAt() : null,
                p != null && p.getCancelRequestDecision() != null ? p.getCancelRequestDecision().name() : null
        );
    }

    private LabPaymentListItemResponse mapPayment(LaboratoryPayment lp) {
        return new LabPaymentListItemResponse(
                lp != null ? lp.getId() : null,
                lp != null ? lp.getAmount() : null,
                lp != null ? lp.getPaymentDate() : null,
                lp != null ? lp.getNotes() : null,
                lp != null ? lp.getRecordStatus() : null,
                lp != null ? lp.getCancelledAt() : null,
                fullName(lp != null ? lp.getCreatedBy() : null),
                lp != null && lp.getCancelRequestDecision() != null ? lp.getCancelRequestDecision().name() : null
        );
    }

    private static String fullName(User user) {
        if (user == null) return null;
        String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
        String last = user.getLastname() != null ? user.getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        return combined.isBlank() ? null : combined;
    }

    private static LocalDateTime parseDateStart(String value) {
        if (value == null || value.isBlank()) return null;
        String raw = value.trim();
        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return LocalDate.parse(raw).atStartOfDay();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private static LocalDateTime parseDateEnd(String value) {
        if (value == null || value.isBlank()) return null;
        String raw = value.trim();
        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ignored) {
            // fall through
        }
        try {
            return LocalDate.parse(raw).atTime(23, 59, 59, 999_999_999);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private static UUID parseUuidOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
