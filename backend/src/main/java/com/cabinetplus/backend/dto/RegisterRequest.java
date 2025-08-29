package com.cabinetplus.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 20) String username,
        @NotBlank @Size(min = 6, max = 100) String password,
        @NotBlank String firstname,
        @NotBlank String lastname,
        @Email String email,
        @NotBlank String phoneNumber,
        @NotBlank String role
) {}
