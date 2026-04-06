package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.SupportMessage;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {
    List<SupportMessage> findByThreadIdOrderByCreatedAtAsc(Long threadId);

    SupportMessage findFirstByThreadIdAndSender_RoleNotOrderByCreatedAtDesc(Long threadId, UserRole role);

    long countByThreadIdAndSender_Role(Long threadId, UserRole role);

    long countByThreadIdAndSender_RoleAndCreatedAtAfter(Long threadId, UserRole role, LocalDateTime createdAt);
}
