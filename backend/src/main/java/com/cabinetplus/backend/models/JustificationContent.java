package com.cabinetplus.backend.models;

import com.cabinetplus.backend.enums.JustificationType;
import com.cabinetplus.backend.util.UuidV7;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "justification_contents",
       uniqueConstraints = @UniqueConstraint(columnNames = {"type", "practitioner_id"})) // Only enforce unique per enum type per practitioner
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JustificationContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @Column(nullable = false, length = 150) 
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JustificationType type = JustificationType.OTHER;

    @Column(name = "custom_type")
    private String customType;

    @ManyToOne
    @JoinColumn(name = "practitioner_id", nullable = false)
    private User practitioner;

    @PrePersist
    private void ensurePublicId() {
        if (publicId == null) {
            publicId = UuidV7.randomUuidV7();
        }
    }

    // ✅ Removed @PrePersist validation — handled in service now
}
