package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Material;
import com.cabinetplus.backend.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    List<Material> findByCreatedBy(User user);

    Page<Material> findByCreatedBy(User user, Pageable pageable);

    Page<Material> findByCreatedByAndNameContainingIgnoreCase(User user, String name, Pageable pageable);

    Optional<Material> findByIdAndCreatedBy(Long id, User user);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
}
