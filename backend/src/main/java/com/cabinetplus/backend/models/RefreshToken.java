package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "refresh_tokens")
@Data
@NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime lastUsedAt;
    @Column(length = 255)
    private String userAgent;
    @Column(length = 100)
    private String ipAddress;
    @Column(length = 120)
    private String location;
    private boolean revoked = false;
}
