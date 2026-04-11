package com.cabinetplus.backend.repositories;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.Notification;
import com.cabinetplus.backend.models.User;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientOrderByCreatedAtDescIdDesc(User recipient, Pageable pageable);

    long countByRecipientAndReadAtIsNull(User recipient);

    Optional<Notification> findByIdAndRecipient(Long id, User recipient);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE notifications SET data = REPLACE(data, '\"decision\":\"PENDING\"', :newDecisionString) WHERE recipient_user_id = :recipientId AND type = :type AND data LIKE :escapedEntityIdMatch", nativeQuery = true)
    void updateDecisionInData(
            @org.springframework.data.repository.query.Param("recipientId") Long recipientId,
            @org.springframework.data.repository.query.Param("type") String type,
            @org.springframework.data.repository.query.Param("escapedEntityIdMatch") String escapedEntityIdMatch,
            @org.springframework.data.repository.query.Param("newDecisionString") String newDecisionString
    );
}

