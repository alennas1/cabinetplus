package com.cabinetplus.backend.services;

import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.DocumentRepository;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.ProthesisFileRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanLimitServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private ProthesisRepository prothesisRepository;

    @Mock
    private ProthesisFileRepository prothesisFileRepository;

    private PlanLimitService service;

    @BeforeEach
    void setUp() {
        service = new PlanLimitService(employeeRepository, patientRepository, documentRepository, prothesisRepository, prothesisFileRepository);
    }

    @Test
    void assertUsageFitsPlanBlocksWhenMaxPatientsIsZero() {
        User owner = new User();

        Plan target = new Plan();
        target.setActive(true);
        target.setMaxDentists(10);
        target.setMaxEmployees(10);
        target.setMaxPatients(0);
        target.setMaxStorageGb(10.0);

        when(employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatus(owner, com.cabinetplus.backend.enums.RecordStatus.ACTIVE)).thenReturn(0L);
        when(patientRepository.countByCreatedByAndArchivedAtIsNull(owner)).thenReturn(1L);
        when(documentRepository.sumFileSizeBytesByOwner(owner)).thenReturn(0L);
        when(prothesisRepository.sumStlFileSizeBytesByOwner(owner)).thenReturn(0L);
        when(prothesisFileRepository.sumFileSizeBytesByOwner(owner)).thenReturn(0L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.assertUsageFitsPlan(owner, target));
        assertEquals("Impossible de changer de plan: limite de patients actifs depassee", ex.getMessage());
    }

    @Test
    void assertUsageFitsPlanBlocksWhenMaxEmployeesIsZero() {
        User owner = new User();

        Plan target = new Plan();
        target.setActive(true);
        target.setMaxDentists(10);
        target.setMaxEmployees(0);
        target.setMaxPatients(10);
        target.setMaxStorageGb(10.0);

        when(employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatus(owner, com.cabinetplus.backend.enums.RecordStatus.ACTIVE)).thenReturn(1L);
        when(patientRepository.countByCreatedByAndArchivedAtIsNull(owner)).thenReturn(0L);
        when(documentRepository.sumFileSizeBytesByOwner(owner)).thenReturn(0L);
        when(prothesisRepository.sumStlFileSizeBytesByOwner(owner)).thenReturn(0L);
        when(prothesisFileRepository.sumFileSizeBytesByOwner(owner)).thenReturn(0L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.assertUsageFitsPlan(owner, target));
        assertEquals("Impossible de changer de plan: limite d'employes depassee", ex.getMessage());
    }

    @Test
    void assertUsageFitsPlanTreatsNegativeAsUnlimited() {
        User owner = new User();

        Plan target = new Plan();
        target.setActive(true);
        target.setMaxDentists(-1);
        target.setMaxEmployees(-1);
        target.setMaxPatients(-1);
        target.setMaxStorageGb(-1.0);

        when(employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatus(owner, com.cabinetplus.backend.enums.RecordStatus.ACTIVE)).thenReturn(10L);
        when(patientRepository.countByCreatedByAndArchivedAtIsNull(owner)).thenReturn(100L);
        when(documentRepository.sumFileSizeBytesByOwner(owner)).thenReturn(123L);
        when(prothesisRepository.sumStlFileSizeBytesByOwner(owner)).thenReturn(456L);
        when(prothesisFileRepository.sumFileSizeBytesByOwner(owner)).thenReturn(789L);

        assertDoesNotThrow(() -> service.assertUsageFitsPlan(owner, target));
    }
}
