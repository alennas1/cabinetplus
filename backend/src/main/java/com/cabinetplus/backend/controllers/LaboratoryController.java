package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.services.*;
import com.cabinetplus.backend.util.PaginationUtil;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/laboratories")
public class LaboratoryController {
    private final LaboratoryService service;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final LaboratoryAccessService laboratoryAccessService;
    private final AuditService auditService;
    private final CancellationSecurityService cancellationSecurityService;

    public LaboratoryController(LaboratoryService service,
                                UserService userService,
                                PublicIdResolutionService publicIdResolutionService,
                                LaboratoryAccessService laboratoryAccessService,
                                AuditService auditService,
                                CancellationSecurityService cancellationSecurityService) {
        this.service = service;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.laboratoryAccessService = laboratoryAccessService;
        this.auditService = auditService;
        this.cancellationSecurityService = cancellationSecurityService;
    }

    @GetMapping
    public ResponseEntity<List<LaboratoryResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.LABORATORY_READ, "LABORATORY", null, "Laboratoires consultés");
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(l -> mapToResponse(l, user)).collect(Collectors.toList()));
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<LaboratoryListResponse>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "direction", required = false) String direction,
            Principal principal) {

        User user = getCurrentUser(principal);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        String sortProperty = switch (sortKeyNorm) {
            case "name" -> "name";
            case "contactperson", "contact_person", "contact" -> "contactPerson";
            case "phonenumber", "phone_number", "phone" -> "phoneNumber";
            case "address" -> "address";
            case "createdat", "created_at" -> "createdAt";
            default -> "name";
        };

        Sort.Order primary = Sort.Order.by(sortProperty)
                .with(desc ? Sort.Direction.DESC : Sort.Direction.ASC)
                .nullsLast();
        if (!"createdAt".equals(sortProperty)) {
            primary = primary.ignoreCase();
        }

        var pageable = org.springframework.data.domain.PageRequest.of(
                safePage,
                safeSize,
                Sort.by(primary).and(Sort.by(Sort.Order.asc("id")))
        );

        var paged = service.searchByUser(user, q, pageable);
        List<LaboratoryListResponse> items = paged.getContent().stream().map(l -> mapToListResponse(l, user)).toList();

        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/archived")
    public ResponseEntity<List<LaboratoryResponse>> getArchived(Principal principal) {
        User user = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.LABORATORY_READ, "LABORATORY", null, "Laboratoires archivés consultés");
        return ResponseEntity.ok(service.findArchivedByUser(user).stream().map(l -> mapToResponse(l, user)).collect(Collectors.toList()));
    }

    @GetMapping("/archived/paged")
    public ResponseEntity<PageResponse<LaboratoryListResponse>> getArchivedPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "direction", required = false) String direction,
            Principal principal) {

        User user = getCurrentUser(principal);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        String sortProperty = switch (sortKeyNorm) {
            case "name" -> "name";
            case "contactperson", "contact_person", "contact" -> "contactPerson";
            case "phonenumber", "phone_number", "phone" -> "phoneNumber";
            case "address" -> "address";
            case "createdat", "created_at" -> "createdAt";
            default -> "name";
        };

        Sort.Order primary = Sort.Order.by(sortProperty)
                .with(desc ? Sort.Direction.DESC : Sort.Direction.ASC)
                .nullsLast();
        if (!"createdAt".equals(sortProperty)) {
            primary = primary.ignoreCase();
        }

        var pageable = org.springframework.data.domain.PageRequest.of(
                safePage,
                safeSize,
                Sort.by(primary).and(Sort.by(Sort.Order.asc("id")))
        );

        var paged = service.searchArchivedByUser(user, q, pageable);
        List<LaboratoryListResponse> items = paged.getContent().stream().map(l -> mapToListResponse(l, user)).toList();

        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LaboratoryResponse> getOne(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = laboratoryAccessService.requireLaboratoryAccessibleByDentist(id, user);
        auditService.logSuccess(
                AuditEventType.LABORATORY_READ,
                "LABORATORY",
                String.valueOf(laboratory.getId()),
                "Laboratoire consulté"
        );
        return ResponseEntity.ok(mapToResponse(laboratory, user));
    }

    @GetMapping("/{id}/payments/paged")
    public ResponseEntity<PageResponse<LaboratoryPaymentResponse>> getPaymentsPaged(
            @PathVariable String id,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "direction", required = false) String direction,
            Principal principal
    ) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = laboratoryAccessService.requireLaboratoryAccessibleByDentist(id, user);

        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        String sortKeyNorm = sortKey != null ? sortKey.trim() : "";
        String sortProperty = switch (sortKeyNorm) {
            case "amount" -> "amount";
            case "notes" -> "notes";
            case "paymentDate" -> "paymentDate";
            default -> "paymentDate";
        };

        Sort.Order primary = Sort.Order.by(sortProperty)
                .with(desc ? Sort.Direction.DESC : Sort.Direction.ASC)
                .nullsLast();
        if ("notes".equals(sortProperty)) {
            primary = primary.ignoreCase();
        }

        var pageable = org.springframework.data.domain.PageRequest.of(
                safePage,
                safeSize,
                Sort.by(primary).and(Sort.by(Sort.Order.asc("id")))
        );

        var paged = service.getPaymentsPagedForLaboratory(laboratory, user, fromDt, toDt, pageable);
        return ResponseEntity.ok(new PageResponse<>(
                paged.getContent(),
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/{id}/payments/summary")
    public ResponseEntity<CountTotalResponseDTO> getPaymentsSummary(
            @PathVariable String id,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            Principal principal
    ) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = laboratoryAccessService.requireLaboratoryAccessibleByDentist(id, user);

        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);

        return ResponseEntity.ok(service.getPaymentsSummaryForLaboratory(laboratory, user, fromDt, toDt));
    }

    @GetMapping("/{id}/billing-entries/paged")
    public ResponseEntity<PageResponse<LaboratoryBillingEntryResponse>> getBillingEntriesPaged(
            @PathVariable String id,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "direction", required = false) String direction,
            Principal principal
    ) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = laboratoryAccessService.requireLaboratoryAccessibleByDentist(id, user);

        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String sortKeyNorm = sortKey != null ? sortKey.trim() : "";

        Sort sort = Sort.unsorted();
        if ("patientName".equalsIgnoreCase(sortKeyNorm)) {
            sort = Sort.by(
                    Sort.Order.by("patient.lastname").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.by("patient.firstname").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.asc("id")
            );
        } else if ("prothesisName".equalsIgnoreCase(sortKeyNorm)) {
            sort = Sort.by(
                    Sort.Order.by("prothesisCatalog.name").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC),
                    Sort.Order.asc("id")
            );
        } else if ("amount".equalsIgnoreCase(sortKeyNorm)) {
            sort = Sort.by(
                    (desc ? Sort.Order.desc("labCost") : Sort.Order.asc("labCost")).nullsLast(),
                    Sort.Order.asc("id")
            );
        }

        var pageable = sort.isUnsorted()
                ? org.springframework.data.domain.PageRequest.of(safePage, safeSize)
                : org.springframework.data.domain.PageRequest.of(safePage, safeSize, sort);

        var paged = service.getBillingEntriesPagedForLaboratory(laboratory, user, fromDt, toDt, sortKeyNorm, desc, pageable);

        return ResponseEntity.ok(new PageResponse<>(
                paged.getContent(),
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @GetMapping("/{id}/billing-entries/summary")
    public ResponseEntity<CountTotalResponseDTO> getBillingEntriesSummary(
            @PathVariable String id,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            Principal principal
    ) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = laboratoryAccessService.requireLaboratoryAccessibleByDentist(id, user);

        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);

        return ResponseEntity.ok(service.getBillingEntriesSummaryForLaboratory(laboratory, user, fromDt, toDt));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<LaboratoryResponse> archive(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalLabId = publicIdResolutionService.requireLaboratoryOwnedBy(id, user).getId();
        service.archiveByUser(internalLabId, user);
        Laboratory laboratory = service.findByIdAndUser(internalLabId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));
        auditService.logSuccess(AuditEventType.LABORATORY_ARCHIVE, "LABORATORY", String.valueOf(internalLabId), "Laboratoire archivé");
        return ResponseEntity.ok(mapToResponse(laboratory, user));
    }

    @PutMapping("/{id}/unarchive")
    public ResponseEntity<LaboratoryResponse> unarchive(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalLabId = publicIdResolutionService.requireLaboratoryOwnedBy(id, user).getId();
        service.unarchiveByUser(internalLabId, user);
        Laboratory laboratory = service.findByIdAndUser(internalLabId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));
        auditService.logSuccess(AuditEventType.LABORATORY_UPDATE, "LABORATORY", String.valueOf(internalLabId), "Laboratoire désarchivé");
        return ResponseEntity.ok(mapToResponse(laboratory, user));
    }

    @PostMapping
    public ResponseEntity<LaboratoryResponse> create(@Valid @RequestBody LaboratoryRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory entity = new Laboratory();
        entity.setName(dto.name());
        entity.setContactPerson(dto.contactPerson());
        entity.setPhoneNumber(dto.phoneNumber());
        entity.setAddress(dto.address());
        entity.setCreatedBy(user);
        Laboratory saved = service.save(entity);
        auditService.logSuccess(
                AuditEventType.LABORATORY_CREATE,
                "LABORATORY",
                String.valueOf(saved.getId()),
                "Laboratoire créé"
        );
        return ResponseEntity.ok(mapToResponse(saved, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LaboratoryResponse> update(@PathVariable String id, @Valid @RequestBody LaboratoryRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalLabId = publicIdResolutionService.requireLaboratoryOwnedBy(id, user).getId();
        Laboratory updateData = new Laboratory();
        updateData.setName(dto.name());
        updateData.setContactPerson(dto.contactPerson());
        updateData.setPhoneNumber(dto.phoneNumber());
        updateData.setAddress(dto.address());
        return service.update(internalLabId, updateData, user)
                .map(l -> mapToResponse(l, user))
                .map(resp -> {
                    auditService.logSuccess(
                            AuditEventType.LABORATORY_UPDATE,
                            "LABORATORY",
                            String.valueOf(internalLabId),
                            "Laboratoire modifié"
                    );
                    return resp;
                })
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Laboratoire introuvable"));
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<LaboratoryResponse> addPayment(@PathVariable String id,
                                                         @Valid @RequestBody LaboratoryPaymentRequest dto,
                                                         Principal principal) {
        User user = getCurrentUser(principal);
        Laboratory laboratory = laboratoryAccessService.requireLaboratoryAccessibleByDentist(id, user);
        service.addPaymentForLaboratory(laboratory, dto, user);
        auditService.logSuccess(
                AuditEventType.LAB_PAYMENT_CREATE,
                "LABORATORY",
                String.valueOf(laboratory.getId()),
                "Paiement laboratoire ajouté"
        );
        return ResponseEntity.ok(mapToResponse(laboratory, user));
    }

    @PutMapping("/{id}/payments/{paymentId}/cancel")
    public ResponseEntity<LaboratoryPaymentResponse> cancelPayment(@PathVariable String id, @PathVariable Long paymentId, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        User user = userService.resolveClinicOwner(actor);
        String reason = cancellationSecurityService.requirePinAndReason(actor, payload.pin(), payload.reason());
        Laboratory laboratory = laboratoryAccessService.requireLaboratoryAccessibleByDentist(id, user);

        boolean requireConfirmation = laboratoryAccessService.isSelfRegisteredLab(laboratory) && !sameUser(laboratory.getCreatedBy(), user);
        LaboratoryPayment updated = service.cancelPaymentOrRequest(laboratory, paymentId, user, actor, reason, requireConfirmation)
                .orElseThrow(() -> new NotFoundException("Paiement introuvable"));
        String msg = updated.getRecordStatus() == RecordStatus.CANCELLED
                ? ("Paiement laboratoire annule. Motif: " + reason)
                : ("Demande d'annulation de paiement envoyee au laboratoire. Motif: " + reason);
        auditService.logSuccess(
                AuditEventType.LAB_PAYMENT_CANCEL,
                "LABORATORY",
                String.valueOf(laboratory.getId()),
                msg
        );
        return ResponseEntity.ok(mapPaymentToResponse(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalLabId = publicIdResolutionService.requireLaboratoryOwnedBy(id, user).getId();
        Laboratory laboratory = service.findByIdAndUser(internalLabId, user).orElse(null);
        if (laboratory == null) {
            throw new NotFoundException("Laboratoire introuvable");
        }

        service.deleteByUser(internalLabId, user);
        auditService.logSuccess(
                AuditEventType.LABORATORY_ARCHIVE,
                "LABORATORY",
                String.valueOf(internalLabId),
                "Laboratoire archivé"
        );

        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
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

    private static String fullName(User user) {
        if (user == null) return null;
        String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
        String last = user.getLastname() != null ? user.getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        return combined.isBlank() ? null : combined;
    }

    private static boolean sameUser(User a, User b) {
        if (a == null || b == null) return false;
        return a.getId() != null && b.getId() != null && a.getId().equals(b.getId());
    }

    private LaboratoryResponse mapToResponse(Laboratory l, User viewerDentist) {
        boolean editable = sameUser(l.getCreatedBy(), viewerDentist);
        boolean connected = !editable && laboratoryAccessService.isSelfRegisteredLab(l);

        double totalOwed = service.getTotalOwed(l, viewerDentist);
        double totalPaid = service.getTotalPaid(l, viewerDentist);
        double remainingToPay = totalOwed - totalPaid;
        List<LaboratoryPaymentResponse> payments = service.getPaymentsForLaboratory(l, viewerDentist).stream()
                .map(payment -> new LaboratoryPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt(),
                        fullName(payment.getCreatedBy()),
                        payment.getCancelRequestedAt(),
                        fullName(payment.getCancelRequestedBy()),
                        payment.getCancelRequestReason(),
                        payment.getCancelRequestDecision() != null ? payment.getCancelRequestDecision().name() : null,
                        payment.getCancelRequestDecidedAt(),
                        fullName(payment.getCancelRequestDecidedBy())
                ))
                .collect(Collectors.toList());
        List<LaboratoryBillingSummaryResponse> billingHistory = service.getBillingHistoryForLaboratory(l, viewerDentist);
        List<LaboratoryBillingEntryResponse> billingEntries = service.getBillingEntriesForLaboratory(l, viewerDentist);

        return new LaboratoryResponse(
                l.getId(),
                l.getPublicId(),
                l.getName(),
                l.getContactPerson(),
                l.getPhoneNumber(),
                l.getAddress(),
                totalOwed,
                totalPaid,
                remainingToPay,
                payments,
                billingHistory,
                billingEntries,
                l.getRecordStatus(),
                l.getArchivedAt(),
                connected,
                editable
        );
    }

    private LaboratoryListResponse mapToListResponse(Laboratory l, User viewerDentist) {
        boolean editable = sameUser(l.getCreatedBy(), viewerDentist);
        boolean connected = !editable && laboratoryAccessService.isSelfRegisteredLab(l);
        String createdByName = fullName(l.getCreatedBy());
        return new LaboratoryListResponse(
                l.getId(),
                l.getPublicId(),
                l.getName(),
                l.getContactPerson(),
                l.getPhoneNumber(),
                l.getAddress(),
                l.getCreatedAt(),
                createdByName,
                l.getRecordStatus(),
                l.getArchivedAt(),
                connected,
                editable
        );
    }

    private LaboratoryPaymentResponse mapPaymentToResponse(LaboratoryPayment payment) {
        if (payment == null) {
            return null;
        }
        return new LaboratoryPaymentResponse(
                payment.getId(),
                payment.getAmount(),
                payment.getPaymentDate(),
                payment.getNotes(),
                payment.getRecordStatus(),
                payment.getCancelledAt(),
                fullName(payment.getCreatedBy()),
                payment.getCancelRequestedAt(),
                fullName(payment.getCancelRequestedBy()),
                payment.getCancelRequestReason(),
                payment.getCancelRequestDecision() != null ? payment.getCancelRequestDecision().name() : null,
                payment.getCancelRequestDecidedAt(),
                fullName(payment.getCancelRequestDecidedBy())
        );
    }
}
