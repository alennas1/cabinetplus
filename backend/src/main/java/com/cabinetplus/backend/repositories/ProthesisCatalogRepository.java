package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.ProthesisCatalog;
import com.cabinetplus.backend.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("""
            select pc
            from ProthesisCatalog pc
            left join pc.material m
            where pc.createdBy = :owner
              and (
                    coalesce(:q, '') = ''
                    or lower(coalesce(pc.name, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(m.name, '')) like lower(concat('%', :q, '%'))
                    or str(coalesce(pc.defaultPrice, 0)) like concat('%', :q, '%')
              )
            """)
    Page<ProthesisCatalog> searchByCreatedBy(
            @Param("owner") User owner,
            @Param("q") String q,
            Pageable pageable
    );
}
