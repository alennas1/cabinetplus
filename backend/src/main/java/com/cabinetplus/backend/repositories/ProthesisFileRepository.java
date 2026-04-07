package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.ProthesisFile;
import com.cabinetplus.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProthesisFileRepository extends JpaRepository<ProthesisFile, Long> {
    List<ProthesisFile> findByProthesisIdOrderByUploadedAtDesc(Long prothesisId);

    Optional<ProthesisFile> findByIdAndProthesisId(Long id, Long prothesisId);

    long countByProthesisId(Long prothesisId);

    @Query("""
            select coalesce(sum(f.fileSizeBytes), 0)
            from ProthesisFile f
            where f.prothesis.practitioner = :owner
              and f.prothesis.recordStatus = 'ACTIVE'
              and f.fileSizeBytes is not null
            """)
    long sumFileSizeBytesByOwner(@Param("owner") User owner);
}
