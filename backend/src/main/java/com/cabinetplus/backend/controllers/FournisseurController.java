package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.FournisseurRequest;
import com.cabinetplus.backend.dto.FournisseurDetailsResponse;
import com.cabinetplus.backend.dto.FournisseurPaymentRequest;
import com.cabinetplus.backend.dto.FournisseurPaymentResponse;
import com.cabinetplus.backend.dto.FournisseurResponse;
import com.cabinetplus.backend.dto.FournisseurBillingEntryResponse;
import com.cabinetplus.backend.dto.FournisseurBillingSummaryResponse;
import com.cabinetplus.backend.dto.CountTotalResponseDTO;
import com.cabinetplus.backend.dto.CancellationRequest;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.FournisseurDetailsService;
import com.cabinetplus.backend.services.FournisseurService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/fournisseurs")
public class FournisseurController {

    private final FournisseurService service;
    private final FournisseurDetailsService detailsService;
    private final UserService userService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final AuditService auditService;
    private final CancellationSecurityService cancellationSecurityService;

    public FournisseurController(
            FournisseurService service,
            FournisseurDetailsService detailsService,
            UserService userService,
            PublicIdResolutionService publicIdResolutionService,
            AuditService auditService,
            CancellationSecurityService cancellationSecurityService
    ) {
        this.service = service;
        this.detailsService = detailsService;
        this.userService = userService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.auditService = auditService;
        this.cancellationSecurityService = cancellationSecurityService;
    }

    @GetMapping
    public ResponseEntity<List<FournisseurResponse>> getAll(Principal principal) {
        User user = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.SUPPLIER_READ, "SUPPLIER", null, "Fournisseurs consultés");
        return ResponseEntity.ok(service.findAllByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @GetMapping("/archived")
    public ResponseEntity<List<FournisseurResponse>> getArchived(Principal principal) {
        User user = getCurrentUser(principal);
        auditService.logSuccess(AuditEventType.SUPPLIER_READ, "SUPPLIER", null, "Fournisseurs archivés consultés");
        return ResponseEntity.ok(service.findArchivedByUser(user).stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<FournisseurResponse>> getAllPaged(
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
            default -> "name";
        };

        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, sortProperty)
        );

        var fournisseursPage = service.searchByUser(user, q, pageable);
        var items = fournisseursPage.getContent().stream().map(this::mapToResponse).toList();

        auditService.logSuccess(AuditEventType.SUPPLIER_READ, "SUPPLIER", null, "Fournisseurs consultÃ©s (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                fournisseursPage.getNumber(),
                fournisseursPage.getSize(),
                fournisseursPage.getTotalElements(),
                fournisseursPage.getTotalPages()
        ));
    }

    @GetMapping("/archived/paged")
    public ResponseEntity<PageResponse<FournisseurResponse>> getArchivedPaged(
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
            default -> "name";
        };

        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, sortProperty)
        );

        var fournisseursPage = service.searchArchivedByUser(user, q, pageable);
        var items = fournisseursPage.getContent().stream().map(this::mapToResponse).toList();

        auditService.logSuccess(AuditEventType.SUPPLIER_READ, "SUPPLIER", null, "Fournisseurs archivés consultés (page)");
        return ResponseEntity.ok(new PageResponse<>(
                items,
                fournisseursPage.getNumber(),
                fournisseursPage.getSize(),
                fournisseursPage.getTotalElements(),
                fournisseursPage.getTotalPages()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FournisseurResponse> getOne(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);
        auditService.logSuccess(
                AuditEventType.SUPPLIER_READ,
                "SUPPLIER",
                String.valueOf(fournisseur.getId()),
                "Fournisseur consulté"
        );
        return ResponseEntity.ok(mapToResponse(fournisseur));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<FournisseurResponse> archive(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        service.archiveByUser(internalId, user);
        Fournisseur fournisseur = service.findByIdAndUser(internalId, user)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable"));
        auditService.logSuccess(AuditEventType.SUPPLIER_ARCHIVE, "SUPPLIER", String.valueOf(internalId), "Fournisseur archivé");
        return ResponseEntity.ok(mapToResponse(fournisseur));
    }

    @PutMapping("/{id}/unarchive")
    public ResponseEntity<FournisseurResponse> unarchive(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        service.unarchiveByUser(internalId, user);
        Fournisseur fournisseur = service.findByIdAndUser(internalId, user)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable"));
        auditService.logSuccess(AuditEventType.SUPPLIER_UPDATE, "SUPPLIER", String.valueOf(internalId), "Fournisseur désarchivé");
        return ResponseEntity.ok(mapToResponse(fournisseur));
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<FournisseurDetailsResponse> getDetails(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);

        auditService.logSuccess(
                AuditEventType.SUPPLIER_READ,
                "SUPPLIER",
                String.valueOf(fournisseur.getId()),
                "Détails fournisseur consultés"
        );

        return ResponseEntity.ok(mapToDetailsResponse(fournisseur, user));
    }

    @GetMapping("/{id}/payments/paged")
    public ResponseEntity<PageResponse<FournisseurPaymentResponse>> getPaymentsPaged(
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
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);

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
        Comparator<FournisseurPaymentResponse> comparator = switch (sortKeyNorm) {
            case "amount" -> Comparator.comparing(FournisseurPaymentResponse::amount, doubleComparator);
            case "notes" -> Comparator.comparing(p -> p.notes() != null ? p.notes().trim().toLowerCase() : "", stringComparator);
            case "paymentDate" -> Comparator.comparing(FournisseurPaymentResponse::paymentDate, dateComparator);
            default -> Comparator.comparing(FournisseurPaymentResponse::paymentDate, dateComparator);
        };
        comparator = comparator.thenComparing(FournisseurPaymentResponse::id, Comparator.nullsLast(Comparator.naturalOrder()));

        List<FournisseurPaymentResponse> all = detailsService.getPaymentsForFournisseur(fournisseur, user).stream()
                .map(payment -> new FournisseurPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt()
                ))
                .toList();

        List<FournisseurPaymentResponse> filtered = (all == null ? List.<FournisseurPaymentResponse>of() : all).stream()
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
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);

        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);

        List<FournisseurPaymentResponse> all = detailsService.getPaymentsForFournisseur(fournisseur, user).stream()
                .map(payment -> new FournisseurPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt()
                ))
                .toList();

        List<FournisseurPaymentResponse> filtered = (all == null ? List.<FournisseurPaymentResponse>of() : all).stream()
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
    public ResponseEntity<PageResponse<FournisseurBillingEntryResponse>> getBillingEntriesPaged(
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
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);

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
        Comparator<FournisseurBillingEntryResponse> comparator = switch (sortKeyNorm) {
            case "type" -> Comparator.comparing(e -> e.source() != null ? e.source().trim().toUpperCase() : "", stringComparator);
            case "label" -> Comparator.comparing(e -> e.label() != null ? e.label().trim().toLowerCase() : "", stringComparator);
            case "amount" -> Comparator.comparing(FournisseurBillingEntryResponse::amount, doubleComparator);
            case "billingDate" -> Comparator.comparing(FournisseurBillingEntryResponse::billingDate, dateComparator);
            default -> Comparator.comparing(FournisseurBillingEntryResponse::billingDate, dateComparator);
        };
        comparator = comparator.thenComparing(FournisseurBillingEntryResponse::referenceId, Comparator.nullsLast(Comparator.naturalOrder()));

        List<FournisseurBillingEntryResponse> all = detailsService.getBillingEntriesForFournisseur(fournisseur, user);
        List<FournisseurBillingEntryResponse> filtered = (all == null ? List.<FournisseurBillingEntryResponse>of() : all).stream()
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
        Fournisseur fournisseur = publicIdResolutionService.requireFournisseurOwnedBy(id, user);

        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);

        List<FournisseurBillingEntryResponse> all = detailsService.getBillingEntriesForFournisseur(fournisseur, user);
        List<FournisseurBillingEntryResponse> filtered = (all == null ? List.<FournisseurBillingEntryResponse>of() : all).stream()
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

    @PostMapping("/{id}/payments")
    public ResponseEntity<FournisseurDetailsResponse> addPayment(@PathVariable String id,
                                                                 @Valid @RequestBody FournisseurPaymentRequest dto,
                                                                 Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        detailsService.addPayment(internalId, dto, user);
        auditService.logSuccess(
                AuditEventType.SUPPLIER_PAYMENT_CREATE,
                "SUPPLIER",
                String.valueOf(internalId),
                "Paiement fournisseur ajouté"
        );
        Fournisseur fournisseur = service.findByIdAndUser(internalId, user)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable"));
        return ResponseEntity.ok(mapToDetailsResponse(fournisseur, user));
    }

    @PutMapping("/{id}/payments/{paymentId}/cancel")
    public ResponseEntity<Void> cancelPayment(@PathVariable String id, @PathVariable Long paymentId, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User user = getCurrentUser(principal);
        String reason = cancellationSecurityService.requirePinAndReason(user, payload.pin(), payload.reason());
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        if (!detailsService.deletePayment(internalId, paymentId, user)) {
            throw new NotFoundException("Paiement introuvable");
        }
        auditService.logSuccess(
                AuditEventType.SUPPLIER_PAYMENT_CANCEL,
                "SUPPLIER",
                String.valueOf(internalId),
                "Paiement fournisseur annulé. Motif: " + reason
        );
        return ResponseEntity.noContent().build();
    }

    private FournisseurDetailsResponse mapToDetailsResponse(Fournisseur fournisseur, User user) {
        double totalOwed = detailsService.getTotalOwed(fournisseur, user);
        double totalPaid = detailsService.getTotalPaid(fournisseur, user);
        double remainingToPay = totalOwed - totalPaid;

        List<FournisseurPaymentResponse> payments = detailsService.getPaymentsForFournisseur(fournisseur, user).stream()
                .map(payment -> new FournisseurPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getNotes(),
                        payment.getRecordStatus(),
                        payment.getCancelledAt()
                ))
                .toList();
        List<FournisseurBillingSummaryResponse> billingHistory = detailsService.getBillingHistoryForFournisseur(fournisseur, user);
        List<FournisseurBillingEntryResponse> billingEntries = detailsService.getBillingEntriesForFournisseur(fournisseur, user);

        return new FournisseurDetailsResponse(
                fournisseur.getId(),
                fournisseur.getPublicId(),
                fournisseur.getName(),
                fournisseur.getContactPerson(),
                fournisseur.getPhoneNumber(),
                fournisseur.getAddress(),
                totalOwed,
                totalPaid,
                remainingToPay,
                payments,
                billingHistory,
                billingEntries,
                fournisseur.getRecordStatus(),
                fournisseur.getArchivedAt()
        );
    }

    @PostMapping
    public ResponseEntity<FournisseurResponse> create(@Valid @RequestBody FournisseurRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Fournisseur entity = new Fournisseur();
        entity.setName(dto.name());
        entity.setContactPerson(dto.contactPerson());
        entity.setPhoneNumber(dto.phoneNumber());
        entity.setAddress(dto.address());
        entity.setCreatedBy(user);
        Fournisseur saved = service.save(entity);
        auditService.logSuccess(
                AuditEventType.SUPPLIER_CREATE,
                "SUPPLIER",
                String.valueOf(saved.getId()),
                "Fournisseur créé"
        );
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FournisseurResponse> update(@PathVariable String id, @Valid @RequestBody FournisseurRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        Fournisseur updateData = new Fournisseur();
        updateData.setName(dto.name());
        updateData.setContactPerson(dto.contactPerson());
        updateData.setPhoneNumber(dto.phoneNumber());
        updateData.setAddress(dto.address());

        return service.update(internalId, updateData, user)
                .map(this::mapToResponse)
                .map(resp -> {
                    auditService.logSuccess(
                            AuditEventType.SUPPLIER_UPDATE,
                            "SUPPLIER",
                            String.valueOf(internalId),
                            "Fournisseur modifié"
                    );
                    return resp;
                })
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        User user = getCurrentUser(principal);
        Long internalId = publicIdResolutionService.requireFournisseurOwnedBy(id, user).getId();
        service.deleteByUser(internalId, user);
        auditService.logSuccess(
                AuditEventType.SUPPLIER_ARCHIVE,
                "SUPPLIER",
                String.valueOf(internalId),
                "Fournisseur archivé"
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

    private FournisseurResponse mapToResponse(Fournisseur f) {
        return new FournisseurResponse(
                f.getId(),
                f.getPublicId(),
                f.getName(),
                f.getContactPerson(),
                f.getPhoneNumber(),
                f.getAddress(),
                f.getRecordStatus(),
                f.getArchivedAt()
        );
    }
}
