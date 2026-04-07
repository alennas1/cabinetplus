package com.cabinetplus.backend.dto;

public record LabMeUpdateRequest(
        String name,
        String contactPerson,
        String address,
        String password
) {
}

