package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record ProthesisFileItemResponse(
        Long id,
        String filename,
        String relativePath,
        String fileType,
        Long fileSizeBytes,
        LocalDateTime uploadedAt
) {
}

