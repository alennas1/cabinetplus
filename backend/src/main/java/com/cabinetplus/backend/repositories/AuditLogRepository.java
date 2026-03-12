package com.cabinetplus.backend.repositories;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop200ByActorUserIdOrderByOccurredAtDesc(Long actorUserId);
    List<AuditLog> findTop200ByActorUserIdInOrderByOccurredAtDesc(Collection<Long> actorUserIds);
    List<AuditLog> findTop200ByActorRoleInOrderByOccurredAtDesc(Collection<String> roles);
}
