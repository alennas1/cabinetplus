package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.DeviseRequest;
import com.cabinetplus.backend.models.Devise;
import com.cabinetplus.backend.models.DeviseItem;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.DeviseRepository;
import com.cabinetplus.backend.repositories.ProthesisCatalogRepository;
import com.cabinetplus.backend.repositories.TreatmentCatalogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeviseService {

    private final DeviseRepository deviseRepository;
    private final TreatmentCatalogRepository treatmentCatalogRepository;
    private final ProthesisCatalogRepository prothesisCatalogRepository;

    @Transactional
    public Devise save(DeviseRequest dto, User user) {
        Devise devise = new Devise();
        devise.setTitle(dto.title());
        devise.setPractitioner(user);

        List<DeviseItem> items = dto.items().stream().map(itemDto -> {
            DeviseItem item = new DeviseItem();
            item.setDevise(devise);
            item.setUnitPrice(itemDto.unitPrice());
            item.setQuantity(itemDto.quantity());

            // Handle polymorphic selection
            if (itemDto.treatmentCatalogId() != null) {
                item.setTreatmentCatalog(treatmentCatalogRepository.findById(itemDto.treatmentCatalogId())
                        .orElseThrow(() -> new RuntimeException("Traitement introuvable")));
            } else if (itemDto.prothesisCatalogId() != null) {
                item.setProthesisCatalog(prothesisCatalogRepository.findById(itemDto.prothesisCatalogId())
                        .orElseThrow(() -> new RuntimeException("Prothese introuvable")));
            }

            return item;
        }).collect(Collectors.toList());

        devise.setItems(items);
        
        // Calculate total amount (standard logic for dental quotes in DZD)
        double total = items.stream()
                .mapToDouble(i -> i.getUnitPrice() * i.getQuantity())
                .sum();
        devise.setTotalAmount(total);

        return deviseRepository.save(devise);
    }

    public List<Devise> findAllByUser(User user) {
        return deviseRepository.findByPractitioner(user);
    }

    @Transactional
    public boolean deleteByUser(Long id, User user) {
        return deviseRepository.findById(id)
                .filter(d -> d.getPractitioner().equals(user))
                .map(d -> {
                    deviseRepository.delete(d);
                    return true;
                }).orElse(false);
    }
    public java.util.Optional<Devise> findById(Long id) {
    return deviseRepository.findById(id);
}
}
