package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LaboratoryRepository extends JpaRepository<Laboratory, Long> {
    
    // Find labs created by a specific dentist
    List<Laboratory> findByCreatedBy(User user);

    java.util.Optional<Laboratory> findByIdAndCreatedBy(Long id, User user);
    
    // Search for a lab by name (useful for dropdowns)
    List<Laboratory> findByNameContainingIgnoreCase(String name);
}
