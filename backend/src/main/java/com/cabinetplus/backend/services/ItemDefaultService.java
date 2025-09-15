package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.ItemDefaultDTO;
import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ItemDefaultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ItemDefaultService {

    private final ItemDefaultRepository itemDefaultRepository;

    public List<ItemDefault> getDefaultsForDentist(User dentist) {
        return itemDefaultRepository.findByCreatedBy(dentist);
    }

    public Optional<ItemDefault> getDefaultByIdForDentist(Long id, User dentist) {
        return itemDefaultRepository.findByIdAndCreatedBy(id, dentist);
    }

    public ItemDefault createDefault(ItemDefault itemDefault, User dentist) {
        itemDefault.setCreatedBy(dentist);
        return itemDefaultRepository.save(itemDefault);
    }

    public ItemDefault updateDefault(Long id, ItemDefault updated, User dentist) {
        return itemDefaultRepository.findByIdAndCreatedBy(id, dentist)
                .map(def -> {
                    def.setName(updated.getName());
                    def.setCategory(updated.getCategory());
                    def.setDefaultPrice(updated.getDefaultPrice());
                    def.setDescription(updated.getDescription());
                    return itemDefaultRepository.save(def);
                }).orElseThrow(() -> new RuntimeException("ItemDefault not found"));
    }

    public void deleteDefault(Long id, User dentist) {
        itemDefaultRepository.findByIdAndCreatedBy(id, dentist)
                .ifPresent(itemDefaultRepository::delete);
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

}
