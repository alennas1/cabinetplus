package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.*;
import com.cabinetplus.backend.util.PagedQueryUtil;
import com.cabinetplus.backend.util.PaginationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/protheses")
@RequiredArgsConstructor
public class ProtheticsController {
    private final ProthesisService service;
    private final UserService userService;
    private final AuditService auditService;
    private final ProthesisRepository prothesisRepository;
    private final PublicIdResolutionService publicIdResolutionService;
    private final CancellationSecurityService cancellationSecurityService;

    // --- MERGED GET ALL METHOD ---
    @GetMapping
    public ResponseEntity<List<ProthesisResponse>> getAll(
            @RequestParam(required = false) String status, 
            Principal principal) {
        
        User user = getClinicUser(principal);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_READ,
                "PROTHESIS",
                null,
                status != null && !status.isEmpty() ? "Protheses consultees (filtre statut)" : "Protheses consultees"
        );
        List<Prothesis> results;

        if (status != null && !status.isEmpty()) {
            // Handles: GET /api/protheses?status=SENT_TO_LAB
            results = service.findByPractitionerAndStatus(user, status.toUpperCase());
        } else {
            // Handles: GET /api/protheses
            results = service.findAllByUser(user);
        }

        return ResponseEntity.ok(results.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<ProthesisResponse> create(@Valid @RequestBody ProthesisRequest dto, Principal principal) {
        User actor = getActor(principal);
        User user = userService.resolveClinicOwner(actor);
        Prothesis created = service.create(dto, user, actor);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_CREATE,
                "PATIENT",
                created.getPatient() != null ? String.valueOf(created.getPatient().getId()) : null,
                "Prothese ajoutee"
        );
        return ResponseEntity.ok(mapToResponse(created));
    }

    @GetMapping("/paged")
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<ProthesisResponse>> getAllPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "filterBy", required = false) String filterBy,
            @RequestParam(name = "dateType", required = false) String dateType,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "direction", required = false) String direction,
            @RequestParam(name = "focusId", required = false) Long focusId,
            Principal principal
    ) {
        User user = getClinicUser(principal);
        boolean desc = direction != null && direction.trim().equalsIgnoreCase("desc");
        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);

        var paged = service.searchAllPaged(
                user,
                page,
                size,
                q,
                status,
                filterBy,
                dateType,
                fromDt,
                toDt,
                sortKey,
                desc,
                focusId
        );

        List<ProthesisResponse> items = paged.getContent().stream().map(this::mapToResponse).toList();

        return ResponseEntity.ok(new PageResponse<>(
                items,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.getTotalPages()
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProthesisResponse> update(@PathVariable Long id, @Valid @RequestBody ProthesisRequest dto, Principal principal) {
        User actor = getActor(principal);
        User user = userService.resolveClinicOwner(actor);
        Prothesis updated = service.update(id, dto, user, actor);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_UPDATE,
                "PATIENT",
                updated.getPatient() != null ? String.valueOf(updated.getPatient().getId()) : null,
                "Prothese modifiee"
        );
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @PutMapping("/{id}/assign-lab")
    public ResponseEntity<ProthesisResponse> assignLab(@PathVariable Long id, @Valid @RequestBody LabAssignmentRequest dto, Principal principal) {
        User actor = getActor(principal);
        User user = userService.resolveClinicOwner(actor);
        Prothesis updated = service.assignToLab(id, dto, user, actor);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_ASSIGN_LAB,
                "PATIENT",
                updated.getPatient() != null ? String.valueOf(updated.getPatient().getId()) : null,
                "Prothese envoyee au laboratoire"
        );
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ProthesisResponse> changeStatus(
            @PathVariable Long id, 
            @RequestParam String status, 
            Principal principal) {
        User actor = getActor(principal);
        User user = userService.resolveClinicOwner(actor);
        Prothesis updated = service.updateStatus(id, status, user, actor);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_STATUS_CHANGE,
                "PATIENT",
                updated.getPatient() != null ? String.valueOf(updated.getPatient().getId()) : null,
                "Statut prothese modifie: " + updated.getStatus()
        );
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ProthesisResponse> cancel(@PathVariable Long id, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User actor = getActor(principal);
        User user = userService.resolveClinicOwner(actor);
        String reason = cancellationSecurityService.requirePinAndReason(actor, payload.pin(), payload.reason());

        Prothesis existing = prothesisRepository.findForResponseById(id)
                .filter(p -> user.getRole() == UserRole.ADMIN
                        || (p.getPractitioner() != null && p.getPractitioner().getId() != null
                            && user.getId() != null && p.getPractitioner().getId().equals(user.getId())))
                .orElse(null);

        service.delete(id, user, actor, reason);

        Prothesis refreshed = prothesisRepository.findForResponseById(id)
                .filter(p -> user.getRole() == UserRole.ADMIN
                        || (p.getPractitioner() != null && p.getPractitioner().getId() != null
                            && user.getId() != null && p.getPractitioner().getId().equals(user.getId())))
                .orElseThrow(() -> new com.cabinetplus.backend.exceptions.NotFoundException("Prothese introuvable"));

        String acte = refreshed.getProthesisCatalog() != null ? refreshed.getProthesisCatalog().getName() : null;
        auditService.logSuccess(
                AuditEventType.PROTHESIS_CANCEL,
                "PATIENT",
                refreshed.getPatient() != null ? String.valueOf(refreshed.getPatient().getId()) : null,
                (acte != null && !acte.isBlank() ? ("Prothèse annulée : " + acte) : "Prothèse annulée") + ". Motif: " + reason
        );

        return ResponseEntity.ok(mapToResponse(refreshed));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        User user = userService.resolveClinicOwner(actor);
        Prothesis existing = prothesisRepository.findForResponseById(id)
                .filter(p -> user.getRole() == UserRole.ADMIN
                        || (p.getPractitioner() != null && p.getPractitioner().getId() != null
                            && user.getId() != null && p.getPractitioner().getId().equals(user.getId())))
                .orElse(null);
        service.delete(id, user, actor, null);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_CANCEL,
                "PATIENT",
                existing != null && existing.getPatient() != null
                        ? String.valueOf(existing.getPatient().getId())
                        : null,
                existing != null && existing.getProthesisCatalog() != null
                        ? ("Prothese annulee : " + existing.getProthesisCatalog().getName())
                        : (existing != null ? "Prothese annulee" : "Prothese annulee: #" + id)
        );
        return ResponseEntity.noContent().build();
    }

    private User getActor(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private User getClinicUser(Principal principal) {
        return userService.resolveClinicOwner(getActor(principal));
    }

  private ProthesisResponse mapToResponse(Prothesis p) {
    String patientFullName = p.getPatient().getFirstname() + " " + p.getPatient().getLastname();
    String safeStatus = p.getRecordStatus() == com.cabinetplus.backend.enums.RecordStatus.CANCELLED ? "CANCELLED" : p.getStatus();
    // Avoid leaking Hibernate collections into the DTO (open-in-view=false) and ensure eager serialization.
    java.util.List<Integer> safeTeeth = p.getTeeth() != null ? new java.util.ArrayList<>(p.getTeeth()) : java.util.List.of();

    String createdByName = null;
    if (p.getPractitioner() != null) {
        String first = p.getPractitioner().getFirstname() != null ? p.getPractitioner().getFirstname().trim() : "";
        String last = p.getPractitioner().getLastname() != null ? p.getPractitioner().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        createdByName = combined.isBlank() ? null : combined;
    }

    String cancelledByName = null;
    if (p.getCancelledBy() != null) {
        String first = p.getCancelledBy().getFirstname() != null ? p.getCancelledBy().getFirstname().trim() : "";
        String last = p.getCancelledBy().getLastname() != null ? p.getCancelledBy().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        cancelledByName = combined.isBlank() ? null : combined;
    }

    String updatedByName = null;
    if (p.getUpdatedBy() != null) {
        String first = p.getUpdatedBy().getFirstname() != null ? p.getUpdatedBy().getFirstname().trim() : "";
        String last = p.getUpdatedBy().getLastname() != null ? p.getUpdatedBy().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        updatedByName = combined.isBlank() ? null : combined;
    }

    String sentToLabByName = null;
    if (p.getSentToLabBy() != null) {
        String first = p.getSentToLabBy().getFirstname() != null ? p.getSentToLabBy().getFirstname().trim() : "";
        String last = p.getSentToLabBy().getLastname() != null ? p.getSentToLabBy().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        sentToLabByName = combined.isBlank() ? null : combined;
    }

    String receivedByName = null;
    if (p.getReceivedBy() != null) {
        String first = p.getReceivedBy().getFirstname() != null ? p.getReceivedBy().getFirstname().trim() : "";
        String last = p.getReceivedBy().getLastname() != null ? p.getReceivedBy().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        receivedByName = combined.isBlank() ? null : combined;
    }

    String posedByName = null;
    if (p.getPosedBy() != null) {
        String first = p.getPosedBy().getFirstname() != null ? p.getPosedBy().getFirstname().trim() : "";
        String last = p.getPosedBy().getLastname() != null ? p.getPosedBy().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        posedByName = combined.isBlank() ? null : combined;
    }

    String cancelRequestedByName = null;
    if (p.getCancelRequestedBy() != null) {
        String first = p.getCancelRequestedBy().getFirstname() != null ? p.getCancelRequestedBy().getFirstname().trim() : "";
        String last = p.getCancelRequestedBy().getLastname() != null ? p.getCancelRequestedBy().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        cancelRequestedByName = combined.isBlank() ? null : combined;
    }

    String cancelRequestDecidedByName = null;
    if (p.getCancelRequestDecidedBy() != null) {
        String first = p.getCancelRequestDecidedBy().getFirstname() != null ? p.getCancelRequestDecidedBy().getFirstname().trim() : "";
        String last = p.getCancelRequestDecidedBy().getLastname() != null ? p.getCancelRequestDecidedBy().getLastname().trim() : "";
        String combined = (first + " " + last).trim();
        cancelRequestDecidedByName = combined.isBlank() ? null : combined;
    }
      
    return new ProthesisResponse(
        p.getId(),
        p.getProthesisCatalog().getId(),
        p.getPatient().getId(),
        patientFullName,
        p.getProthesisCatalog().getName(),
        (p.getProthesisCatalog().getMaterial() != null) ? p.getProthesisCatalog().getMaterial().getName() : "N/A",
        safeTeeth,
        p.getFinalPrice(),
        p.getLabCost(),
        p.getCode(),
        p.getNotes(),
        safeStatus,
        p.getLaboratory() != null ? p.getLaboratory().getName() : "Not Sent",
        p.getDateCreated(),
        p.getSentToLabDate(),
        sentToLabByName,
        p.getActualReturnDate(),
        receivedByName,
        p.getPosedAt(),
        posedByName,
        createdByName,
        p.getUpdatedAt(),
        updatedByName,
        p.getCancelledAt(),
        cancelledByName,
        p.getCancelReason(),
        p.getCancelRequestedAt(),
        cancelRequestedByName,
        p.getCancelRequestReason(),
        p.getCancelRequestDecision() != null ? p.getCancelRequestDecision().name() : null,
        p.getCancelRequestDecidedAt(),
        cancelRequestDecidedByName
    );
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

@GetMapping("/patient/{patientId}")
public ResponseEntity<List<ProthesisResponse>> getByPatient(
        @PathVariable String patientId,
        Principal principal) {
    
    User user = getClinicUser(principal);
    Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, user).getId();
    auditService.logSuccess(
            AuditEventType.PROTHESIS_READ,
            "PATIENT",
            internalPatientId != null ? String.valueOf(internalPatientId) : null,
            "Protheses patient consultees"
    );
    // Include cancelled protheses in the patient dossier (read-only history).
    List<Prothesis> results = service.findByPatientAndPractitionerIncludingCancelled(internalPatientId, user);

    return ResponseEntity.ok(results.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList()));
}

    @GetMapping("/patient/{patientId}/paged")
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<ProthesisResponse>> getByPatientPaged(
            @PathVariable String patientId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "field", required = false) String field,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "from", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal
    ) {
        User user = getClinicUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, user).getId();

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        final String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        final String fieldKeyRaw = fieldNorm.isBlank() ? "prothesisname" : fieldNorm;
        final String fieldKey = switch (fieldKeyRaw) {
            case "materialname", "material_name", "material" -> "materialname";
            case "prothesisname", "prothesis_name", "type" -> "prothesisname";
            default -> "";
        };
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        String statusNorm = status != null ? status.trim().toUpperCase() : "";

        if (!"teeth".equals(sortKeyNorm)) {
            String qNorm = q != null ? q.trim().toLowerCase() : "";
            String qLike = qNorm.isBlank() ? "" : ("%" + qNorm + "%");

            boolean fromEnabled = from != null;
            boolean toEnabled = to != null;
            LocalDateTime fromDateTime = fromEnabled ? from.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
            LocalDateTime toDateTimeExclusive = toEnabled ? to.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

            Sort.Direction direction = desc ? Sort.Direction.DESC : Sort.Direction.ASC;
            Sort sort = switch (sortKeyNorm) {
                case "type" -> Sort.by(direction, "prothesisCatalog.name");
                case "material" -> Sort.by(direction, "prothesisCatalog.material.name");
                case "date" -> Sort.by(direction, "dateCreated");
                case "price" -> Sort.by(direction, "finalPrice");
                case "status" -> Sort.by(direction, "status");
                default -> Sort.by(Sort.Direction.DESC, "dateCreated");
            };
            sort = sort.and(Sort.by(Sort.Direction.ASC, "id"));

            PageRequest pageable = PageRequest.of(safePage, safeSize, sort);
            var dtoPage = service.searchPatientProtheses(
                            internalPatientId,
                            user,
                            statusNorm,
                            fromEnabled,
                            fromDateTime,
                            toEnabled,
                            toDateTimeExclusive,
                            qLike,
                            fieldKey,
                            pageable
                    )
                    .map(this::mapToResponse);

            return ResponseEntity.ok(PaginationUtil.toPageResponse(dtoPage));
        }

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String qLike = qNorm.isBlank() ? "" : ("%" + qNorm + "%");

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;
        LocalDateTime fromDateTime = fromEnabled ? from.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
        LocalDateTime toDateTimeExclusive = toEnabled ? to.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

        PageRequest pageable = PageRequest.of(safePage, safeSize);
        var dtoPage = service.searchPatientProthesesSortedByTeeth(
                        internalPatientId,
                        user,
                        statusNorm,
                        fromEnabled,
                        fromDateTime,
                        toEnabled,
                        toDateTimeExclusive,
                        qLike,
                        fieldKey,
                        desc,
                        pageable
                )
                .map(this::mapToResponse);

        return ResponseEntity.ok(PaginationUtil.toPageResponse(dtoPage));
    }

    private static Comparator<ProthesisResponse> buildProthesisSortComparator(String sortKeyNorm, boolean desc) {
        Comparator<String> stringComparator = PagedQueryUtil.stringComparator(desc);
        var dateTimeComparator = PagedQueryUtil.dateTimeComparator(desc);
        var doubleComparator = PagedQueryUtil.doubleComparator(desc);
        var integerComparator = PagedQueryUtil.integerComparator(desc);

        Comparator<ProthesisResponse> comparator = switch (sortKeyNorm) {
            case "type" -> Comparator.comparing(ProthesisResponse::prothesisName, stringComparator);
            case "teeth" -> Comparator.comparing(
                    p -> p != null && p.teeth() != null ? p.teeth().size() : null,
                    integerComparator
            );
            case "material" -> Comparator.comparing(ProthesisResponse::materialName, stringComparator);
            case "date" -> Comparator.comparing(ProthesisResponse::dateCreated, dateTimeComparator);
            case "price" -> Comparator.comparing(ProthesisResponse::finalPrice, doubleComparator);
            case "status" -> Comparator.comparing(ProthesisResponse::status, stringComparator);
            default -> Comparator.comparing(ProthesisResponse::dateCreated, PagedQueryUtil.dateTimeComparator(true));
        };

        return comparator.thenComparing(ProthesisResponse::id, PagedQueryUtil.longComparator(false));
    }


}

