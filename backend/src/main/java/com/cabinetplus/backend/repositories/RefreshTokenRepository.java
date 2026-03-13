package com.cabinetplus.backend.repositories;

import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Transactional
    @Query("DELETE FROM RefreshToken rt WHERE rt.user = :user")
    void deleteAllByUser(@Param("user") User user);

    @Query("SELECT rt FROM RefreshToken rt JOIN FETCH rt.user WHERE rt.token = :token")
Optional<RefreshToken> findByTokenWithUser(@Param("token") String token);

    @Query("""
            SELECT rt FROM RefreshToken rt
            WHERE rt.user = :user
              AND rt.revoked = false
              AND (rt.expiresAt IS NULL OR rt.expiresAt > :now)
            ORDER BY rt.lastUsedAt DESC, rt.createdAt DESC
            """)
    List<RefreshToken> findActiveSessions(@Param("user") User user, @Param("now") java.time.LocalDateTime now);

    @Query("""
            SELECT rt FROM RefreshToken rt
            WHERE rt.user = :user
              AND rt.deviceId = :deviceId
              AND rt.revoked = false
              AND (rt.expiresAt IS NULL OR rt.expiresAt > :now)
            """)
    List<RefreshToken> findActiveSessionsByDevice(
            @Param("user") User user,
            @Param("deviceId") String deviceId,
            @Param("now") LocalDateTime now
    );
}
