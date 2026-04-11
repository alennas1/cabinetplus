package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record DocumentResponseDTO(
        Long id,
        String code,
        String title,
        String filename,
        String fileType,
        Long fileSizeBytes,
        LocalDateTime uploadedAt
) {
}
