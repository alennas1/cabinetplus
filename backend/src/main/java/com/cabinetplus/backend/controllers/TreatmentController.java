package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.TreatmentCreateRequest;
import com.cabinetplus.backend.dto.TreatmentUpdateRequest;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.TreatmentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PagedQueryUtil;
import com.cabinetplus.backend.util.PaginationUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;

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

    public TreatmentController(TreatmentService treatmentService, UserService userService, AuditService auditService, PublicIdResolutionService publicIdResolutionService) {
        this.treatmentService = treatmentService;
        this.userService = userService;
        this.auditService = auditService;
        this.publicIdResolutionService = publicIdResolutionService;
    }

    private User getCurrentUser(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return userService.resolveClinicOwner(user);
    }

    // Get all treatments for current user
    @GetMapping
    public ResponseEntity<List<Treatment>> getAllTreatments(Principal principal) {
        User currentUser = getCurrentUser(principal);
        List<Treatment> treatments = treatmentService.findByPractitioner(currentUser);
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
    public ResponseEntity<Treatment> cancelTreatment(@PathVariable Long id, Principal principal) {
        User currentUser = getCurrentUser(principal);
        Treatment cancelled = treatmentService.cancelTreatment(id, currentUser);

        String acte = cancelled.getTreatmentCatalog() != null ? cancelled.getTreatmentCatalog().getName() : null;
        auditService.logSuccess(
                AuditEventType.TREATMENT_CANCEL,
                "PATIENT",
                cancelled.getPatient() != null ? String.valueOf(cancelled.getPatient().getId()) : null,
                acte != null && !acte.isBlank() ? ("Traitement annule : " + acte) : "Traitement annule"
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

        Patient patient = new Patient();
        patient.setId(internalPatientId);

        final String fieldNorm = field != null ? field.trim().toLowerCase() : "";
        final String fieldKey = fieldNorm.isBlank() ? "name" : fieldNorm;
        String sortKeyNorm = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        String statusNorm = status != null ? status.trim().toUpperCase() : "";

        Comparator<Treatment> comparator = buildTreatmentSortComparator(sortKeyNorm, desc);

        List<Treatment> filtered = treatmentService.findByPatientAndPractitioner(patient, currentUser).stream()
                .filter(t -> {
                    if (t == null) return false;

                    if (!statusNorm.isBlank()) {
                        String s = t.getStatus() != null ? t.getStatus().trim().toUpperCase() : "";
                        if (!s.equals(statusNorm)) return false;
                    }

                    LocalDateTime dateTime = t.getDate() != null ? t.getDate() : t.getUpdatedAt();
                    if (!PagedQueryUtil.isInDateRange(dateTime, from, to)) return false;

                    if (q != null && !q.isBlank()) {
                        String hay = switch (fieldKey) {
                            case "notes" -> t.getNotes();
                            case "name" -> t.getTreatmentCatalog() != null ? t.getTreatmentCatalog().getName() : null;
                            default -> {
                                String name = t.getTreatmentCatalog() != null ? t.getTreatmentCatalog().getName() : "";
                                String notes = t.getNotes() != null ? t.getNotes() : "";
                                yield name + " " + notes;
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
