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
@Table(name = "support_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupportMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "thread_id", nullable = false)
    private SupportThread thread;

    @ManyToOne(optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "attachment_path", columnDefinition = "TEXT")
    private String attachmentPath;

    @Column(name = "attachment_content_type", length = 255)
    private String attachmentContentType;

    @Column(name = "attachment_original_name", columnDefinition = "TEXT")
    private String attachmentOriginalName;

    @Column(name = "attachment_size")
    private Long attachmentSize;

    private LocalDateTime createdAt;

    @PrePersist
    private void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
