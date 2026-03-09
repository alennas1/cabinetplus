package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Material;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MaterialService {
    private final MaterialRepository repository;

    public List<Material> findAllByUser(User user) { return repository.findByCreatedBy(user); }
    
    public Material save(Material material) { return repository.save(material); }
    
    public boolean deleteByUser(Long id, User user) {
        return repository.findById(id)
                .filter(m -> m.getCreatedBy().equals(user))
                .map(m -> { repository.delete(m); return true; })
                .orElse(false);
    }
}