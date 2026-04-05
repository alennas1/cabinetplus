package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.TreatmentCatalog;
import com.cabinetplus.backend.models.User;

public interface TreatmentCatalogRepository extends JpaRepository<TreatmentCatalog, Long> {
    List<TreatmentCatalog> findByCreatedBy(User user);
    Optional<TreatmentCatalog> findByIdAndCreatedBy(Long id, User user);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);

    @Query("""
            select t
            from TreatmentCatalog t
            where t.createdBy = :owner
              and (
                    coalesce(:q, '') = ''
                    or (:fieldKey = 'name' and lower(coalesce(t.name, '')) like lower(concat('%', :q, '%')))
                    or (:fieldKey = 'description' and lower(coalesce(t.description, '')) like lower(concat('%', :q, '%')))
                    or (:fieldKey = 'defaultprice' and str(coalesce(t.defaultPrice, 0)) like concat('%', :q, '%'))
                    or (:fieldKey = '' and (
                            lower(coalesce(t.name, '')) like lower(concat('%', :q, '%'))
                            or lower(coalesce(t.description, '')) like lower(concat('%', :q, '%'))
                            or str(coalesce(t.defaultPrice, 0)) like concat('%', :q, '%')
                    ))
              )
            """)
    Page<TreatmentCatalog> searchByCreatedBy(
            @Param("owner") User owner,
            @Param("q") String q,
            @Param("fieldKey") String fieldKey,
            Pageable pageable
    );
}
