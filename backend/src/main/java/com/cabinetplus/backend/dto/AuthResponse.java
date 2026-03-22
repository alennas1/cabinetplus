package com.cabinetplus.backend.dto;

public record AuthResponse(
        String token,
        String role
) {}
