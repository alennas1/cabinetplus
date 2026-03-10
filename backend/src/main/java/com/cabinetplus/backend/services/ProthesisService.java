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
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        ProthesisCatalog catalog = catalogRepository.findById(dto.catalogId())
                .orElseThrow(() -> new RuntimeException("Catalog item not found"));

        Prothesis p = new Prothesis();
        p.setPatient(patient);
        p.setProthesisCatalog(catalog);
        p.setPractitioner(user);
        p.setTeeth(dto.teeth());
        p.setFinalPrice(dto.finalPrice());
        p.setNotes(dto.notes());
        p.setStatus("PENDING");
        p.setDateCreated(LocalDateTime.now());

        // Keep manually edited price when provided; otherwise fall back to catalog logic.
        if (dto.finalPrice() == null) {
            if (catalog.isFlatFee()) {
                p.setFinalPrice(catalog.getDefaultPrice());
            } else {
                int count = (dto.teeth() != null && !dto.teeth().isEmpty()) ? dto.teeth().size() : 1;
                p.setFinalPrice(catalog.getDefaultPrice() * count);
            }
        }

        return repository.save(p);
    }

    @Transactional
    public Prothesis update(Long id, ProthesisRequest dto, User user) {
        Prothesis p = repository.findById(id)
                .filter(item -> item.getPractitioner().equals(user) || user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("Prothesis not found or access denied"));

        if (dto.catalogId() != null) {
            ProthesisCatalog catalog = catalogRepository.findById(dto.catalogId())
                    .orElseThrow(() -> new RuntimeException("Catalog item not found"));
            p.setProthesisCatalog(catalog);
        }

        if (dto.teeth() != null) {
            p.setTeeth(dto.teeth());
        }

        p.setNotes(dto.notes());

        if (dto.finalPrice() != null) {
            p.setFinalPrice(dto.finalPrice());
        } else {
            ProthesisCatalog catalog = p.getProthesisCatalog();
            if (catalog.isFlatFee()) {
                p.setFinalPrice(catalog.getDefaultPrice());
            } else {
                int count = (p.getTeeth() != null && !p.getTeeth().isEmpty()) ? p.getTeeth().size() : 1;
                p.setFinalPrice(catalog.getDefaultPrice() * count);
            }
        }

        return repository.save(p);
    }

    @Transactional
    public Prothesis assignToLab(Long id, LabAssignmentRequest dto, User user) {
        Prothesis p = repository.findById(id)
                .filter(item -> item.getPractitioner().equals(user) || user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new RuntimeException("Prothesis not found or access denied"));
        
        Laboratory lab = user.getRole() == UserRole.ADMIN
                ? labRepository.findById(dto.laboratoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratory not found"))
                : labRepository.findByIdAndCreatedBy(dto.laboratoryId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratory not found"));

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
                .orElseThrow(() -> new RuntimeException("Prothesis not found or access denied"));

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
                .orElseThrow(() -> new RuntimeException("Prothesis not found or access denied"));
        repository.delete(p);
    }
}
