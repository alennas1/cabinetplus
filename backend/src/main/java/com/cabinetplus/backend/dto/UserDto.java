package com.cabinetplus.backend.dto;

public record UserDto(
    Long id,
    String firstname,
    String lastname,
    String phoneNumber,
    String role
) {}
