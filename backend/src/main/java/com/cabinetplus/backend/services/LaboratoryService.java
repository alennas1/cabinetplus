package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LaboratoryService {
    private final LaboratoryRepository repository;

    public List<Laboratory> findAllByUser(User user) {
        return repository.findByCreatedBy(user);
    }

    public Optional<Laboratory> findByIdAndUser(Long id, User user) {
        return repository.findById(id).filter(l -> l.getCreatedBy().equals(user));
    }

    public Laboratory save(Laboratory lab) {
        return repository.save(lab);
    }

    public Optional<Laboratory> update(Long id, Laboratory updated, User user) {
        return repository.findById(id)
            .filter(l -> l.getCreatedBy().equals(user))
            .map(existing -> {
                existing.setName(updated.getName());
                existing.setContactPerson(updated.getContactPerson());
                existing.setPhoneNumber(updated.getPhoneNumber());
                existing.setAddress(updated.getAddress());
                return repository.save(existing);
            });
    }

    public boolean deleteByUser(Long id, User user) {
        return repository.findById(id)
            .filter(l -> l.getCreatedBy().equals(user))
            .map(l -> {
                repository.delete(l);
                return true;
            }).orElse(false);
    }
}