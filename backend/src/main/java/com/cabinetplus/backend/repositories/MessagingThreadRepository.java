package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.MessagingThread;
import com.cabinetplus.backend.models.User;

public interface MessagingThreadRepository extends JpaRepository<MessagingThread, Long> {

    Optional<MessagingThread> findByUser1AndUser2(User user1, User user2);

    @Query("""
            select t
            from MessagingThread t
            where t.user1 = :user or t.user2 = :user
            order by coalesce(t.lastMessageAt, t.updatedAt) desc, t.id desc
            """)
    List<MessagingThread> findMyThreads(@Param("user") User user);
}

