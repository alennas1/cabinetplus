package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.enums.SupportMessageKind;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.SupportMessage;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {
    List<SupportMessage> findByThreadIdOrderByCreatedAtAsc(Long threadId);

    SupportMessage findFirstByThreadIdAndSender_RoleNotOrderByCreatedAtDesc(Long threadId, UserRole role);

    SupportMessage findFirstByThreadIdAndKindOrderByCreatedAtDescIdDesc(Long threadId, SupportMessageKind kind);

    long countByThreadIdAndSender_RoleAndKind(Long threadId, UserRole role, SupportMessageKind kind);

    long countByThreadIdAndSender_RoleAndKindAndCreatedAtAfter(Long threadId, UserRole role, SupportMessageKind kind, LocalDateTime createdAt);

    long countByThreadIdAndSender_RoleNotAndKind(Long threadId, UserRole role, SupportMessageKind kind);

    long countByThreadIdAndSender_RoleNotAndKindAndCreatedAtAfter(Long threadId, UserRole role, SupportMessageKind kind, LocalDateTime createdAt);
}
