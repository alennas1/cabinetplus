package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.DiseaseCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.DiseaseCatalogRepository;

@Service
public class DiseaseCatalogService {

    private final DiseaseCatalogRepository diseaseCatalogRepository;

    public DiseaseCatalogService(DiseaseCatalogRepository diseaseCatalogRepository) {
        this.diseaseCatalogRepository = diseaseCatalogRepository;
    }

    public List<DiseaseCatalog> findAllByUser(User user) {
        return diseaseCatalogRepository.findByCreatedBy(user);
    }

    public Optional<DiseaseCatalog> findByIdAndUser(Long id, User user) {
        return diseaseCatalogRepository.findByIdAndCreatedBy(id, user);
    }

    public DiseaseCatalog save(DiseaseCatalog entity) {
        if (entity == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (entity.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }
        assertUniqueName(entity.getName(), entity.getCreatedBy(), entity.getId());
        entity.setName(entity.getName() != null ? entity.getName().trim() : null);
        entity.setDescription(entity.getDescription() != null ? entity.getDescription().trim() : null);
        return diseaseCatalogRepository.save(entity);
    }

    public Optional<DiseaseCatalog> update(Long id, DiseaseCatalog updated, User user) {
        return diseaseCatalogRepository.findByIdAndCreatedBy(id, user)
                .map(existing -> {
                    assertUniqueName(updated.getName(), user, id);
                    updated.setId(id);
                    updated.setCreatedBy(user);
                    updated.setName(updated.getName() != null ? updated.getName().trim() : null);
                    updated.setDescription(updated.getDescription() != null ? updated.getDescription().trim() : null);
                    return diseaseCatalogRepository.save(updated);
                });
    }

    public boolean deleteByUser(Long id, User user) {
        return diseaseCatalogRepository.findByIdAndCreatedBy(id, user)
                .map(entity -> {
                    diseaseCatalogRepository.delete(entity);
                    return true;
                })
                .orElse(false);
    }

    private void assertUniqueName(String name, User user, Long excludeId) {
        String normalized = name != null ? name.trim() : "";
        if (normalized.isBlank()) return;
        boolean exists = excludeId == null
                ? diseaseCatalogRepository.existsByCreatedByAndNameIgnoreCase(user, normalized)
                : diseaseCatalogRepository.existsByCreatedByAndNameIgnoreCaseAndIdNot(user, normalized, excludeId);
        if (exists) {
            throw new BadRequestException(java.util.Map.of("name", "Un element avec ce nom existe deja"));
        }
    }
}

