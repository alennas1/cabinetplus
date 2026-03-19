package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.CreateItemDTO;
import com.cabinetplus.backend.dto.UpdateItemDTO;
import com.cabinetplus.backend.dto.ItemDTO;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ItemDefaultRepository;
import com.cabinetplus.backend.repositories.ItemRepository;

import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final ItemDefaultRepository itemDefaultRepository; // ADD THIS

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

    public Item createItemFromDTO(CreateItemDTO dto, User dentist) {
        ItemDefault def = itemDefaultRepository.findByIdAndCreatedBy(dto.getItemDefaultId(), dentist)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("itemDefaultId", "Article par defaut introuvable")));

        Item item = new Item();
        item.setItemDefault(def);
        item.setQuantity(dto.getQuantity());
        item.setUnitPrice(dto.getUnitPrice());
        item.calculatePrice();
        item.setExpiryDate(dto.getExpiryDate());
        item.setCreatedAt(LocalDateTime.now());
        item.setCreatedBy(dentist);
        return itemRepository.save(item);
    }

    public Item updateItemFromDTO(Long id, UpdateItemDTO dto, User dentist) {
        return itemRepository.findByIdAndCreatedBy(id, dentist)
                .map(item -> {
                    item.setQuantity(dto.getQuantity());
                    item.setUnitPrice(dto.getUnitPrice());
                    item.calculatePrice();
                    item.setExpiryDate(dto.getExpiryDate());
                    return itemRepository.save(item);
                }).orElseThrow(() -> new RuntimeException("Article introuvable"));
    }

    // Update item (only if it belongs to this dentist)
    public Item updateItem(Long id, Item updated, User dentist) {
        return itemRepository.findByIdAndCreatedBy(id, dentist)
                .map(item -> {
                    item.setQuantity(updated.getQuantity());
                    item.setUnitPrice(updated.getUnitPrice());
                    item.calculatePrice();
                    item.setExpiryDate(updated.getExpiryDate());
                    return itemRepository.save(item);
                }).orElseThrow(() -> new RuntimeException("Article introuvable"));
    }

    // Delete item
   public void deleteItem(Long id, User dentist) {
    // optional: verify the item belongs to this dentist
    Item item = getItemByIdForDentist(id, dentist)
            .orElseThrow(() -> new RuntimeException("Article introuvable"));
    itemRepository.delete(item);
}


    public ItemDTO toDTO(Item item) {
    return new ItemDTO(
    item.getId(),
    item.getItemDefault().getId(),
    item.getItemDefault().getName(),
    item.getQuantity(),
    item.getPrice(),
    item.getUnitPrice(),
    item.getExpiryDate(),
    item.getCreatedAt()  // add this
);

}


    
}

