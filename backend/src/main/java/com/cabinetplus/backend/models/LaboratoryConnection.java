package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.LaboratoryConnectionStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "laboratory_connections")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LaboratoryConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "dentist_id", nullable = false)
    private User dentist;

    @ManyToOne(optional = false)
    @JoinColumn(name = "laboratory_id", nullable = false)
    private Laboratory laboratory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LaboratoryConnectionStatus status = LaboratoryConnectionStatus.PENDING;

    @Column(name = "invited_at", nullable = false, updatable = false)
    private LocalDateTime invitedAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    // If the dentist previously created a private lab record, merge its data into the connected lab on acceptance.
    @ManyToOne
    @JoinColumn(name = "merge_from_laboratory_id")
    private Laboratory mergeFromLaboratory;

    @PrePersist
    private void onCreate() {
        if (invitedAt == null) {
            invitedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = LaboratoryConnectionStatus.PENDING;
        }
    }
}

