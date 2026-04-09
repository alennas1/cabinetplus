package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "support_threads")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupportThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "clinic_owner_id", nullable = false)
    private User clinicOwner;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private LocalDateTime firstMessageAt;

    @Column(columnDefinition = "TEXT")
    private String firstMessagePreview;

    private LocalDateTime lastMessageAt;

    private LocalDateTime clinicLastReadAt;
    private LocalDateTime adminLastReadAt;

    @ManyToOne
    @JoinColumn(name = "claimed_by_admin_id")
    private User claimedByAdmin;

    private LocalDateTime claimedAt;
    private LocalDateTime finishedAt;

    @Column(columnDefinition = "TEXT")
    private String lastMessagePreview;

    @PrePersist
    private void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = createdAt;
    }
}
