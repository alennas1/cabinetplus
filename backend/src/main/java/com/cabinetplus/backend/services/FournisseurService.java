package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.FournisseurPaymentRepository;
import com.cabinetplus.backend.repositories.FournisseurRepository;
import com.cabinetplus.backend.repositories.ItemRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FournisseurService {

    private final FournisseurRepository repository;
    private final ItemRepository itemRepository;
    private final FournisseurPaymentRepository fournisseurPaymentRepository;

    public List<Fournisseur> findAllByUser(User user) {
        return repository.findByCreatedByAndArchivedAtIsNullAndRecordStatus(user, RecordStatus.ACTIVE);
    }

    public List<Fournisseur> findArchivedByUser(User user) {
        return repository.findArchivedByCreatedBy(user);
    }

    public Page<Fournisseur> searchByUser(User user, String q, Pageable pageable) {
        String safeQ = q != null ? q.trim() : "";
        return repository.searchByCreatedBy(user, safeQ, pageable);
    }

    public Page<Fournisseur> searchArchivedByUser(User user, String q, Pageable pageable) {
        String safeQ = q != null ? q.trim() : "";
        return repository.searchArchivedByCreatedBy(user, safeQ, pageable);
    }

    public Optional<Fournisseur> findByIdAndUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user);
    }

    public Fournisseur save(Fournisseur fournisseur) {
        if (fournisseur == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (fournisseur.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }

        String name = fournisseur.getName() != null ? fournisseur.getName().trim() : null;
        fournisseur.setName(name);
        if (name != null && !name.isBlank()) {
            boolean exists = fournisseur.getId() == null
                    ? repository.existsByCreatedByAndNameIgnoreCase(fournisseur.getCreatedBy(), name)
                    : repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(fournisseur.getCreatedBy(), name, fournisseur.getId());
            if (exists) {
                throw new BadRequestException(java.util.Map.of("name", "Ce fournisseur existe deja"));
            }
        }
        return repository.save(fournisseur);
    }

    public Optional<Fournisseur> update(Long id, Fournisseur updated, User user) {
        return repository.findByIdAndCreatedBy(id, user)
                .map(existing -> {
                    if (existing.getArchivedAt() != null || existing.getRecordStatus() != RecordStatus.ACTIVE) {
                        throw new BadRequestException(java.util.Map.of("_", "Fournisseur archivé : lecture seule."));
                    }
                    String nextName = updated.getName() != null ? updated.getName().trim() : null;
                    if (nextName != null && !nextName.isBlank()) {
                        boolean exists = repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(user, nextName, id);
                        if (exists) {
                            throw new BadRequestException(java.util.Map.of("name", "Ce fournisseur existe deja"));
                        }
                    }
                    existing.setName(nextName);
                    existing.setContactPerson(updated.getContactPerson());
                    existing.setPhoneNumber(updated.getPhoneNumber());
                    existing.setAddress(updated.getAddress());
                    return repository.save(existing);
                });
    }

    @Transactional
    public Optional<Fournisseur> archiveByUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user)
                .map(f -> {
                    // Strict no-delete policy: deletion becomes archiving.
                    if (f.getArchivedAt() == null || f.getRecordStatus() == RecordStatus.ACTIVE) {
                        f.setRecordStatus(RecordStatus.ARCHIVED);
                        f.setArchivedAt(LocalDateTime.now());
                        repository.save(f);
                    }
                    return f;
                });
    }

    @Transactional
    public Optional<Fournisseur> unarchiveByUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user)
                .map(f -> {
                    if (f.getArchivedAt() != null || f.getRecordStatus() != RecordStatus.ACTIVE) {
                        f.setRecordStatus(RecordStatus.ACTIVE);
                        f.setArchivedAt(null);
                        repository.save(f);
                    }
                    return f;
                });
    }

    @Transactional
    public boolean deleteByUser(Long id, User user) {
        return archiveByUser(id, user).isPresent();
    }
}
