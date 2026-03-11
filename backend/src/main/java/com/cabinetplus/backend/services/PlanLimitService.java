package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.PlanUsageDto;
import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.DocumentRepository;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import org.springframework.stereotype.Service;

@Service
public class PlanLimitService {
    private static final long BYTES_PER_GB = 1024L * 1024L * 1024L;

    private final EmployeeRepository employeeRepository;
    private final PatientRepository patientRepository;
    private final DocumentRepository documentRepository;

    public PlanLimitService(
            EmployeeRepository employeeRepository,
            PatientRepository patientRepository,
            DocumentRepository documentRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.patientRepository = patientRepository;
        this.documentRepository = documentRepository;
    }

    public void assertPatientLimitNotReached(User ownerDentist) {
        Plan plan = requirePlan(ownerDentist);
        long currentPatients = patientRepository.countByCreatedBy(ownerDentist);
        long maxPatients = safeLimit(plan.getMaxPatients());
        if (maxPatients <= 0) {
            return;
        }
        if (currentPatients >= maxPatients) {
            throw new IllegalArgumentException("Limite de patients atteinte pour votre plan");
        }
    }

    public void assertEmployeeRoleAllowed(User ownerDentist, ClinicAccessRole role) {
        Plan plan = requirePlan(ownerDentist);

        if (role == ClinicAccessRole.PARTNER_DENTIST) {
            long currentDentists = 1 + employeeRepository.countByDentistAndClinicRole(ownerDentist, ClinicAccessRole.PARTNER_DENTIST);
            long maxDentists = safeLimit(plan.getMaxDentists());
            if (maxDentists <= 0) {
                return;
            }
            if (currentDentists >= maxDentists) {
                throw new IllegalArgumentException("Limite de dentistes atteinte pour votre plan");
            }
            return;
        }

        long currentStaff = employeeRepository.countStaffByDentist(ownerDentist, ClinicAccessRole.PARTNER_DENTIST);
        long maxEmployees = safeLimit(plan.getMaxEmployees());
        if (maxEmployees <= 0) {
            return;
        }
        if (currentStaff >= maxEmployees) {
            throw new IllegalArgumentException("Limite d'employes atteinte pour votre plan");
        }
    }

    public void assertStorageWithinLimit(User ownerDentist, long nextTotalBytes) {
        Plan plan = requirePlan(ownerDentist);
        double maxStorageGb = safeStorageLimitGb(plan.getMaxStorageGb());
        if (maxStorageGb <= 0) {
            return;
        }
        long storageLimitBytes = Math.round(maxStorageGb * BYTES_PER_GB);
        if (nextTotalBytes > storageLimitBytes) {
            throw new IllegalArgumentException("Limite de stockage atteinte pour votre plan");
        }
    }

    public long getCurrentStorageBytes(User ownerDentist) {
        requirePlan(ownerDentist);
        return documentRepository.sumFileSizeBytesByOwner(ownerDentist);
    }

    public long getExistingDocumentBytes(Long documentId) {
        if (documentId == null) return 0L;
        return documentRepository.findFileSizeBytesById(documentId).orElse(0L);
    }

    public PlanUsageDto getPlanUsage(User ownerDentist) {
        if (ownerDentist == null) {
            return new PlanUsageDto(false, 0, 0, 0, 0, 0, 0, 0, 0.0);
        }

        Plan plan = ownerDentist.getPlan();
        long dentistsUsed = 1 + employeeRepository.countByDentistAndClinicRole(ownerDentist, ClinicAccessRole.PARTNER_DENTIST);
        long employeesUsed = employeeRepository.countStaffByDentist(ownerDentist, ClinicAccessRole.PARTNER_DENTIST);
        long patientsUsed = patientRepository.countByCreatedBy(ownerDentist);
        long storageUsedBytes = documentRepository.sumFileSizeBytesByOwner(ownerDentist);

        return new PlanUsageDto(
                plan != null,
                dentistsUsed,
                plan != null ? plan.getMaxDentists() : 0,
                employeesUsed,
                plan != null ? plan.getMaxEmployees() : 0,
                patientsUsed,
                plan != null ? plan.getMaxPatients() : 0,
                storageUsedBytes,
                plan != null ? plan.getMaxStorageGb() : 0.0
        );
    }

    private Plan requirePlan(User ownerDentist) {
        if (ownerDentist == null) {
            throw new IllegalArgumentException("Cabinet introuvable");
        }
        Plan plan = ownerDentist.getPlan();
        if (plan == null) {
            throw new IllegalArgumentException("Aucun plan attribue au cabinet");
        }
        if (!plan.isActive()) {
            throw new IllegalArgumentException("Le plan du cabinet est inactif");
        }
        return plan;
    }

    private long safeLimit(Integer value) {
        return value == null ? 0L : Math.max(0, value.longValue());
    }

    private double safeStorageLimitGb(Double value) {
        return value == null ? 0D : Math.max(0D, value);
    }
}
