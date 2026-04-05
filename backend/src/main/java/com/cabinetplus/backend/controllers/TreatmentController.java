package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.TreatmentCreateRequest;
import com.cabinetplus.backend.dto.TreatmentToothHistoryEntry;
import com.cabinetplus.backend.dto.TreatmentUpdateRequest;
import com.cabinetplus.backend.dto.CancellationRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.TreatmentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PagedQueryUtil;
import com.cabinetplus.backend.util.PaginationUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import jakarta.validation.Valid;
import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    private final TreatmentService treatmentService;
    private final UserService userService;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final CancellationSecurityService cancellationSecurityService;

    public TreatmentController(TreatmentService treatmentService,
                               UserService userService,
                               AuditService auditService,
                               PublicIdResolutionService publicIdResolutionService,
                               CancellationSecurityService cancellationSecurityService) {
        this.treatmentService = treatmentService;
        this.userService = userService;
        this.auditService = auditService;
        this.publicIdResolutionService = publicIdResolutionService;
        this.cancellationSecurityService = cancellationSecurityService;
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    // Get all treatments for current user
    @GetMapping
    public ResponseEntity<List<Treatment>> getAllTreatments(
            @RequestParam(name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Principal principal
    ) {
        if (from == null || to == null) {
            return ResponseEntity.badRequest().build();
        }
        User currentUser = getCurrentUser(principal);
        LocalDateTime fromStart = from.atStartOfDay();
        LocalDateTime toEndExclusive = to.plusDays(1).atStartOfDay();
        List<Treatment> treatments = treatmentService.findByPractitionerInRange(currentUser, fromStart, toEndExclusive);
        auditService.logSuccess(
                AuditEventType.TREATMENT_READ,
                "TREATMENT",
                null,
                "Traitements consultes"
        );
        return ResponseEntity.ok(treatments);
    }

    // Get treatment by ID for current user
    @GetMapping("/{id}")
    public ResponseEntity<Treatment> getTreatmentById(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment treatment = treatmentService.findByIdAndPractitioner(id, currentUser)
                .orElseThrow(() -> new NotFoundException("Traitement introuvable"));
        auditService.logSuccess(
                AuditEventType.TREATMENT_READ,
                "PATIENT",
                treatment != null && treatment.getPatient() != null && treatment.getPatient().getId() != null
                        ? String.valueOf(treatment.getPatient().getId())
                        : null,
                "Traitement consulte"
        );
        return ResponseEntity.ok(treatment);
    }

    // Create treatment
    @PostMapping
    public ResponseEntity<Treatment> createTreatment(@Valid @RequestBody TreatmentCreateRequest request, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment saved = treatmentService.createTreatment(request, currentUser);
        auditService.logSuccess(
                AuditEventType.TREATMENT_CREATE,
                "PATIENT",
                saved.getPatient() != null ? String.valueOf(saved.getPatient().getId()) : null,
                "Traitement ajoute"
        );
        return ResponseEntity.ok(saved);
    }

    // Update treatment
    @PutMapping("/{id}")
    public ResponseEntity<Treatment> updateTreatment(@PathVariable Long id,
                                                     @Valid @RequestBody TreatmentUpdateRequest request,
                                                     Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment saved = treatmentService.updateTreatment(id, request, currentUser);
        boolean cancelled = saved != null && saved.getStatus() != null && "CANCELLED".equalsIgnoreCase(saved.getStatus());
        auditService.logSuccess(
                cancelled ? AuditEventType.TREATMENT_CANCEL : AuditEventType.TREATMENT_UPDATE,
                "PATIENT",
                saved.getPatient() != null ? String.valueOf(saved.getPatient().getId()) : null,
                cancelled ? "Traitement annule" : "Traitement modifie"
        );
        return ResponseEntity.ok(saved);
    }

    // Delete treatment
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Treatment> cancelTreatment(@PathVariable Long id, @Valid @RequestBody CancellationRequest payload, Principal principal) {
        User actor = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        User currentUser = userService.resolveClinicOwner(actor);
        String reason = cancellationSecurityService.requirePinAndReason(currentUser, payload.pin(), payload.reason());
        Treatment cancelled = treatmentService.cancelTreatment(id, currentUser, actor, reason);

        String acte = cancelled.getTreatmentCatalog() != null ? cancelled.getTreatmentCatalog().getName() : null;
        auditService.logSuccess(
                AuditEventType.TREATMENT_CANCEL,
                "PATIENT",
                cancelled.getPatient() != null ? String.valueOf(cancelled.getPatient().getId()) : null,
                (acte != null && !acte.isBlank() ? ("Traitement annulé : " + acte) : "Traitement annulé") + ". Motif: " + reason
        );

        return ResponseEntity.ok(cancelled);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTreatment(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment existing = treatmentService.findByIdAndPractitioner(id, currentUser)
                .orElseThrow(() -> new NotFoundException("Traitement introuvable"));

        treatmentService.cancelTreatment(id, currentUser);

        auditService.logSuccess(
                AuditEventType.TREATMENT_CANCEL,
                "PATIENT",
                existing.getPatient() != null ? String.valueOf(existing.getPatient().getId()) : null,
                "Traitement annule"
        );
        return ResponseEntity.noContent().build();
    }

    // Get treatments by patient scoped to current user
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Treatment>> getTreatmentsByPatient(@PathVariable String patientId,
                                                                  Principal principal) {
        User currentUser = getCurrentUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, currentUser).getId();
        auditService.logSuccess(
                AuditEventType.TREATMENT_READ,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Traitements patient consultes"
        );
        Patient patient = new Patient();
        patient.setId(internalPatientId);
        List<Treatment> treatments = treatmentService.findByPatientAndPractitioner(patient, currentUser);
        return ResponseEntity.ok(treatments);
    }

    @GetMapping("/patient/{patientId}/paged")
    public ResponseEntity<PageResponse<Treatment>> getTreatmentsByPatientPaged(
            @PathVariable String patientId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "field", required = false) String field,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "sortKey", required = false) String sortKey,
            @RequestParam(name = "sortDirection", required = false) String sortDirection,
            Principal principal
    ) {
        User currentUser = getCurrentUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, currentUser).getId();

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        final String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        final String fieldKey = switch (fieldNorm) {
            case "notes" -> "notes";
            case "name" -> "name";
            default -> "";
        };
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        String statusNorm = status != null ? status.trim().toUpperCase() : "";

        String qNorm = q != null ? q.trim() : "";
        boolean hasQuery = !qNorm.isBlank();

        if (!"teeth".equals(sortKeyNorm)) {
            boolean fromEnabled = from != null;
            boolean toEnabled = to != null;
            LocalDateTime fromDateTime = fromEnabled ? from.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
            LocalDateTime toDateTimeExclusive = toEnabled ? to.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

            String qLike = hasQuery ? ("%" + qNorm.toLowerCase() + "%") : "";

            Sort.Direction direction = desc ? Sort.Direction.DESC : Sort.Direction.ASC;
            Sort sort = switch (sortKeyNorm) {
                case "name" -> Sort.by(direction, "treatmentCatalog.name");
                case "date" -> Sort.by(direction, "date");
                case "price" -> Sort.by(direction, "price");
                case "status" -> Sort.by(direction, "status");
                case "notes" -> Sort.by(direction, "notes");
                case "updatedat", "updated_at" -> Sort.by(direction, "updatedAt");
                default -> Sort.by(Sort.Direction.DESC, "date");
            };
            sort = sort.and(Sort.by(Sort.Direction.ASC, "id"));

            PageRequest pageable = PageRequest.of(safePage, safeSize, sort);
            var paged = treatmentService.searchPatientTreatmentsByCatalogName(
                    internalPatientId,
                    currentUser,
                    statusNorm,
                    fromEnabled,
                    fromDateTime,
                    toEnabled,
                    toDateTimeExclusive,
                    qLike,
                    fieldKey,
                    pageable
            );

            return ResponseEntity.ok(PaginationUtil.toPageResponse(paged));
        }

        boolean fromEnabled = from != null;
        boolean toEnabled = to != null;
        LocalDateTime fromDateTime = fromEnabled ? from.atStartOfDay() : LocalDate.of(1900, 1, 1).atStartOfDay();
        LocalDateTime toDateTimeExclusive = toEnabled ? to.plusDays(1).atStartOfDay() : LocalDate.of(3000, 1, 1).atStartOfDay();

        String qLike = hasQuery ? ("%" + qNorm.toLowerCase() + "%") : "";
        PageRequest pageable = PageRequest.of(safePage, safeSize);

        var paged = treatmentService.searchPatientTreatmentsSortedByTeeth(
                internalPatientId,
                currentUser,
                statusNorm,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                desc,
                pageable
        );

        return ResponseEntity.ok(PaginationUtil.toPageResponse(paged));
    }

    @GetMapping("/patient/{patientId}/teeth-history")
    public ResponseEntity<List<TreatmentToothHistoryEntry>> getPatientTeethHistory(
            @PathVariable String patientId,
            Principal principal
    ) {
        User currentUser = getCurrentUser(principal);
        Long internalPatientId = publicIdResolutionService.requirePatientOwnedBy(patientId, currentUser).getId();

        auditService.logSuccess(
                AuditEventType.TREATMENT_READ,
                "PATIENT",
                internalPatientId != null ? String.valueOf(internalPatientId) : null,
                "Historique dentaire patient consulte"
        );

        return ResponseEntity.ok(treatmentService.getToothHistoryEntriesByPatient(internalPatientId, currentUser));
    }

    private static Comparator<Treatment> buildTreatmentSortComparator(String sortKeyNorm, boolean desc) {
        Comparator<String> stringComparator = PagedQueryUtil.stringComparator(desc);
        Comparator<LocalDateTime> dateTimeComparator = PagedQueryUtil.dateTimeComparator(desc);
        Comparator<Double> doubleComparator = PagedQueryUtil.doubleComparator(desc);
        Comparator<Integer> integerComparator = PagedQueryUtil.integerComparator(desc);

        Comparator<Treatment> comparator = switch (sortKeyNorm) {
            case "name" -> Comparator.comparing(
                    t -> t != null && t.getTreatmentCatalog() != null ? t.getTreatmentCatalog().getName() : null,
                    stringComparator
            );
            case "teeth" -> Comparator.comparing(
                    t -> t != null && t.getTeeth() != null ? t.getTeeth().size() : null,
                    integerComparator
            );
            case "date" -> Comparator.comparing(t -> t != null ? t.getDate() : null, dateTimeComparator);
            case "price" -> Comparator.comparing(t -> t != null ? t.getPrice() : null, doubleComparator);
            case "notes" -> Comparator.comparing(t -> t != null ? t.getNotes() : null, stringComparator);
            case "status" -> Comparator.comparing(t -> t != null ? t.getStatus() : null, stringComparator);
            case "updatedat", "updated_at" -> Comparator.comparing(
                    t -> t != null ? t.getUpdatedAt() : null,
                    dateTimeComparator
            );
            default -> Comparator.comparing(
                    t -> t != null ? (t.getDate() != null ? t.getDate() : t.getUpdatedAt()) : null,
                    PagedQueryUtil.dateTimeComparator(true)
            );
        };

        return comparator.thenComparing(t -> t != null ? t.getId() : null, PagedQueryUtil.longComparator(false));
    }


}
