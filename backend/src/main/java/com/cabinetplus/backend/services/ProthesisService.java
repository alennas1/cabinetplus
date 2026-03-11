package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.*;
import com.cabinetplus.backend.dto.*;
import com.cabinetplus.backend.enums.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProthesisService {
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
        Patient patient = patientRepository.findById(dto.patientId())
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));
        ProthesisCatalog catalog = catalogRepository.findById(dto.catalogId())
                .orElseThrow(() -> new RuntimeException("Element du catalogue introuvable"));

        Prothesis p = new Prothesis();
        p.setPatient(patient);
        p.setProthesisCatalog(catalog);
        p.setPractitioner(user);
        p.setTeeth(dto.teeth());
        p.setFinalPrice(dto.finalPrice());
        p.setLabCost(dto.labCost());
        if (dto.code() != null) {
            p.setCode(dto.code());
        }
        p.setNotes(dto.notes());
        p.setStatus("PENDING");
        p.setDateCreated(LocalDateTime.now());

        // Keep manually edited price when provided; otherwise fall back to catalog logic.
        if (dto.finalPrice() == null) {
            p.setFinalPrice(resolveCatalogAmount(catalog.getDefaultPrice(), catalog.isFlatFee(), dto.teeth()));
        }

        // Auto-fill lab cost from catalog when not manually provided.
        if (dto.labCost() == null) {
            p.setLabCost(resolveCatalogAmount(catalog.getDefaultLabCost(), catalog.isFlatFee(), dto.teeth()));
        }

        return repository.save(p);
    }

    @Transactional
    public Prothesis update(Long id, ProthesisRequest dto, User user) {
        Prothesis p = repository.findById(id)
                .filter(item -> item.getPractitioner().equals(user) || user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("Prothese introuvable ou acces refuse"));

        if (dto.catalogId() != null) {
            ProthesisCatalog catalog = catalogRepository.findById(dto.catalogId())
                    .orElseThrow(() -> new RuntimeException("Element du catalogue introuvable"));
            p.setProthesisCatalog(catalog);
        }

        if (dto.teeth() != null) {
            p.setTeeth(dto.teeth());
        }

        p.setCode(dto.code());
        p.setNotes(dto.notes());

        if (dto.finalPrice() != null) {
            p.setFinalPrice(dto.finalPrice());
        } else {
            ProthesisCatalog catalog = p.getProthesisCatalog();
            p.setFinalPrice(resolveCatalogAmount(catalog.getDefaultPrice(), catalog.isFlatFee(), p.getTeeth()));
        }

        if (dto.labCost() != null) {
            p.setLabCost(dto.labCost());
        } else if (p.getLabCost() == null || dto.catalogId() != null || dto.teeth() != null) {
            ProthesisCatalog catalog = p.getProthesisCatalog();
            p.setLabCost(resolveCatalogAmount(catalog.getDefaultLabCost(), catalog.isFlatFee(), p.getTeeth()));
        }

        return repository.save(p);
    }

    @Transactional
    public Prothesis assignToLab(Long id, LabAssignmentRequest dto, User user) {
        Prothesis p = repository.findById(id)
                .filter(item -> item.getPractitioner().equals(user) || user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("Prothese introuvable ou acces refuse"));
        
        Laboratory lab = user.getRole() == UserRole.ADMIN
                ? labRepository.findById(dto.laboratoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"))
                : labRepository.findByIdAndCreatedBy(dto.laboratoryId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratoire introuvable"));

        p.setLaboratory(lab);
        p.setLabCost(dto.labCost()); // Cost in DZD
        p.setStatus("SENT_TO_LAB");
        p.setSentToLabDate(LocalDateTime.now());
        
        return repository.save(p);
    }

    @Transactional
    public Prothesis updateStatus(Long id, String newStatus, User user) {
        Prothesis p = repository.findById(id)
                .filter(item -> item.getPractitioner().equals(user) || user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("Prothese introuvable ou acces refuse"));

        String statusUpper = newStatus.toUpperCase();
        p.setStatus(statusUpper);
        
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
        Prothesis p = repository.findById(id)
                .filter(item -> item.getPractitioner().equals(user) || user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("Prothese introuvable ou acces refuse"));
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
}
