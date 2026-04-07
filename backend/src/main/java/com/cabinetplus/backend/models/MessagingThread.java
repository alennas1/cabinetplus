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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "messaging_threads",
        uniqueConstraints = @UniqueConstraint(name = "uk_messaging_threads_users", columnNames = { "user1_id", "user2_id" })
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessagingThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Column(name = "user1_last_read_at")
    private LocalDateTime user1LastReadAt;

    @Column(name = "user2_last_read_at")
    private LocalDateTime user2LastReadAt;

    private LocalDateTime firstMessageAt;
    private LocalDateTime lastMessageAt;

    private String lastMessagePreview;

    @PrePersist
    private void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = createdAt;
    }
}
