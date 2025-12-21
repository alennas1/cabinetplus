package com.cabinetplus.backend.dto;

public record UserDto(
    Long id,
    String username,
    String firstname,
    String lastname,
    String phoneNumber,
    String role
) {}
