package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cabinetplus.backend.dto.CreateItemDTO;
import com.cabinetplus.backend.dto.UpdateItemDTO;
import com.cabinetplus.backend.dto.ItemDTO;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.ItemDefault;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.FournisseurRepository;
import com.cabinetplus.backend.repositories.ItemDefaultRepository;
import com.cabinetplus.backend.repositories.ItemRepository;

import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final ItemDefaultRepository itemDefaultRepository; // ADD THIS
    private final FournisseurRepository fournisseurRepository;

    // Get all items for a specific dentist
    public List<Item> getItemsForDentist(User dentist) {
        return itemRepository.findByCreatedBy(dentist);
    }

    public Page<Item> searchItemsForDentist(User dentist, String q, Pageable pageable) {
        String safeQ = q != null ? q.trim() : "";
        return itemRepository.searchByCreatedBy(dentist, safeQ, pageable);
    }

    // Get item by id for a specific dentist
    public Optional<Item> getItemByIdForDentist(Long id, User dentist) {
        return itemRepository.findByIdAndCreatedBy(id, dentist);
    }

    public List<Item> getItemsByFournisseur(Long fournisseurId, User dentist) {
        if (fournisseurId == null) return List.of();
        return itemRepository.findByFournisseur_IdAndCreatedByOrderByCreatedAtDesc(fournisseurId, dentist);
    }

    public double getTotalPriceByFournisseur(Long fournisseurId, User dentist) {
        if (fournisseurId == null) return 0.0;
        return itemRepository.sumPriceByFournisseur(dentist, fournisseurId).orElse(0.0);
    }

    // Create item and set createdBy
    public Item createItem(Item item, User dentist) {
        item.setCreatedBy(dentist);
        return itemRepository.save(item);
    }

    public Item createItemFromDTO(CreateItemDTO dto, User dentist) {
        ItemDefault def = itemDefaultRepository.findByIdAndCreatedBy(dto.getItemDefaultId(), dentist)
                .orElseThrow(() -> new BadRequestException(java.util.Map.of("itemDefaultId", "Article par defaut introuvable")));

        Fournisseur fournisseur = null;
        if (dto.getFournisseurId() != null) {
            fournisseur = fournisseurRepository.findByIdAndCreatedBy(dto.getFournisseurId(), dentist)
                    .orElseThrow(() -> new BadRequestException(java.util.Map.of("fournisseurId", "Fournisseur introuvable")));
        }

        Item item = new Item();
        item.setItemDefault(def);
        item.setQuantity(dto.getQuantity());
        item.setUnitPrice(dto.getUnitPrice());
        item.calculatePrice();
        item.setExpiryDate(dto.getExpiryDate());
        item.setCreatedAt(LocalDateTime.now());
        item.setCreatedBy(dentist);
        item.setFournisseur(fournisseur);
        return itemRepository.save(item);
    }

    public Item updateItemFromDTO(Long id, UpdateItemDTO dto, User dentist) {
        return itemRepository.findByIdAndCreatedBy(id, dentist)
                .map(item -> {
                    Fournisseur fournisseur = null;
                    if (dto.getFournisseurId() != null) {
                        fournisseur = fournisseurRepository.findByIdAndCreatedBy(dto.getFournisseurId(), dentist)
                                .orElseThrow(() -> new BadRequestException(java.util.Map.of("fournisseurId", "Fournisseur introuvable")));
                    }
                    item.setQuantity(dto.getQuantity());
                    item.setUnitPrice(dto.getUnitPrice());
                    item.calculatePrice();
                    item.setExpiryDate(dto.getExpiryDate());
                    item.setFournisseur(fournisseur);
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
    item.getCreatedAt(),
    item.getFournisseur() != null ? item.getFournisseur().getId() : null,
    item.getFournisseur() != null ? item.getFournisseur().getName() : null
);

}


    
}

