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
    private final AuditService auditService;
    private final CancellationSecurityService cancellationSecurityService;

    public LaboratoryController(LaboratoryService service,
                                UserService userService,
                                PublicIdResolutionService publicIdResolutionService,
                                AuditService auditService,
                                CancellationSecurityService cancellationSecurityService) {
        this.service = service;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.auditService = auditService;
        this.cancellationSecurityService = cancellationSecurityService;
    }

    @GetMapping
    public ResponseEntity<List<LaboratoryResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.LABORATORY_READ, "LABORATORY", null, "Laboratoires consultés");
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
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
        List<LaboratoryListResponse> items = paged.getContent().stream().map(this::mapToListResponse).toList();

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
        return ResponseEntity.ok(service.findArchivedByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
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
        List<LaboratoryListResponse> items = paged.getContent().stream().map(this::mapToListResponse).toList();

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
        Laboratory laboratory = publicIdResolutionService.requireLaboratoryOwnedBy(id, user);
        auditService.logSuccess(
                AuditEventType.LABORATORY_READ,
                "LABORATORY",
                String.valueOf(laboratory.getId()),
                "Laboratoire consulté"
        );
        return ResponseEntity.ok(mapToResponse(laboratory));
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
        Laboratory laboratory = publicIdResolutionService.requireLaboratoryOwnedBy(id, user);

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
        Laboratory laboratory = publicIdResolutionService.requireLaboratoryOwnedBy(id, user);

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
        Laboratory laboratory = publicIdResolutionService.requireLaboratoryOwnedBy(id, user);

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
        Laboratory laboratory = publicIdResolutionService.requireLaboratoryOwnedBy(id, user);

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
        return ResponseEntity.ok(mapToResponse(laboratory));
    }

    @PutMapping("/{id}/unarchive")
    public ResponseEntity<LaboratoryResponse> unarchive(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalLabId = publicIdResolutionService.requireLaboratoryOwnedBy(id, user).getId();
        service.unarchiveByUser(internalLabId, user);
        Laboratory laboratory = service.findByIdAndUser(internalLabId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));
        auditService.logSuccess(AuditEventType.LABORATORY_UPDATE, "LABORATORY", String.valueOf(internalLabId), "Laboratoire désarchivé");
        return ResponseEntity.ok(mapToResponse(laboratory));
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
        return ResponseEntity.ok(mapToResponse(saved));
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
                .map(this::mapToResponse)
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
        Long internalLabId = publicIdResolutionService.requireLaboratoryOwnedBy(id, user).getId();
        service.addPayment(internalLabId, dto, user);
        auditService.logSuccess(
                AuditEventType.LAB_PAYMENT_CREATE,
                "LABORATORY",
                String.valueOf(internalLabId),
                "Paiement laboratoire ajouté"
        );
        Laboratory laboratory = service.findByIdAndUser(internalLabId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));
        return ResponseEntity.ok(mapToResponse(laboratory));
    }

    @PutMapping("/{id}/payments/{paymentId}/cancel")
    public ResponseEntity<Void> cancelPayment(@PathVariable String id, @PathVariable Long paymentId, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        User user = userService.resolveClinicOwner(actor);
        String reason = cancellationSecurityService.requirePinAndReason(actor, payload.pin(), payload.reason());
        Long internalLabId = publicIdResolutionService.requireLaboratoryOwnedBy(id, user).getId();
        Laboratory laboratory = service.findByIdAndUser(internalLabId, user).orElse(null);
        if (laboratory == null) {
            throw new NotFoundException("Laboratoire introuvable");
        }

        if (!service.deletePayment(internalLabId, paymentId, user)) {
            throw new NotFoundException("Paiement introuvable");
        }
        auditService.logSuccess(
                AuditEventType.LAB_PAYMENT_CANCEL,
                "LABORATORY",
                String.valueOf(internalLabId),
                "Paiement laboratoire annulé. Motif: " + reason
        );
        return ResponseEntity.noContent().build();
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

    private LaboratoryResponse mapToResponse(Laboratory l) {
        User user = l.getCreatedBy();
        double totalOwed = service.getTotalOwed(l, user);
        double totalPaid = service.getTotalPaid(l, user);
        double remainingToPay = Math.max(totalOwed - totalPaid, 0.0);
        List<LaboratoryPaymentResponse> payments = service.getPaymentsForLaboratory(l, user).stream()
                .map(payment -> new LaboratoryPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt(),
                        payment.getCreatedBy() != null
                                ? ((payment.getCreatedBy().getFirstname() != null ? payment.getCreatedBy().getFirstname().trim() : "")
                                + " " + (payment.getCreatedBy().getLastname() != null ? payment.getCreatedBy().getLastname().trim() : "")).trim()
                                : null
                ))
                .collect(Collectors.toList());
        List<LaboratoryBillingSummaryResponse> billingHistory = service.getBillingHistoryForLaboratory(l, user);
        List<LaboratoryBillingEntryResponse> billingEntries = service.getBillingEntriesForLaboratory(l, user);

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
                l.getArchivedAt()
        );
    }

    private LaboratoryListResponse mapToListResponse(Laboratory l) {
        String createdByName = null;
        if (l.getCreatedBy() != null) {
            String first = l.getCreatedBy().getFirstname() != null ? l.getCreatedBy().getFirstname().trim() : "";
            String last = l.getCreatedBy().getLastname() != null ? l.getCreatedBy().getLastname().trim() : "";
            String combined = (first + " " + last).trim();
            createdByName = combined.isBlank() ? null : combined;
        }
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
                l.getArchivedAt()
        );
    }
}
