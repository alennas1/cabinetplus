package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LaboratoryRepository extends JpaRepository<Laboratory, Long> {
    
    // Find labs created by a specific dentist
    List<Laboratory> findByCreatedBy(User user);

    Optional<Laboratory> findByIdAndCreatedBy(Long id, User user);
    Optional<Laboratory> findByPublicIdAndCreatedBy(UUID publicId, User user);
    
    // Search for a lab by name (useful for dropdowns)
    List<Laboratory> findByNameContainingIgnoreCase(String name);
}
