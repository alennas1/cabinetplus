package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.*;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProthesisService {
    private static final Set<String> ALLOWED_STATUSES = Set.of("PENDING", "SENT_TO_LAB", "RECEIVED", "FITTED");

    private final ProthesisRepository repository;
    private final ProthesisCatalogRepository catalogRepository;
    private final PatientRepository patientRepository;
    private final LaboratoryRepository labRepository;

    public List<Prothesis> findAllByUser(User user) {
        if (user.getRole() == UserRole.ADMIN) {
            return repository.findAll();
        }
        return repository.findByPractitioner(user);
    }

    @Transactional
    public Prothesis create(ProthesisRequest dto, User user) {
        Patient patient = requirePatientOwnedBy(dto.patientId(), user);
        ProthesisCatalog catalog = requireCatalogOwnedBy(dto.catalogId(), user);
        List<Integer> teeth = normalizeTeeth(dto.teeth());
        assertCatalogRules(catalog, teeth);

        Prothesis p = new Prothesis();
        p.setPatient(patient);
        p.setProthesisCatalog(catalog);
        p.setPractitioner(user);
        p.setTeeth(teeth);
        p.setFinalPrice(dto.finalPrice());
        p.setLabCost(dto.labCost());
        p.setCode(trimToNull(dto.code()));
        p.setNotes(trimToNull(dto.notes()));
        p.setStatus("PENDING");
        p.setDateCreated(LocalDateTime.now());

        // Keep manually edited price when provided; otherwise fall back to catalog logic.
        if (dto.finalPrice() == null) {
            p.setFinalPrice(resolveCatalogAmount(catalog.getDefaultPrice(), catalog.isFlatFee(), teeth));
        }

        // Auto-fill lab cost from catalog when not manually provided.
        if (dto.labCost() == null) {
            p.setLabCost(resolveCatalogAmount(catalog.getDefaultLabCost(), catalog.isFlatFee(), teeth));
        }

        assertUniqueCode(p.getCode(), p.getPractitioner(), null);
        assertAmounts(p.getFinalPrice(), p.getLabCost());
        return repository.save(p);
    }

    @Transactional
    public Prothesis update(Long id, ProthesisRequest dto, User user) {
        Prothesis p = requireProthesisOwnedBy(id, user);

        Patient patient = requirePatientOwnedBy(dto.patientId(), user);
        ProthesisCatalog catalog = requireCatalogOwnedBy(dto.catalogId(), user);
        List<Integer> teeth = normalizeTeeth(dto.teeth());
        assertCatalogRules(catalog, teeth);

        boolean catalogChanged = p.getProthesisCatalog() == null || !p.getProthesisCatalog().getId().equals(catalog.getId());
        boolean teethChanged = p.getTeeth() == null || !p.getTeeth().equals(teeth);

        p.setPatient(patient);
        p.setProthesisCatalog(catalog);
        p.setTeeth(teeth);
        p.setCode(trimToNull(dto.code()));
        p.setNotes(trimToNull(dto.notes()));

        if (dto.finalPrice() != null) {
            p.setFinalPrice(dto.finalPrice());
        } else {
            p.setFinalPrice(resolveCatalogAmount(catalog.getDefaultPrice(), catalog.isFlatFee(), teeth));
        }

        if (dto.labCost() != null) {
            p.setLabCost(dto.labCost());
        } else if (p.getLabCost() == null || catalogChanged || teethChanged) {
            p.setLabCost(resolveCatalogAmount(catalog.getDefaultLabCost(), catalog.isFlatFee(), teeth));
        }

        assertUniqueCode(p.getCode(), p.getPractitioner(), p.getId());
        assertAmounts(p.getFinalPrice(), p.getLabCost());
        return repository.save(p);
    }

    @Transactional
    public Prothesis assignToLab(Long id, LabAssignmentRequest dto, User user) {
        Prothesis p = requireProthesisOwnedBy(id, user);
        String currentStatus = normalizeStatus(p.getStatus());
        if (!"PENDING".equals(currentStatus)) {
            throw new BadRequestException(java.util.Map.of("status", "Envoi au laboratoire autorise uniquement depuis le statut PENDING"));
        }

        Laboratory lab = user.getRole() == UserRole.ADMIN
                ? labRepository.findById(dto.laboratoryId())
                .orElse(null)
                : labRepository.findByIdAndCreatedBy(dto.laboratoryId(), user).orElse(null);

        if (lab == null) {
            throw new BadRequestException(java.util.Map.of("laboratoryId", "Laboratoire introuvable"));
        }

        p.setLaboratory(lab);
        p.setLabCost(dto.labCost()); // Cost in DZD
        p.setStatus("SENT_TO_LAB");
        p.setSentToLabDate(LocalDateTime.now());

        assertAmounts(p.getFinalPrice(), p.getLabCost());
        return repository.save(p);
    }

    @Transactional
    public Prothesis updateStatus(Long id, String newStatus, User user) {
        Prothesis p = requireProthesisOwnedBy(id, user);

        String statusUpper = normalizeStatus(newStatus);
        if (!ALLOWED_STATUSES.contains(statusUpper)) {
            throw new BadRequestException(java.util.Map.of("status", "Statut invalide"));
        }

        String currentStatus = normalizeStatus(p.getStatus());
        if (!isAllowedStatusTransition(currentStatus, statusUpper)) {
            throw new BadRequestException(java.util.Map.of("status", "Transition de statut invalide"));
        }

        if ("SENT_TO_LAB".equals(statusUpper) && p.getLaboratory() == null) {
            throw new BadRequestException(java.util.Map.of("laboratoryId", "Laboratoire obligatoire"));
        }

        p.setStatus(statusUpper);

        if ("SENT_TO_LAB".equals(statusUpper) && p.getSentToLabDate() == null) {
            p.setSentToLabDate(LocalDateTime.now());
        }
        
        // Track specifically when the work arrived back at the cabinet
        if ("RECEIVED".equals(statusUpper)) {
            p.setActualReturnDate(LocalDateTime.now());
        }

        return repository.save(p);
    }

    public List<Prothesis> findByPractitionerAndStatus(User user, String status) {
        if (user.getRole() == UserRole.ADMIN) {
            return repository.findByStatus(status);
        }
        return repository.findByPractitionerAndStatus(user, status);
}

public List<Prothesis> findByPatientAndPractitioner(Long patientId, User user) {
    if (user.getRole() == UserRole.ADMIN) {
        return repository.findByPatientId(patientId);
    }
    return repository.findByPatientIdAndPractitioner(patientId, user);
}

    @Transactional
    public void delete(Long id, User user) {
        Prothesis p = requireProthesisOwnedBy(id, user);
        repository.delete(p);
    }

    private Double resolveCatalogAmount(Double defaultAmount, boolean isFlatFee, List<Integer> teeth) {
        double amount = defaultAmount != null ? defaultAmount : 0.0;
        if (isFlatFee) {
            return amount;
        }
        int count = (teeth != null && !teeth.isEmpty()) ? teeth.size() : 1;
        return amount * count;
    }

    private Prothesis requireProthesisOwnedBy(Long id, User user) {
        return repository.findById(id)
                .filter(item -> item.getPractitioner().equals(user) || user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new NotFoundException("Prothese introuvable"));
    }

    private Patient requirePatientOwnedBy(Long patientId, User user) {
        Patient patient = user.getRole() == UserRole.ADMIN
                ? patientRepository.findById(patientId).orElse(null)
                : patientRepository.findByIdAndCreatedBy(patientId, user).orElse(null);
        if (patient == null) {
            throw new BadRequestException(java.util.Map.of("patientId", "Patient introuvable"));
        }
        return patient;
    }

    private ProthesisCatalog requireCatalogOwnedBy(Long catalogId, User user) {
        ProthesisCatalog catalog = user.getRole() == UserRole.ADMIN
                ? catalogRepository.findById(catalogId).orElse(null)
                : catalogRepository.findByIdAndCreatedBy(catalogId, user).orElse(null);
        if (catalog == null) {
            throw new BadRequestException(java.util.Map.of("catalogId", "Element du catalogue introuvable"));
        }
        return catalog;
    }

    private void assertCatalogRules(ProthesisCatalog catalog, List<Integer> teeth) {
        if (catalog == null) {
            throw new BadRequestException(java.util.Map.of("catalogId", "Prothese obligatoire"));
        }
        List<Integer> safeTeeth = teeth != null ? teeth : List.of();
        if (!catalog.isFlatFee() && !catalog.isMultiUnit() && safeTeeth.size() > 1) {
            throw new BadRequestException(java.util.Map.of("teeth", "Pour unitaire, veuillez selectionner une seule dent"));
        }
    }

    private List<Integer> normalizeTeeth(List<Integer> teeth) {
        return teeth == null ? List.of() : new ArrayList<>(teeth);
    }

    private void assertAmounts(Double finalPrice, Double labCost) {
        if (finalPrice != null && labCost != null && finalPrice < labCost) {
            throw new BadRequestException(java.util.Map.of("finalPrice", "Le prix doit etre superieur ou egal au cout labo"));
        }
    }

    private String normalizeStatus(String status) {
        if (status == null) return "";
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }


    private void assertUniqueCode(String code, User practitioner, Long excludeProthesisId) {
        String normalized = trimToNull(code);
        if (normalized == null) return;

        boolean exists = excludeProthesisId == null
                ? repository.existsByPractitionerAndCodeIgnoreCase(practitioner, normalized)
                : repository.existsByPractitionerAndCodeIgnoreCaseAndIdNot(practitioner, normalized, excludeProthesisId);

        if (exists) {
            throw new BadRequestException(java.util.Map.of("code", "Ce code est deja utilise"));
        }
    }

    private boolean isAllowedStatusTransition(String current, String next) {
        if (current == null || current.isBlank()) current = "PENDING";
        if (current.equals(next)) return true;

        return switch (current) {
            case "PENDING" -> "SENT_TO_LAB".equals(next);
            case "SENT_TO_LAB" -> "RECEIVED".equals(next);
            case "RECEIVED" -> "FITTED".equals(next);
            case "FITTED" -> false;
            default -> false;
        };
    }
}
