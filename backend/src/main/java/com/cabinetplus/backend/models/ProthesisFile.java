package com.cabinetplus.backend.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "prothesis_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProthesisFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prothesis_id", nullable = false)
    private Prothesis prothesis;

    @Column(nullable = false)
    private String filename;

    @Column(name = "relative_path", length = 1024)
    private String relativePath;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @Column(name = "path_or_url", columnDefinition = "TEXT", nullable = false)
    private String pathOrUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;
}

