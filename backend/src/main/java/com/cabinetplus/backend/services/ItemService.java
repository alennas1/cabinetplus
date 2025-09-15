package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.ItemDTO;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;

    // Get all items for a specific dentist
    public List<Item> getItemsForDentist(User dentist) {
        return itemRepository.findByCreatedBy(dentist);
    }

    // Get item by id for a specific dentist
    public Optional<Item> getItemByIdForDentist(Long id, User dentist) {
        return itemRepository.findByIdAndCreatedBy(id, dentist);
    }

    // Create item and set createdBy
    public Item createItem(Item item, User dentist) {
        item.setCreatedBy(dentist);
        return itemRepository.save(item);
    }

    // Update item (only if it belongs to this dentist)
    public Item updateItem(Long id, Item updated, User dentist) {
        return itemRepository.findByIdAndCreatedBy(id, dentist)
                .map(item -> {
                    item.setItemDefault(updated.getItemDefault());
                    item.setQuantity(updated.getQuantity());
                    item.setPrice(updated.getPrice());
                    item.setExpiryDate(updated.getExpiryDate());
                    return itemRepository.save(item);
                }).orElseThrow(() -> new RuntimeException("Item not found"));
    }

    // Delete item
    public void deleteItem(Long id, User dentist) {
        itemRepository.findByIdAndCreatedBy(id, dentist)
                .ifPresent(itemRepository::delete);
    }

    // Mapper
    public ItemDTO toDTO(Item item) {
        return new ItemDTO(
                item.getId(),
                item.getItemDefault().getId(),
                item.getItemDefault().getName(),
                item.getQuantity(),
                item.getPrice(),
                item.getExpiryDate()
        );
    }
}
