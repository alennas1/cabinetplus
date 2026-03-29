package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.enums.RecordStatus;
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

    @Query("""
            select l
            from Laboratory l
            where l.createdBy = :owner
              and (l.archivedAt is not null or l.recordStatus <> com.cabinetplus.backend.enums.RecordStatus.ACTIVE)
            """)
    List<Laboratory> findArchivedByCreatedBy(@Param("owner") User owner);

    boolean existsByCreatedByAndNameIgnoreCase(User user, String name);
    boolean existsByCreatedByAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
    
    // Search for a lab by name (useful for dropdowns)
    List<Laboratory> findByNameContainingIgnoreCase(String name);
}
