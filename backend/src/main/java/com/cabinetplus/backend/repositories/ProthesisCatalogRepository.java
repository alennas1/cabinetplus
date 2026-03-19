package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.ProthesisCatalog;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProthesisCatalogRepository extends JpaRepository<ProthesisCatalog, Long> {
    
    // Get the full price list for a specific dentist
    List<ProthesisCatalog> findByCreatedBy(User user);

    Optional<ProthesisCatalog> findByIdAndCreatedBy(Long id, User user);

    long countByCreatedByAndMaterial_Id(User user, Long materialId);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
}
