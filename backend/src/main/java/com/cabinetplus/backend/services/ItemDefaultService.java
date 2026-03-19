package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.ItemDefaultDTO;
import com.cabinetplus.backend.exceptions.ConflictException;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ItemDefaultRepository;
import com.cabinetplus.backend.repositories.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ItemDefaultService {

    private final ItemDefaultRepository itemDefaultRepository;
    private final ItemRepository itemRepository;

    public List<ItemDefault> getDefaultsForDentist(User dentist) {
        return itemDefaultRepository.findByCreatedBy(dentist);
    }

    public Optional<ItemDefault> getDefaultByIdForDentist(Long id, User dentist) {
        return itemDefaultRepository.findByIdAndCreatedBy(id, dentist);
    }

    public ItemDefault createDefault(ItemDefault itemDefault, User dentist) {
        itemDefault.setCreatedBy(dentist);
        assertUniqueName(itemDefault.getName(), dentist, null);
        return itemDefaultRepository.save(itemDefault);
    }

    public ItemDefault updateDefault(Long id, ItemDefault updated, User dentist) {
        return itemDefaultRepository.findByIdAndCreatedBy(id, dentist)
                .map(def -> {
                    assertUniqueName(updated.getName(), dentist, id);
                    def.setName(updated.getName());
                    def.setCategory(updated.getCategory());
                    def.setDefaultPrice(updated.getDefaultPrice());
                    def.setDescription(updated.getDescription());
                    return itemDefaultRepository.save(def);
                }).orElseThrow(() -> new RuntimeException("Article par defaut introuvable"));
    }

    public void deleteDefault(Long id, User dentist) {
        itemDefaultRepository.findByIdAndCreatedBy(id, dentist)
                .ifPresent(def -> {
                    long usageCount = itemRepository.countByCreatedByAndItemDefault_Id(dentist, id);
                    if (usageCount > 0) {
                        throw new ConflictException("Suppression impossible: cet article par defaut est utilise");
                    }
                    itemDefaultRepository.delete(def);
                });
    }
    
public ItemDefaultDTO toDTO(ItemDefault itemDefault) {
    return new ItemDefaultDTO(
            itemDefault.getId(),
            itemDefault.getName(),
            itemDefault.getCategory(),
            itemDefault.getDefaultPrice(),
            itemDefault.getDescription()
    );
}

    private void assertUniqueName(String name, User dentist, Long excludeId) {
        String normalized = name != null ? name.trim() : "";
        if (normalized.isBlank()) return;
        boolean exists = excludeId == null
                ? itemDefaultRepository.existsByCreatedByAndNameIgnoreCase(dentist, normalized)
                : itemDefaultRepository.existsByCreatedByAndNameIgnoreCaseAndIdNot(dentist, normalized, excludeId);
        if (exists) {
            throw new BadRequestException(java.util.Map.of("name", "Un article avec ce nom existe deja"));
        }
    }

}
