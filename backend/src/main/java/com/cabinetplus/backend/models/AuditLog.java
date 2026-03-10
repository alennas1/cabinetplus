package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @Column(length = 64)
    private String requestId;

    private Long actorUserId;

    @Column(length = 100)
    private String actorUsername;

    @Column(length = 30)
    private String actorRole;

    @Column(nullable = false, length = 80)
    private String eventType;

    @Column(length = 80)
    private String targetType;

    @Column(length = 120)
    private String targetId;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 300)
    private String message;

    @Column(length = 10)
    private String httpMethod;

    @Column(length = 255)
    private String path;

    @Column(length = 100)
    private String ipAddress;

    @Column(length = 120)
    private String location;
}
