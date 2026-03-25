package com.cabinetplus.backend.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.FournisseurPaymentRepository;
import com.cabinetplus.backend.repositories.FournisseurRepository;
import com.cabinetplus.backend.repositories.ItemRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FournisseurService {

    private final FournisseurRepository repository;
    private final ItemRepository itemRepository;
    private final FournisseurPaymentRepository fournisseurPaymentRepository;

    public List<Fournisseur> findAllByUser(User user) {
        return repository.findByCreatedBy(user);
    }

    public Optional<Fournisseur> findByIdAndUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user);
    }

    public Fournisseur save(Fournisseur fournisseur) {
        if (fournisseur == null) {
            throw new BadRequestException(java.util.Map.of("_", "Corps de requete invalide"));
        }
        if (fournisseur.getCreatedBy() == null) {
            throw new BadRequestException(java.util.Map.of("createdBy", "Utilisateur invalide"));
        }

        String name = fournisseur.getName() != null ? fournisseur.getName().trim() : null;
        fournisseur.setName(name);
        if (name != null && !name.isBlank()) {
            boolean exists = fournisseur.getId() == null
                    ? repository.existsByCreatedByAndNameIgnoreCase(fournisseur.getCreatedBy(), name)
                    : repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(fournisseur.getCreatedBy(), name, fournisseur.getId());
            if (exists) {
                throw new BadRequestException(java.util.Map.of("name", "Ce fournisseur existe deja"));
            }
        }
        return repository.save(fournisseur);
    }

    public Optional<Fournisseur> update(Long id, Fournisseur updated, User user) {
        return repository.findByIdAndCreatedBy(id, user)
                .map(existing -> {
                    String nextName = updated.getName() != null ? updated.getName().trim() : null;
                    if (nextName != null && !nextName.isBlank()) {
                        boolean exists = repository.existsByCreatedByAndNameIgnoreCaseAndIdNot(user, nextName, id);
                        if (exists) {
                            throw new BadRequestException(java.util.Map.of("name", "Ce fournisseur existe deja"));
                        }
                    }
                    existing.setName(nextName);
                    existing.setContactPerson(updated.getContactPerson());
                    existing.setPhoneNumber(updated.getPhoneNumber());
                    existing.setAddress(updated.getAddress());
                    return repository.save(existing);
                });
    }

    @Transactional
    public boolean deleteByUser(Long id, User user) {
        return repository.findByIdAndCreatedBy(id, user)
                .map(f -> {
                    boolean hasItems = itemRepository.existsByFournisseur_IdAndCreatedBy(id, user);
                    long paymentCount = fournisseurPaymentRepository.countByFournisseurIdAndCreatedBy(id, user);
                    if (hasItems || paymentCount > 0) {
                        return false;
                    }
                    repository.delete(f);
                    return true;
                })
                .orElse(false);
    }
}
