package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

public record DocumentResponseDTO(
        Long id,
        String title,
        String filename,
        String fileType,
        Long fileSizeBytes,
        LocalDateTime uploadedAt
) {
}
