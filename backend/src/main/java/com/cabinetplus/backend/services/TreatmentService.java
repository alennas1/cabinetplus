package com.cabinetplus.backend.services;

import java.util.ArrayList;
import java.util.HashSet;
import java.time.LocalDateTime;
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

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class TreatmentService {
    private final TreatmentRepository treatmentRepository;
    private final PatientRepository patientRepository;
    private final TreatmentCatalogRepository treatmentCatalogRepository;

    public TreatmentService(
            TreatmentRepository treatmentRepository,
            PatientRepository patientRepository,
            TreatmentCatalogRepository treatmentCatalogRepository
    ) {
        this.treatmentRepository = treatmentRepository;
        this.patientRepository = patientRepository;
        this.treatmentCatalogRepository = treatmentCatalogRepository;
    }

    // All treatments of a practitioner
    public List<Treatment> findByPractitioner(User practitioner) {
        return treatmentRepository.findByPractitioner(practitioner);
    }

    // Treatment by ID scoped to practitioner
    public Optional<Treatment> findByIdAndPractitioner(Long id, User practitioner) {
        return treatmentRepository.findByIdAndPractitioner(id, practitioner);
    }

    public Treatment createTreatment(TreatmentCreateRequest request, User practitioner) {
        Patient patient = patientRepository.findByIdAndCreatedBy(request.getPatientId(), practitioner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));

        TreatmentCatalog catalog = treatmentCatalogRepository.findByIdAndCreatedBy(request.getTreatmentCatalogId(), practitioner)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("treatmentCatalogId", "Element du catalogue introuvable")));

        Treatment treatment = new Treatment();
        treatment.setPractitioner(practitioner);
        treatment.setPatient(patient);
        treatment.setTreatmentCatalog(catalog);
        // Force server-side timestamp for traceability (ignore any client-provided date).
        treatment.setDate(LocalDateTime.now());
        treatment.setPrice(request.getPrice());
        treatment.setNotes(trimToNull(request.getNotes()));
        treatment.setStatus(defaultStatus(request.getStatus()));
        List<Integer> teeth = normalizeTeeth(request.getTeeth());
        treatment.setTeeth(teeth);

        assertCatalogRules(treatment);
        return treatmentRepository.save(treatment);
    }

    public Treatment updateTreatment(Long id, TreatmentUpdateRequest request, User practitioner) {
        Treatment existing = treatmentRepository.findByIdAndPractitioner(id, practitioner)
                .orElseThrow(() -> new NotFoundException("Traitement introuvable"));

        if (request.getPatientId() != null) {
            Patient patient = patientRepository.findByIdAndCreatedBy(request.getPatientId(), practitioner)
                    .orElseThrow(() -> new BadRequestException(java.util.Map.of("patientId", "Patient introuvable")));
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
                    treatmentRepository.delete(treatment);
                    return true;
                })
                .orElse(false);
    }

    // Treatments of a patient scoped to practitioner
    public List<Treatment> findByPatientAndPractitioner(Patient patient, User practitioner) {
        return treatmentRepository.findByPatientAndPractitioner(patient, practitioner);
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

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }

}
