package com.cabinetplus.backend.dto;

public record PlanUsageDto(
        boolean planAssigned,
        long dentistsUsed,
        Integer dentistsMax,
        long employeesUsed,
        Integer employeesMax,
        long patientsUsed,
        Integer patientsMax,
        long storageUsedBytes,
        Double storageMaxGb
) {
    public PlanUsageDto(
            boolean planAssigned,
            long dentistsUsed,
            Integer dentistsMax,
            long employeesUsed,
            Integer employeesMax,
            long patientsUsed,
            Integer patientsMax,
            long storageUsedBytes,
            Integer storageMaxGb
    ) {
        this(
                planAssigned,
                dentistsUsed,
                dentistsMax,
                employeesUsed,
                employeesMax,
                patientsUsed,
                patientsMax,
                storageUsedBytes,
                storageMaxGb == null ? 0.0 : storageMaxGb.doubleValue()
        );
    }
}
