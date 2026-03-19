package com.cabinetplus.backend.services;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.ConflictException;
import com.cabinetplus.backend.models.Material;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.MaterialRepository;
import com.cabinetplus.backend.repositories.ProthesisCatalogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MaterialService {
    private final MaterialRepository repository;
    private final ProthesisCatalogRepository prothesisCatalogRepository;

    public List<Material> findAllByUser(User user) { return repository.findByCreatedBy(user); }
    
    public Material save(Material material) {
        if (material == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (material.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }

        String name = material.getName() != null ? material.getName().trim() : null;
        material.setName(name);

        if (name != null && !name.isBlank()) {
            boolean exists = material.getId() == null
                    ? repository.existsByCreatedByAndNameIgnoreCase(material.getCreatedBy(), name)
                    : repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(material.getCreatedBy(), name, material.getId());
            if (exists) {
                throw new BadRequestException(java.util.Map.of("name", "Ce materiau existe deja"));
            }
        }

        return repository.save(material);
    }
    
    public boolean deleteByUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user)
                .map(m -> {
                    long usageCount = prothesisCatalogRepository.countByCreatedByAndMaterial_Id(user, id);
                    if (usageCount > 0) {
                        throw new ConflictException("Suppression impossible: ce materiau est utilise dans le catalogue");
                    }
                    repository.delete(m);
                    return true;
                })
                .orElse(false);
    }
}
