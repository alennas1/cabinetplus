package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.Medication;
import com.cabinetplus.backend.models.User;

public interface MedicationRepository extends JpaRepository<Medication, Long> {
    List<Medication> findByCreatedBy(User user);
    Page<Medication> findByCreatedBy(User user, Pageable pageable);

    @Query("""
            select m
            from Medication m
            where m.createdBy = :owner
              and (
                coalesce(:q, '') = '' or
                lower(coalesce(m.name, '')) like lower(concat('%', :q, '%')) or
                lower(coalesce(m.genericName, '')) like lower(concat('%', :q, '%')) or
                lower(coalesce(m.strength, '')) like lower(concat('%', :q, '%')) or
                lower(coalesce(m.description, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Medication> searchByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    Optional<Medication> findByIdAndCreatedBy(Long id, User user);
    Optional<Medication> findByNameAndCreatedBy(String name, User user);
    Optional<Medication> findByNameAndStrength(String name, String strength);

    boolean existsByCreatedByAndNameIgnoreCaseAndStrengthIgnoreCase(User user, String name, String strength);
    boolean existsByCreatedByAndNameIgnoreCaseAndStrengthIsNull(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndStrengthIgnoreCaseAndIdNot(User user, String name, String strength, Long id);
    boolean existsByCreatedByAndNameIgnoreCaseAndStrengthIsNullAndIdNot(User user, String name, Long id);

}
