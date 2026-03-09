package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.ProthesisCatalog;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProthesisCatalogRepository extends JpaRepository<ProthesisCatalog, Long> {
    
    // Get the full price list for a specific dentist
    List<ProthesisCatalog> findByCreatedBy(User user);
}