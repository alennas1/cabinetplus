package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cabinetplus.backend.security.EncryptionConverter;
import com.cabinetplus.backend.util.UuidV7;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patients")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String firstname;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String lastname;

    private Integer age;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String sex;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String phone;

    @Column(name = "diseases", columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String diseases;

    @Column(name = "allergies", columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String allergies;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    private LocalDateTime createdAt;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @PrePersist
    private void ensureDefaultsOnCreate() {
        if (publicId == null) {
            publicId = UuidV7.randomUuidV7();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    private void ensureDefaultsOnUpdate() {
        // Legacy rows may have null createdAt; enforce a sane value so DB CHECK constraints don't block updates.
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
