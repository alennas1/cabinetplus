package com.cabinetplus.backend.services;

import java.util.ArrayList;
import java.util.HashSet;
import java.time.LocalDateTime;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.dto.TreatmentToothHistoryEntry;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.Treatment;
import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.dto.TreatmentCreateRequest;
import com.cabinetplus.backend.dto.TreatmentUpdateRequest;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.TreatmentCatalogRepository;
import com.cabinetplus.backend.repositories.TreatmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class TreatmentService {
    private final TreatmentRepository treatmentRepository;
    private final PatientRepository patientRepository;
    private final TreatmentCatalogRepository treatmentCatalogRepository;
    private final ReferenceCodeGeneratorService referenceCodeGeneratorService;

    public TreatmentService(
            TreatmentRepository treatmentRepository,
            PatientRepository patientRepository,
            TreatmentCatalogRepository treatmentCatalogRepository,
            ReferenceCodeGeneratorService referenceCodeGeneratorService
    ) {
        this.treatmentRepository = treatmentRepository;
        this.patientRepository = patientRepository;
        this.treatmentCatalogRepository = treatmentCatalogRepository;
        this.referenceCodeGeneratorService = referenceCodeGeneratorService;
    }

    // All treatments of a practitioner
    public List<Treatment> findByPractitioner(User practitioner) {
        return treatmentRepository.findActiveNotCancelledByPractitioner(practitioner, RecordStatus.ACTIVE);
    }

    public List<Treatment> findByPractitionerInRange(User practitioner, LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        if (practitioner == null || fromInclusive == null || toExclusive == null) {
            return List.of();
        }
        return treatmentRepository.findActiveNotCancelledByPractitionerInRange(
                practitioner,
                RecordStatus.ACTIVE,
                true,
                fromInclusive,
                true,
                toExclusive
        );
    }

    // Treatment by ID scoped to practitioner
    public Optional<Treatment> findByIdAndPractitioner(Long id, User practitioner) {
        return treatmentRepository.findByIdAndPractitioner(id, practitioner);
    }

    public Treatment createTreatment(TreatmentCreateRequest request, User practitioner) {
        Patient patient = patientRepository.findByIdAndCreatedBy(request.getPatientId(), practitioner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));
        if (patient.getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        TreatmentCatalog catalog = treatmentCatalogRepository.findByIdAndCreatedBy(request.getTreatmentCatalogId(), practitioner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("treatmentCatalogId", "Element du catalogue introuvable")));

        Treatment treatment = new Treatment();
        treatment.setPractitioner(practitioner);
        treatment.setPatient(patient);
        treatment.setTreatmentCatalog(catalog);
        // Force server-side timestamp for traceability (ignore any client-provided date).
        LocalDateTime createdAt = LocalDateTime.now();
        treatment.setDate(createdAt);
        treatment.setUpdatedAt(createdAt);
        treatment.setPrice(request.getPrice());
        treatment.setNotes(trimToNull(request.getNotes()));
        String status = defaultStatus(request.getStatus());
        // Disallow creating already-cancelled treatments.
        treatment.setStatus("CANCELLED".equalsIgnoreCase(status) ? "PLANNED" : status);
        List<Integer> teeth = normalizeTeeth(request.getTeeth());
        treatment.setTeeth(teeth);

        long count = treatmentRepository.countByPractitionerAndDateGreaterThanEqualAndDateLessThan(
                practitioner,
                referenceCodeGeneratorService.dayStart(createdAt),
                referenceCodeGeneratorService.nextDayStart(createdAt)
        );
        treatment.setCode(referenceCodeGeneratorService.generate("T", createdAt, count));

        assertCatalogRules(treatment);
        return treatmentRepository.save(treatment);
    }

    public Treatment updateTreatment(Long id, TreatmentUpdateRequest request, User practitioner) {
        Treatment existing = treatmentRepository.findByIdAndPractitioner(id, practitioner)
                .orElseThrow(() -> new NotFoundException("Traitement introuvable"));
        if (existing.getPatient() != null && existing.getPatient().getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
        }

        if (isCancelled(existing)) {
            throw new BadRequestException(java.util.Map.of("_", "Traitement annule : lecture seule."));
        }

        if (request.getStatus() != null && "CANCELLED".equalsIgnoreCase(defaultStatus(request.getStatus()))) {
            // Treat "update status to CANCELLED" as a cancel operation, and keep it idempotent.
            if (request.getPatientId() != null
                    || request.getTreatmentCatalogId() != null
                    || request.getPrice() != null
                    || request.getNotes() != null
                    || request.getTeeth() != null) {
                throw new BadRequestException(java.util.Map.of("_", "Annulation invalide : seul le champ status est autorise."));
            }
            return cancelTreatment(id, practitioner);
        }

        if (request.getPatientId() != null) {
            Patient patient = patientRepository.findByIdAndCreatedBy(request.getPatientId(), practitioner)
                    .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));
            if (patient.getArchivedAt() != null) {
                throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
            }
            existing.setPatient(patient);
        }

        if (request.getTreatmentCatalogId() != null) {
            TreatmentCatalog catalog = treatmentCatalogRepository.findByIdAndCreatedBy(request.getTreatmentCatalogId(), practitioner)
                    .orElseThrow(() -> new BadRequestException(java.util.Map.of("treatmentCatalogId", "Element du catalogue introuvable")));
            existing.setTreatmentCatalog(catalog);
        }

        if (request.getPrice() != null) {
            existing.setPrice(request.getPrice());
        }

        if (request.getNotes() != null) {
            existing.setNotes(trimToNull(request.getNotes()));
        }

        if (request.getStatus() != null) {
            existing.setStatus(defaultStatus(request.getStatus()));
        }

        if (request.getTeeth() != null) {
            List<Integer> teeth = normalizeTeeth(request.getTeeth());
            existing.setTeeth(teeth);
        }

        assertCatalogRules(existing);
        return treatmentRepository.save(existing);
    }

    // Delete scoped to practitioner
    public boolean deleteByPractitioner(Long id, User practitioner) {
        return treatmentRepository.findByIdAndPractitioner(id, practitioner)
                .map(treatment -> {
                    if (treatment.getPatient() != null && treatment.getPatient().getArchivedAt() != null) {
                        throw new BadRequestException(java.util.Map.of("_", "Patient archivé : lecture seule."));
                    }
                    cancelTreatment(treatment.getId(), practitioner);
                    return true;
                })
                .orElse(false);
    }

    public Treatment cancelTreatment(Long id, User practitioner) {
        return cancelTreatment(id, practitioner, practitioner, null);
    }

    public Treatment cancelTreatment(Long id, User practitioner, User actor, String reason) {
        Treatment treatment = treatmentRepository.findByIdAndPractitioner(id, practitioner)
                .orElseThrow(() -> new NotFoundException("Traitement introuvable"));
        if (treatment.getPatient() != null && treatment.getPatient().getArchivedAt() != null) {
            throw new BadRequestException(java.util.Map.of("_", "Patient archive : lecture seule."));
        }

        boolean changed = false;
        if (!isCancelled(treatment)) {
            treatment.setStatus("CANCELLED");
            treatment.setCancelledAt(LocalDateTime.now());
            // Keep recordStatus ACTIVE so cancelled treatments remain visible in the patient dossier.
            treatment.setRecordStatus(RecordStatus.ACTIVE);
            changed = true;
        } else if (treatment.getCancelledAt() == null) {
            treatment.setCancelledAt(LocalDateTime.now());
            changed = true;
        }

        if (actor != null && treatment.getCancelledBy() == null) {
            treatment.setCancelledBy(actor);
            changed = true;
        }

        String normalizedReason = reason != null ? reason.trim() : "";
        if (!normalizedReason.isBlank() && (treatment.getCancelReason() == null || treatment.getCancelReason().isBlank())) {
            treatment.setCancelReason(normalizedReason);
            changed = true;
        }

        return changed ? treatmentRepository.save(treatment) : treatment;
    }

    // Treatments of a patient scoped to practitioner
    public List<Treatment> findByPatientAndPractitioner(Patient patient, User practitioner) {
        return treatmentRepository.findByPatientAndPractitionerAndRecordStatus(patient, practitioner, RecordStatus.ACTIVE);
    }

    public Page<Treatment> searchPatientTreatmentsByCatalogName(
            Long patientId,
            User practitioner,
            String statusNorm,
            boolean fromEnabled,
            LocalDateTime fromDateTime,
            boolean toEnabled,
            LocalDateTime toDateTimeExclusive,
            String qLike,
            String fieldKey,
            Pageable pageable
    ) {
        if (patientId == null || practitioner == null) {
            return Page.empty(pageable);
        }
        return treatmentRepository.searchPatientTreatmentsByCatalogName(
                patientId,
                practitioner,
                RecordStatus.ACTIVE,
                statusNorm,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                pageable
        );
    }

    public Page<Treatment> searchPatientTreatmentsSortedByTeeth(
            Long patientId,
            User practitioner,
            String statusNorm,
            boolean fromEnabled,
            LocalDateTime fromDateTime,
            boolean toEnabled,
            LocalDateTime toDateTimeExclusive,
            String qLike,
            String fieldKey,
            boolean desc,
            Pageable pageable
    ) {
        if (patientId == null || practitioner == null) {
            return Page.empty(pageable);
        }
        if (desc) {
            return treatmentRepository.searchPatientTreatmentsSortByToothDesc(
                    patientId,
                    practitioner,
                    RecordStatus.ACTIVE,
                    statusNorm,
                    fromEnabled,
                    fromDateTime,
                    toEnabled,
                    toDateTimeExclusive,
                    qLike,
                    fieldKey,
                    pageable
            );
        }
        return treatmentRepository.searchPatientTreatmentsSortByToothAsc(
                patientId,
                practitioner,
                RecordStatus.ACTIVE,
                statusNorm,
                fromEnabled,
                fromDateTime,
                toEnabled,
                toDateTimeExclusive,
                qLike,
                fieldKey,
                pageable
        );
    }

    public List<TreatmentToothHistoryEntry> getToothHistoryEntriesByPatient(Long patientId, User practitioner) {
        if (patientId == null || practitioner == null) {
            return List.of();
        }

        return treatmentRepository.findToothHistoryRowsByPatientAndPractitioner(patientId, practitioner).stream()
                .map(row -> {
                    if (row == null || row.length < 3) return null;

                    Integer tooth = null;
                    if (row[0] instanceof Number n) {
                        tooth = n.intValue();
                    }

                    String name = row[1] != null ? String.valueOf(row[1]) : null;
                    LocalDateTime date = row[2] instanceof LocalDateTime dt ? dt : null;

                    if (tooth == null) return null;
                    return new TreatmentToothHistoryEntry(tooth, name, date);
                })
                .filter(e -> e != null && e.toothNumber() > 0)
                .toList();
    }

    private void assertCatalogRules(Treatment treatment) {
        TreatmentCatalog catalog = treatment.getTreatmentCatalog();
        if (catalog == null) {
            throw new BadRequestException(java.util.Map.of("treatmentCatalogId", "Traitement obligatoire"));
        }
        List<Integer> teeth = treatment.getTeeth() != null ? treatment.getTeeth() : List.of();
        boolean isFlatFee = catalog.isFlatFee();
        boolean isMultiUnit = catalog.isMultiUnit();
        if (!isFlatFee && !isMultiUnit && teeth.size() > 1) {
            throw new BadRequestException(java.util.Map.of("teeth", "Pour unitaire, veuillez selectionner une seule dent"));
        }
    }

    private List<Integer> normalizeTeeth(List<Integer> teeth) {
        if (teeth == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(teeth);
    }

    private String defaultStatus(String status) {
        if (status == null) {
            return "PLANNED";
        }
        return status.trim().toUpperCase();
    }

    private boolean isCancelled(Treatment treatment) {
        if (treatment == null) return false;
        if (treatment.getCancelledAt() != null) return true;
        String status = treatment.getStatus();
        return status != null && "CANCELLED".equalsIgnoreCase(status.trim());
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }

}
