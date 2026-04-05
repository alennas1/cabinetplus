package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Fournisseur;
import com.cabinetplus.backend.models.User;

@Repository
public interface FournisseurRepository extends JpaRepository<Fournisseur, Long> {

    List<Fournisseur> findByCreatedBy(User user);
    Page<Fournisseur> findByCreatedBy(User user, Pageable pageable);

    List<Fournisseur> findByCreatedByAndArchivedAtIsNullAndRecordStatus(User user, RecordStatus recordStatus);

    Page<Fournisseur> findByCreatedByAndArchivedAtIsNullAndRecordStatus(User user, RecordStatus recordStatus, Pageable pageable);

    @Query("""
            select f
            from Fournisseur f
            where f.createdBy = :owner
              and (f.archivedAt is not null or f.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
            """)
    List<Fournisseur> findArchivedByCreatedBy(@Param("owner") User owner);

    @Query("""
            select f
            from Fournisseur f
            where f.createdBy = :owner
              and (f.archivedAt is not null or f.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
              and (
                    coalesce(:q, '') = ''
                    or lower(coalesce(f.name, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(f.contactPerson, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(f.phoneNumber, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(f.address, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Fournisseur> searchArchivedByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    @Query("""
            select f
            from Fournisseur f
            where f.createdBy = :owner
              and f.archivedAt is null
              and f.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
              and (
                    coalesce(:q, '') = ''
                    or lower(coalesce(f.name, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(f.contactPerson, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(f.phoneNumber, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(f.address, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Fournisseur> searchByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    Optional<Fournisseur> findByIdAndCreatedBy(Long id, User user);

    Optional<Fournisseur> findByPublicIdAndCreatedBy(UUID publicId, User user);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);

    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);

    List<Fournisseur> findByNameContainingIgnoreCase(String name);
}
