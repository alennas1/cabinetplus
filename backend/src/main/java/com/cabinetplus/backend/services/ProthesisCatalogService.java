package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProthesisCatalogService {
    private final ProthesisCatalogRepository repository;
    private final MaterialRepository materialRepository;

    public List<ProthesisCatalog> findAllByUser(User user) { return repository.findByCreatedBy(user); }

    public ProthesisCatalog save(ProthesisCatalog catalog, Long materialId, User user) {
        if (materialId != null) {
            catalog.setMaterial(materialRepository.findById(materialId).orElse(null));
        }
        catalog.setCreatedBy(user);
        return repository.save(catalog);
    }

    public Optional<ProthesisCatalog> update(Long id, ProthesisCatalog updated, Long materialId, User user) {
        return repository.findById(id).filter(c -> c.getCreatedBy().equals(user)).map(existing -> {
            existing.setName(updated.getName());
            existing.setDefaultPrice(updated.getDefaultPrice());
            existing.setDefaultLabCost(updated.getDefaultLabCost());
            existing.setFlatFee(updated.isFlatFee());
            if (materialId != null) {
                existing.setMaterial(materialRepository.findById(materialId).orElse(null));
            }
            return repository.save(existing);
        });
    }

    public boolean deleteByUser(Long id, User user) {
        return repository.findById(id).filter(c -> c.getCreatedBy().equals(user)).map(c -> {
            repository.delete(c); return true;
        }).orElse(false);
    }
}
