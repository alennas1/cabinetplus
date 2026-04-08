package com.cabinetplus.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.AdminGroupMessage;

public interface AdminGroupMessageRepository extends JpaRepository<AdminGroupMessage, Long> {
    List<AdminGroupMessage> findTop200ByOrderByCreatedAtDescIdDesc();
}

