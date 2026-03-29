package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.ItemDefault;
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
public interface ItemDefaultRepository extends JpaRepository<ItemDefault, Long> {

    List<ItemDefault> findByCreatedBy(User user);
    Page<ItemDefault> findByCreatedBy(User user, Pageable pageable);

    @Query("""
            select i
            from ItemDefault i
            where i.createdBy = :owner
              and (coalesce(:q, '') = '' or lower(i.name) like lower(concat('%', :q, '%')))
            """)
    Page<ItemDefault> searchByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    Optional<ItemDefault> findByIdAndCreatedBy(Long id, User user);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
}
