package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.models.Item;
import com.cabinetplus.backend.models.User;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    // Existing methods
    List<Item> findByCreatedBy(User user);
    Page<Item> findByCreatedBy(User user, Pageable pageable);
    Optional<Item> findByIdAndCreatedBy(Long id, User user);

    long countByCreatedByAndItemDefault_Id(User user, Long itemDefaultId);

 @Query("SELECT SUM(i.price) FROM Item i WHERE i.createdBy = :dentist AND i.createdAt BETWEEN :start AND :end")
    Optional<Double> sumPriceByDentist(@Param("dentist") User dentist,
                                       @Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end);

    List<Item> findByCreatedByAndCreatedAtBetween(User dentist, LocalDateTime start, LocalDateTime end);

    boolean existsByFournisseur_IdAndCreatedBy(Long fournisseurId, User user);

    List<Item> findByFournisseur_IdAndCreatedByOrderByCreatedAtDesc(Long fournisseurId, User user);

    @Query("""
            select i
            from Item i
            join i.itemDefault d
            left join i.fournisseur f
            where i.createdBy = :owner
              and (
                coalesce(:q, '') = '' or
                lower(coalesce(d.name, '')) like lower(concat('%', :q, '%')) or
                lower(coalesce(f.name, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Item> searchByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    @Query("SELECT SUM(i.price) FROM Item i WHERE i.createdBy = :dentist AND i.fournisseur.id = :fournisseurId")
    Optional<Double> sumPriceByFournisseur(@Param("dentist") User dentist, @Param("fournisseurId") Long fournisseurId);
}
