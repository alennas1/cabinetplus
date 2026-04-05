package com.cabinetplus.backend.repositories;

import com.cabinetplus.backend.models.JustificationContent;
import com.cabinetplus.backend.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JustificationContentRepository extends JpaRepository<JustificationContent, Long> {


        Optional<JustificationContent> findByTitleAndPractitioner(String title, User practitioner);

        Optional<JustificationContent> findByPublicIdAndPractitioner(UUID publicId, User practitioner);

    List<JustificationContent> findByPractitioner(User practitioner);

    @Query("""
            select j
            from JustificationContent j
            where j.practitioner = :practitioner
              and (
                :q is null
                or :q = ''
                or lower(coalesce(j.title, '')) like concat('%', :q, '%')
                or lower(coalesce(j.content, '')) like concat('%', :q, '%')
              )
            """)
    Page<JustificationContent> searchByPractitioner(
            @Param("practitioner") User practitioner,
            @Param("q") String q,
            Pageable pageable
    );
}
