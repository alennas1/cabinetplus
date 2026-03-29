package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.AllergyCatalog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.AllergyCatalogRepository;

@Service
public class AllergyCatalogService {

    private final AllergyCatalogRepository allergyCatalogRepository;

    public AllergyCatalogService(AllergyCatalogRepository allergyCatalogRepository) {
        this.allergyCatalogRepository = allergyCatalogRepository;
    }

    public List<AllergyCatalog> findAllByUser(User user) {
        return allergyCatalogRepository.findByCreatedBy(user);
    }

    public Optional<AllergyCatalog> findByIdAndUser(Long id, User user) {
        return allergyCatalogRepository.findByIdAndCreatedBy(id, user);
    }

    public AllergyCatalog save(AllergyCatalog entity) {
        if (entity == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (entity.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }
        assertUniqueName(entity.getName(), entity.getCreatedBy(), entity.getId());
        entity.setName(entity.getName() != null ? entity.getName().trim() : null);
        entity.setDescription(entity.getDescription() != null ? entity.getDescription().trim() : null);
        return allergyCatalogRepository.save(entity);
    }

    public Optional<AllergyCatalog> update(Long id, AllergyCatalog updated, User user) {
        return allergyCatalogRepository.findByIdAndCreatedBy(id, user)
                .map(existing -> {
                    assertUniqueName(updated.getName(), user, id);
                    updated.setId(id);
                    updated.setCreatedBy(user);
                    updated.setName(updated.getName() != null ? updated.getName().trim() : null);
                    updated.setDescription(updated.getDescription() != null ? updated.getDescription().trim() : null);
                    return allergyCatalogRepository.save(updated);
                });
    }

    public boolean deleteByUser(Long id, User user) {
        return allergyCatalogRepository.findByIdAndCreatedBy(id, user)
                .map(entity -> {
                    allergyCatalogRepository.delete(entity);
                    return true;
                })
                .orElse(false);
    }

    private void assertUniqueName(String name, User user, Long excludeId) {
        String normalized = name != null ? name.trim() : "";
        if (normalized.isBlank()) return;
        boolean exists = excludeId == null
                ? allergyCatalogRepository.existsByCreatedByAndNameIgnoreCase(user, normalized)
                : allergyCatalogRepository.existsByCreatedByAndNameIgnoreCaseAndIdNot(user, normalized, excludeId);
        if (exists) {
            throw new BadRequestException(java.util.Map.of("name", "Un element avec ce nom existe deja"));
        }
    }
}

