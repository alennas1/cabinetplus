package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Material;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    List<Material> findByCreatedBy(User user);
}