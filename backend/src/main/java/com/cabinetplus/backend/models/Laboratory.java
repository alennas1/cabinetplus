package com.cabinetplus.backend.models;

import com.cabinetplus.backend.enums.RecordStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cabinetplus.backend.util.UuidV7;

@Entity
@Table(name = "laboratories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Laboratory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @NotBlank(message = "Le nom du laboratoire est obligatoire")
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String contactPerson;

    @Column(columnDefinition = "TEXT")
    private String phoneNumber;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    private LocalDateTime archivedAt;

    @PrePersist
    private void ensurePublicId() {
        if (publicId == null) {
            publicId = UuidV7.randomUuidV7();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

