package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.PlanUsageDto;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.DocumentRepository;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.ProthesisFileRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import org.springframework.stereotype.Service;

@Service
public class PlanLimitService {
    private static final long BYTES_PER_GB = 1024L * 1024L * 1024L;

    private final EmployeeRepository employeeRepository;
    private final PatientRepository patientRepository;
    private final DocumentRepository documentRepository;
    private final ProthesisRepository prothesisRepository;
    private final ProthesisFileRepository prothesisFileRepository;

    public PlanLimitService(
            EmployeeRepository employeeRepository,
            PatientRepository patientRepository,
            DocumentRepository documentRepository,
            ProthesisRepository prothesisRepository,
            ProthesisFileRepository prothesisFileRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.patientRepository = patientRepository;
        this.documentRepository = documentRepository;
        this.prothesisRepository = prothesisRepository;
        this.prothesisFileRepository = prothesisFileRepository;
    }

    public void assertPatientLimitNotReached(User ownerDentist) {
        Plan plan = requirePlan(ownerDentist);
        long currentPatients = patientRepository.countByCreatedByAndArchivedAtIsNull(ownerDentist);
        Long maxPatients = normalizeLimit(plan.getMaxPatients());
        if (maxPatients == null || maxPatients < 0) {
            return;
        }
        if (currentPatients >= maxPatients) {
            throw new IllegalArgumentException("Limite de patients actifs atteinte pour votre plan");
        }
    }

    public void assertEmployeeLimitNotReached(User ownerDentist) {
        Plan plan = requirePlan(ownerDentist);
        long currentEmployees = employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatus(ownerDentist, RecordStatus.ACTIVE);
        Long maxEmployees = normalizeLimit(plan.getMaxEmployees());
        if (maxEmployees == null || maxEmployees < 0) {
            return;
        }
        if (currentEmployees >= maxEmployees) {
            throw new IllegalArgumentException("Limite d'employes atteinte pour votre plan");
        }
    }

    public void assertStorageWithinLimit(User ownerDentist, long nextTotalBytes) {
        Plan plan = requirePlan(ownerDentist);
        Double maxStorageGb = normalizeStorageLimitGb(plan.getMaxStorageGb());
        if (maxStorageGb == null || maxStorageGb < 0) {
            return;
        }
        long storageLimitBytes = Math.round(maxStorageGb * BYTES_PER_GB);
        if (nextTotalBytes > storageLimitBytes) {
            throw new IllegalArgumentException("Limite de stockage atteinte pour votre plan");
        }
    }

    public long getCurrentStorageBytes(User ownerDentist) {
        requirePlan(ownerDentist);
        return documentRepository.sumFileSizeBytesByOwner(ownerDentist)
                + prothesisRepository.sumStlFileSizeBytesByOwner(ownerDentist)
                + prothesisFileRepository.sumFileSizeBytesByOwner(ownerDentist);
    }

    public PlanUsageDto getUsage(User ownerDentist) {
        Plan plan = ownerDentist != null ? ownerDentist.getPlan() : null;
        long dentistsUsed = ownerDentist != null ? 1 : 0;
        long employeesUsed = ownerDentist != null
                ? employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatus(ownerDentist, RecordStatus.ACTIVE)
                : 0;
        long patientsUsed = ownerDentist != null
                ? patientRepository.countByCreatedByAndArchivedAtIsNull(ownerDentist)
                : 0;
        long storageUsedBytes = ownerDentist != null
                ? (documentRepository.sumFileSizeBytesByOwner(ownerDentist)
                    + prothesisRepository.sumStlFileSizeBytesByOwner(ownerDentist)
                    + prothesisFileRepository.sumFileSizeBytesByOwner(ownerDentist))
                : 0;

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

    public void assertUsageFitsPlan(User ownerDentist, Plan targetPlan) {
        if (ownerDentist == null) {
            throw new IllegalArgumentException("Cabinet introuvable");
        }
        if (targetPlan == null) {
            throw new IllegalArgumentException("Plan introuvable");
        }
        if (!targetPlan.isActive()) {
            throw new IllegalArgumentException("Le plan choisi est inactif");
        }

        long dentistsUsed = 1;
        long employeesUsed = employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatus(ownerDentist, RecordStatus.ACTIVE);
        long patientsUsed = patientRepository.countByCreatedByAndArchivedAtIsNull(ownerDentist);
        long storageUsedBytes = documentRepository.sumFileSizeBytesByOwner(ownerDentist);
        storageUsedBytes += prothesisRepository.sumStlFileSizeBytesByOwner(ownerDentist);
        storageUsedBytes += prothesisFileRepository.sumFileSizeBytesByOwner(ownerDentist);

        Long maxDentists = normalizeLimit(targetPlan.getMaxDentists());
        if (maxDentists != null && maxDentists >= 0 && dentistsUsed > maxDentists) {
            throw new IllegalArgumentException("Impossible de changer de plan: limite de dentistes depassee");
        }

        Long maxEmployees = normalizeLimit(targetPlan.getMaxEmployees());
        if (maxEmployees != null && maxEmployees >= 0 && employeesUsed > maxEmployees) {
            throw new IllegalArgumentException("Impossible de changer de plan: limite d'employes depassee");
        }

        Long maxPatients = normalizeLimit(targetPlan.getMaxPatients());
        if (maxPatients != null && maxPatients >= 0 && patientsUsed > maxPatients) {
            throw new IllegalArgumentException("Impossible de changer de plan: limite de patients actifs depassee");
        }

        Double maxStorageGb = normalizeStorageLimitGb(targetPlan.getMaxStorageGb());
        if (maxStorageGb != null && maxStorageGb >= 0) {
            long storageLimitBytes = Math.round(maxStorageGb * BYTES_PER_GB);
            if (storageUsedBytes > storageLimitBytes) {
                throw new IllegalArgumentException("Impossible de changer de plan: limite de stockage depassee");
            }
        }
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

    private Long normalizeLimit(Integer value) {
        if (value == null) return null;
        return value.longValue();
    }

    private Double normalizeStorageLimitGb(Double value) {
        return value;
    }
}
