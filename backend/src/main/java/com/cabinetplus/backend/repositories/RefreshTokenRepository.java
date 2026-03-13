package com.cabinetplus.backend.repositories;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    void deleteAllByUser(User user);
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
}
