package com.cabinetplus.backend.enums;

public enum UserPlanStatus {
    PENDING,   // User hasn't chosen a plan yet
    WAITING,   // User selected plan, payment not confirmed
    ACTIVE,    // Plan is active
    INACTIVE   // Expired or manually deactivated
}
