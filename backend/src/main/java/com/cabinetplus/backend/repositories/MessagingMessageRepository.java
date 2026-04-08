package com.cabinetplus.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.MessagingMessage;
import com.cabinetplus.backend.models.User;

public interface MessagingMessageRepository extends JpaRepository<MessagingMessage, Long> {
    List<MessagingMessage> findByThreadIdOrderByCreatedAtAsc(Long threadId);

    MessagingMessage findFirstByThreadIdOrderByCreatedAtDescIdDesc(Long threadId);

    long countByThreadIdAndSenderNot(Long threadId, User sender);

    long countByThreadIdAndSenderNotAndCreatedAtAfter(Long threadId, User sender, LocalDateTime createdAt);
}
