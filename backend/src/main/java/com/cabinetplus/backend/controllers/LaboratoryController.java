package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
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
        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        Comparator<String> stringComparator = desc
                ? Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER.reversed())
                : Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER);

        Comparator<Laboratory> comparator = switch (sortKeyNorm) {
            case "name" -> Comparator.comparing(Laboratory::getName, stringComparator);
            case "contactperson", "contact_person", "contact" -> Comparator.comparing(Laboratory::getContactPerson, stringComparator);
            case "phonenumber", "phone_number", "phone" -> Comparator.comparing(Laboratory::getPhoneNumber, stringComparator);
            case "address" -> Comparator.comparing(Laboratory::getAddress, stringComparator);
            default -> Comparator.comparing(Laboratory::getName, stringComparator);
        };
        comparator = comparator.thenComparing(Laboratory::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        List<Laboratory> all = service.findAllByUser(user);
        List<Laboratory> filtered = (all == null ? List.<Laboratory>of() : all).stream()
                .filter(l -> {
                    if (qNorm.isBlank()) return true;
                    String name = l.getName() != null ? l.getName().trim().toLowerCase() : "";
                    String contact = l.getContactPerson() != null ? l.getContactPerson().trim().toLowerCase() : "";
                    String phone = l.getPhoneNumber() != null ? l.getPhoneNumber().trim().toLowerCase() : "";
                    String address = l.getAddress() != null ? l.getAddress().trim().toLowerCase() : "";
                    return name.contains(qNorm) || contact.contains(qNorm) || phone.contains(qNorm) || address.contains(qNorm);
                })
                .sorted(comparator)
                .toList();

        PageResponse<Laboratory> pageResponse = PaginationUtil.toPageResponse(filtered, page, size);
        List<LaboratoryListResponse> items = pageResponse.items().stream().map(this::mapToListResponse).toList();

        return ResponseEntity.ok(new PageResponse<>(
                items,
                pageResponse.page(),
                pageResponse.size(),
                pageResponse.totalElements(),
                pageResponse.totalPages()
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
        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        Comparator<String> stringComparator = desc
                ? Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER.reversed())
                : Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER);

        Comparator<Laboratory> comparator = switch (sortKeyNorm) {
            case "name" -> Comparator.comparing(Laboratory::getName, stringComparator);
            case "contactperson", "contact_person", "contact" -> Comparator.comparing(Laboratory::getContactPerson, stringComparator);
            case "phonenumber", "phone_number", "phone" -> Comparator.comparing(Laboratory::getPhoneNumber, stringComparator);
            case "address" -> Comparator.comparing(Laboratory::getAddress, stringComparator);
            default -> Comparator.comparing(Laboratory::getName, stringComparator);
        };
        comparator = comparator.thenComparing(Laboratory::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        List<Laboratory> all = service.findArchivedByUser(user);
        List<Laboratory> filtered = (all == null ? List.<Laboratory>of() : all).stream()
                .filter(l -> {
                    if (qNorm.isBlank()) return true;
                    String name = l.getName() != null ? l.getName().trim().toLowerCase() : "";
                    String contact = l.getContactPerson() != null ? l.getContactPerson().trim().toLowerCase() : "";
                    String phone = l.getPhoneNumber() != null ? l.getPhoneNumber().trim().toLowerCase() : "";
                    String address = l.getAddress() != null ? l.getAddress().trim().toLowerCase() : "";
                    return name.contains(qNorm) || contact.contains(qNorm) || phone.contains(qNorm) || address.contains(qNorm);
                })
                .sorted(comparator)
                .toList();

        PageResponse<Laboratory> pageResponse = PaginationUtil.toPageResponse(filtered, page, size);
        List<LaboratoryListResponse> items = pageResponse.items().stream().map(this::mapToListResponse).toList();

        return ResponseEntity.ok(new PageResponse<>(
                items,
                pageResponse.page(),
                pageResponse.size(),
                pageResponse.totalElements(),
                pageResponse.totalPages()
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
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");

        Comparator<String> stringComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<Double> doubleComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<LocalDateTime> dateComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());

        String sortKeyNorm = sortKey != null ? sortKey.trim() : "";
        Comparator<LaboratoryPaymentResponse> comparator = switch (sortKeyNorm) {
            case "amount" -> Comparator.comparing(LaboratoryPaymentResponse::amount, doubleComparator);
            case "notes" -> Comparator.comparing(p -> p.notes() != null ? p.notes().trim().toLowerCase() : "", stringComparator);
            case "paymentDate" -> Comparator.comparing(LaboratoryPaymentResponse::paymentDate, dateComparator);
            default -> Comparator.comparing(LaboratoryPaymentResponse::paymentDate, dateComparator);
        };
        comparator = comparator.thenComparing(LaboratoryPaymentResponse::id, Comparator.nullsLast(Comparator.naturalOrder()));

        List<LaboratoryPaymentResponse> all = service.getPaymentsForLaboratory(laboratory, user).stream()
                .map(payment -> new LaboratoryPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt()
                ))
                .toList();

        List<LaboratoryPaymentResponse> filtered = (all == null ? List.<LaboratoryPaymentResponse>of() : all).stream()
                .filter(p -> {
                    if (fromDt == null && toDt == null) return true;
                    LocalDateTime value = p.paymentDate();
                    if (value == null) return false;
                    if (fromDt != null && value.isBefore(fromDt)) return false;
                    return toDt == null || !value.isAfter(toDt);
                })
                .sorted(comparator)
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
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

        List<LaboratoryPaymentResponse> all = service.getPaymentsForLaboratory(laboratory, user).stream()
                .map(payment -> new LaboratoryPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt()
                ))
                .toList();

        List<LaboratoryPaymentResponse> filtered = (all == null ? List.<LaboratoryPaymentResponse>of() : all).stream()
                .filter(p -> {
                    if (fromDt == null && toDt == null) return true;
                    LocalDateTime value = p.paymentDate();
                    if (value == null) return false;
                    if (fromDt != null && value.isBefore(fromDt)) return false;
                    return toDt == null || !value.isAfter(toDt);
                })
                .toList();

        long count = filtered.size();
        double total = filtered.stream()
                .filter(p -> p.recordStatus() != RecordStatus.CANCELLED)
                .mapToDouble(p -> p.amount() != null ? p.amount() : 0.0)
                .sum();

        return ResponseEntity.ok(new CountTotalResponseDTO(count, total));
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

        Comparator<String> stringComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<Double> doubleComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());
        Comparator<LocalDateTime> dateComparator = desc
                ? Comparator.nullsLast(Comparator.reverseOrder())
                : Comparator.nullsLast(Comparator.naturalOrder());

        String sortKeyNorm = sortKey != null ? sortKey.trim() : "";
        Comparator<LaboratoryBillingEntryResponse> comparator = switch (sortKeyNorm) {
            case "patientName" -> Comparator.comparing(e -> e.patientName() != null ? e.patientName().trim().toLowerCase() : "", stringComparator);
            case "prothesisName" -> Comparator.comparing(e -> e.prothesisName() != null ? e.prothesisName().trim().toLowerCase() : "", stringComparator);
            case "amount" -> Comparator.comparing(LaboratoryBillingEntryResponse::amount, doubleComparator);
            case "billingDate" -> Comparator.comparing(LaboratoryBillingEntryResponse::billingDate, dateComparator);
            default -> Comparator.comparing(LaboratoryBillingEntryResponse::billingDate, dateComparator);
        };
        comparator = comparator.thenComparing(LaboratoryBillingEntryResponse::prothesisId, Comparator.nullsLast(Comparator.naturalOrder()));

        List<LaboratoryBillingEntryResponse> all = service.getBillingEntriesForLaboratory(laboratory, user);
        List<LaboratoryBillingEntryResponse> filtered = (all == null ? List.<LaboratoryBillingEntryResponse>of() : all).stream()
                .filter(e -> {
                    if (fromDt == null && toDt == null) return true;
                    LocalDateTime value = e.billingDate();
                    if (value == null) return false;
                    if (fromDt != null && value.isBefore(fromDt)) return false;
                    return toDt == null || !value.isAfter(toDt);
                })
                .sorted(comparator)
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
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

        List<LaboratoryBillingEntryResponse> all = service.getBillingEntriesForLaboratory(laboratory, user);
        List<LaboratoryBillingEntryResponse> filtered = (all == null ? List.<LaboratoryBillingEntryResponse>of() : all).stream()
                .filter(e -> {
                    if (fromDt == null && toDt == null) return true;
                    LocalDateTime value = e.billingDate();
                    if (value == null) return false;
                    if (fromDt != null && value.isBefore(fromDt)) return false;
                    return toDt == null || !value.isAfter(toDt);
                })
                .toList();

        long count = filtered.size();
        double total = filtered.stream().mapToDouble(e -> e.amount() != null ? e.amount() : 0.0).sum();
        return ResponseEntity.ok(new CountTotalResponseDTO(count, total));
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
        User user = getCurrentUser(principal);
        String reason = cancellationSecurityService.requirePinAndReason(user, payload.pin(), payload.reason());
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
                        payment.getCancelledAt()
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
        return new LaboratoryListResponse(
                l.getId(),
                l.getPublicId(),
                l.getName(),
                l.getContactPerson(),
                l.getPhoneNumber(),
                l.getAddress(),
                l.getRecordStatus(),
                l.getArchivedAt()
        );
    }
}
