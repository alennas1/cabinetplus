package com.cabinetplus.backend.services;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.ConflictException;
import com.cabinetplus.backend.models.*;
import com.cabinetplus.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProthesisCatalogService {
    private final ProthesisCatalogRepository repository;
    private final MaterialRepository materialRepository;
    private final ProthesisRepository prothesisRepository;

    public List<ProthesisCatalog> findAllByUser(User user) { return repository.findByCreatedBy(user); }

    public Page<ProthesisCatalog> searchPagedByUser(User user, String q, Pageable pageable) {
        if (user == null) {
            return Page.empty(pageable);
        }
        String safeQ = q != null ? q.trim() : "";
        return repository.searchByCreatedBy(user, safeQ, pageable);
    }

    public ProthesisCatalog save(ProthesisCatalog catalog, Long materialId, User user) {
        assertUniqueName(catalog != null ? catalog.getName() : null, user, null);
        if (materialId != null) {
            catalog.setMaterial(requireMaterialOwnedBy(materialId, user));
        }
        catalog.setCreatedBy(user);
        return repository.save(catalog);
    }

    public Optional<ProthesisCatalog> update(Long id, ProthesisCatalog updated, Long materialId, User user) {
        return repository.findByIdAndCreatedBy(id, user).map(existing -> {
            assertUniqueName(updated != null ? updated.getName() : null, user, id);
            existing.setName(updated.getName());
            existing.setDefaultPrice(updated.getDefaultPrice());
            existing.setDefaultLabCost(updated.getDefaultLabCost());
            existing.setFlatFee(updated.isFlatFee());
            existing.setMultiUnit(!updated.isFlatFee() && updated.isMultiUnit());
            if (materialId != null) {
                existing.setMaterial(requireMaterialOwnedBy(materialId, user));
            }
            return repository.save(existing);
        });
    }

    public boolean deleteByUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user).map(c -> {
            long usageCount = prothesisRepository.countByPractitionerAndProthesisCatalog_Id(user, id);
            if (usageCount > 0) {
                throw new ConflictException("Suppression impossible: ce catalogue est utilise par des protheses");
            }
            repository.delete(c); return true;
        }).orElse(false);
    }

    private Material requireMaterialOwnedBy(Long materialId, User user) {
        return materialRepository.findByIdAndCreatedBy(materialId, user)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("materialId", "Materiau introuvable")));
    }

    private void assertUniqueName(String name, User user, Long excludeId) {
        String normalized = name != null ? name.trim() : "";
        if (normalized.isBlank()) return;
        boolean exists = excludeId == null
                ? repository.existsByCreatedByAndNameIgnoreCase(user, normalized)
                : repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(user, normalized, excludeId);
        if (exists) {
            throw new BadRequestException(java.util.Map.of("name", "Un element avec ce nom existe deja"));
        }
    }
}
