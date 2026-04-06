package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LaboratoryRepository extends JpaRepository<Laboratory, Long> {
    
    // Find labs created by a specific dentist
    List<Laboratory> findByCreatedBy(User user);

    List<Laboratory> findByCreatedByAndArchivedAtIsNullAndRecordStatus(User user, RecordStatus recordStatus);

    Optional<Laboratory> findByIdAndCreatedBy(Long id, User user);
    Optional<Laboratory> findByPublicIdAndCreatedBy(UUID publicId, User user);

    Optional<Laboratory> findByPublicId(UUID publicId);

    Optional<Laboratory> findFirstByCreatedByAndArchivedAtIsNullAndRecordStatusOrderByIdAsc(User user, RecordStatus recordStatus);

    @Query("""
            select l
            from Laboratory l
            where l.createdBy = :owner
              and (l.archivedAt is not null or l.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
            """)
    List<Laboratory> findArchivedByCreatedBy(@Param("owner") User owner);

    @Query("""
            select l
            from Laboratory l
            where l.createdBy = :owner
              and l.archivedAt is null
              and l.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
              and (
                    coalesce(:q, '') = ''
                    or lower(coalesce(l.name, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.contactPerson, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.phoneNumber, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.address, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Laboratory> searchByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    @Query("""
            select l
            from Laboratory l
            where l.createdBy = :owner
              and (l.archivedAt is not null or l.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
              and (
                    coalesce(:q, '') = ''
                    or lower(coalesce(l.name, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.contactPerson, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.phoneNumber, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.address, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Laboratory> searchArchivedByCreatedBy(@Param("owner") User owner, @Param("q") String q, Pageable pageable);

    @Query("""
            select l
            from Laboratory l
            where l.archivedAt is null
              and l.recordStatus = com.cabinetplus.backend.enums.RecordStatus.ACTIVE
              and (
                   l.createdBy = :dentist
                   or exists (
                       select 1
                       from LaboratoryConnection c
                       where c.dentist = :dentist
                         and c.laboratory = l
                         and c.status = com.cabinetplus.backend.enums.LaboratoryConnectionStatus.ACCEPTED
                   )
              )
              and (
                    coalesce(:q, '') = ''
                    or lower(coalesce(l.name, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.contactPerson, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.phoneNumber, '')) like lower(concat('%', :q, '%'))
                    or lower(coalesce(l.address, '')) like lower(concat('%', :q, '%'))
              )
            """)
    Page<Laboratory> searchAccessibleByDentist(@Param("dentist") User dentist, @Param("q") String q, Pageable pageable);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
    
    // Search for a lab by name (useful for dropdowns)
    List<Laboratory> findByNameContainingIgnoreCase(String name);
}
