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
import org.springframework.http.ResponseEntity;
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

    // --- MERGED GET ALL METHOD ---
    @GetMapping
    public ResponseEntity<List<ProthesisResponse>> getAll(
            @RequestParam(required = false) String status, 
            Principal principal) {
        
        User user = getCurrentUser(principal);
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
        User user = getCurrentUser(principal);
        Prothesis created = service.create(dto, user);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_CREATE,
                "PATIENT",
                created.getPatient() != null ? String.valueOf(created.getPatient().getId()) : null,
                "Prothese ajoutee"
        );
        return ResponseEntity.ok(mapToResponse(created));
    }

    @GetMapping("/paged")
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
        User user = getCurrentUser(principal);

        String statusUpper = status != null && !status.isBlank() ? status.trim().toUpperCase() : "";
        List<Prothesis> base = statusUpper.isBlank()
                ? service.findAllByUser(user)
                : service.findByPractitionerAndStatus(user, statusUpper);

        String qNorm = q != null ? q.trim().toLowerCase() : "";
        String filterByNorm = filterBy != null ? filterBy.trim() : "";
        String dateTypeNorm = dateType != null && !dateType.isBlank() ? dateType.trim() : "dateCreated";
        LocalDateTime fromDt = parseDateStart(from);
        LocalDateTime toDt = parseDateEnd(to);

        Function<Prothesis, LocalDateTime> dateGetter = switch (dateTypeNorm) {
            case "sentToLabDate" -> Prothesis::getSentToLabDate;
            case "actualReturnDate" -> Prothesis::getActualReturnDate;
            case "dateCreated" -> Prothesis::getDateCreated;
            default -> Prothesis::getDateCreated;
        };

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

        String sortKeyNorm = sortKey != null && !sortKey.isBlank() ? sortKey.trim() : "dates";
        Comparator<Prothesis> comparator = switch (sortKeyNorm) {
            case "work" -> Comparator.comparing(p -> {
                String work = p.getProthesisCatalog() != null && p.getProthesisCatalog().getName() != null
                        ? p.getProthesisCatalog().getName().trim()
                        : "";
                String materialName = p.getProthesisCatalog() != null
                        && p.getProthesisCatalog().getMaterial() != null
                        && p.getProthesisCatalog().getMaterial().getName() != null
                        ? p.getProthesisCatalog().getMaterial().getName().trim()
                        : "";
                return (work + " " + materialName).trim().toLowerCase();
            }, stringComparator);
            case "code" -> Comparator.comparing(p -> p.getCode() != null ? p.getCode().trim().toLowerCase() : "", stringComparator);
            case "teeth" -> Comparator.comparing(p -> p.getTeeth() != null ? p.getTeeth().toString() : "", stringComparator);
            case "lab" -> Comparator.comparing(p -> p.getLaboratory() != null && p.getLaboratory().getName() != null
                    ? p.getLaboratory().getName().trim().toLowerCase()
                    : "", stringComparator);
            case "labCost" -> Comparator.comparing(Prothesis::getLabCost, doubleComparator);
            case "status" -> Comparator.comparing(p -> p.getStatus() != null ? p.getStatus().trim().toLowerCase() : "", stringComparator);
            case "dates" -> Comparator.comparing(dateGetter, dateComparator);
            default -> Comparator.comparing(dateGetter, dateComparator);
        };
        comparator = comparator.thenComparing(Prothesis::getId, Comparator.nullsLast(Comparator.naturalOrder()));

        List<Prothesis> filtered = (base == null ? List.<Prothesis>of() : base).stream()
                .filter(p -> {
                    if (qNorm.isBlank()) return true;

                    String prothesisName = p.getProthesisCatalog() != null && p.getProthesisCatalog().getName() != null
                            ? p.getProthesisCatalog().getName().trim().toLowerCase()
                            : "";
                    String materialName = p.getProthesisCatalog() != null
                            && p.getProthesisCatalog().getMaterial() != null
                            && p.getProthesisCatalog().getMaterial().getName() != null
                            ? p.getProthesisCatalog().getMaterial().getName().trim().toLowerCase()
                            : "";

                    if ("prothesisName".equalsIgnoreCase(filterByNorm)) {
                        return prothesisName.contains(qNorm);
                    }
                    if ("materialName".equalsIgnoreCase(filterByNorm)) {
                        return materialName.contains(qNorm);
                    }

                    String patientName = p.getPatient() != null
                            ? ((p.getPatient().getFirstname() != null ? p.getPatient().getFirstname() : "") + " " + (p.getPatient().getLastname() != null ? p.getPatient().getLastname() : "")).trim().toLowerCase()
                            : "";
                    String code = p.getCode() != null ? p.getCode().trim().toLowerCase() : "";
                    String lab = p.getLaboratory() != null && p.getLaboratory().getName() != null
                            ? p.getLaboratory().getName().trim().toLowerCase()
                            : "";
                    String teeth = p.getTeeth() != null ? p.getTeeth().toString().toLowerCase() : "";
                    String s = p.getStatus() != null ? p.getStatus().trim().toLowerCase() : "";
                    return patientName.contains(qNorm)
                            || prothesisName.contains(qNorm)
                            || materialName.contains(qNorm)
                            || code.contains(qNorm)
                            || lab.contains(qNorm)
                            || teeth.contains(qNorm)
                            || s.contains(qNorm);
                })
                .filter(p -> {
                    if (fromDt == null && toDt == null) return true;
                    LocalDateTime value = dateGetter.apply(p);
                    if (value == null) return false;
                    if (fromDt != null && value.isBefore(fromDt)) return false;
                    return toDt == null || !value.isAfter(toDt);
                })
                .sorted(comparator)
                .toList();

        int effectivePage = page;
        if (focusId != null && size > 0) {
            int idx = -1;
            for (int i = 0; i < filtered.size(); i++) {
                Prothesis p = filtered.get(i);
                if (p != null && p.getId() != null && p.getId().equals(focusId)) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) {
                effectivePage = idx / size;
            }
        }

        PageResponse<Prothesis> pageResponse = PaginationUtil.toPageResponse(filtered, effectivePage, size);
        List<ProthesisResponse> items = pageResponse.items().stream().map(this::mapToResponse).toList();

        return ResponseEntity.ok(new PageResponse<>(
                items,
                pageResponse.page(),
                pageResponse.size(),
                pageResponse.totalElements(),
                pageResponse.totalPages()
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProthesisResponse> update(@PathVariable Long id, @Valid @RequestBody ProthesisRequest dto, Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis updated = service.update(id, dto, user);
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
        User user = getCurrentUser(principal);
        Prothesis updated = service.assignToLab(id, dto, user);
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
        User user = getCurrentUser(principal);
        Prothesis updated = service.updateStatus(id, status, user);
        auditService.logSuccess(
                AuditEventType.PROTHESIS_STATUS_CHANGE,
                "PATIENT",
                updated.getPatient() != null ? String.valueOf(updated.getPatient().getId()) : null,
                "Statut prothese modifie: " + updated.getStatus()
        );
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ProthesisResponse> cancel(@PathVariable Long id, Principal principal) {
        User user = getCurrentUser(principal);

        Prothesis existing = prothesisRepository.findById(id)
                .filter(p -> user.getRole() == UserRole.ADMIN || (p.getPractitioner() != null && p.getPractitioner().equals(user)))
                .orElse(null);

        service.delete(id, user);

        Prothesis refreshed = prothesisRepository.findById(id)
                .filter(p -> user.getRole() == UserRole.ADMIN || (p.getPractitioner() != null && p.getPractitioner().equals(user)))
                .orElseThrow(() -> new com.cabinetplus.backend.exceptions.NotFoundException("Prothese introuvable"));

        String acte = refreshed.getProthesisCatalog() != null ? refreshed.getProthesisCatalog().getName() : null;
        auditService.logSuccess(
                AuditEventType.PROTHESIS_CANCEL,
                "PATIENT",
                refreshed.getPatient() != null ? String.valueOf(refreshed.getPatient().getId()) : null,
                acte != null && !acte.isBlank() ? ("Prothese annulee : " + acte) : "Prothese annulee"
        );

        return ResponseEntity.ok(mapToResponse(refreshed));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        User user = getCurrentUser(principal);
        Prothesis existing = prothesisRepository.findById(id)
                .filter(p -> user.getRole() == UserRole.ADMIN || (p.getPractitioner() != null && p.getPractitioner().equals(user)))
                .orElse(null);
        service.delete(id, user);
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

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

  private ProthesisResponse mapToResponse(Prothesis p) {
    String patientFullName = p.getPatient().getFirstname() + " " + p.getPatient().getLastname();
    String safeStatus = p.getRecordStatus() == com.cabinetplus.backend.enums.RecordStatus.CANCELLED ? "CANCELLED" : p.getStatus();
    
    return new ProthesisResponse(
        p.getId(),
        p.getProthesisCatalog().getId(),
        p.getPatient().getId(),
        patientFullName,
        p.getProthesisCatalog().getName(),
        (p.getProthesisCatalog().getMaterial() != null) ? p.getProthesisCatalog().getMaterial().getName() : "N/A",
        p.getTeeth(),
        p.getFinalPrice(),
        p.getLabCost(),
        p.getCode(),
        p.getNotes(),
        safeStatus,
        p.getLaboratory() != null ? p.getLaboratory().getName() : "Not Sent",
        p.getDateCreated(),
        p.getSentToLabDate(),
        p.getActualReturnDate()
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
    
    User user = getCurrentUser(principal);
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
        User user = getCurrentUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, user).getId();

        final String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        final String fieldKey = fieldNorm.isBlank() ? "prothesisname" : fieldNorm;
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        String statusNorm = status != null ? status.trim().toUpperCase() : "";

        Comparator<ProthesisResponse> comparator = buildProthesisSortComparator(sortKeyNorm, desc);

        List<ProthesisResponse> filtered = service.findByPatientAndPractitionerIncludingCancelled(internalPatientId, user).stream()
                .map(this::mapToResponse)
                .filter(p -> {
                    if (p == null) return false;

                    if (!statusNorm.isBlank()) {
                        String s = p.status() != null ? p.status().trim().toUpperCase() : "";
                        if (!s.equals(statusNorm)) return false;
                    }

                    if (!PagedQueryUtil.isInDateRange(p.dateCreated(), from, to)) return false;

                    if (q != null && !q.isBlank()) {
                        String hay = switch (fieldKey) {
                            case "materialname", "material_name", "material" -> p.materialName();
                            case "prothesisname", "prothesis_name", "type" -> p.prothesisName();
                            default -> {
                                String type = p.prothesisName() != null ? p.prothesisName() : "";
                                String material = p.materialName() != null ? p.materialName() : "";
                                yield type + " " + material;
                            }
                        };
                        if (!PagedQueryUtil.matchesSearch(hay, q)) return false;
                    }

                    return true;
                })
                .sorted(comparator)
                .toList();

        return ResponseEntity.ok(PaginationUtil.toPageResponse(filtered, page, size));
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

