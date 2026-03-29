package com.cabinetplus.backend.services;

import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.DocumentRepository;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.UserRepository;
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
    private UserRepository userRepository;

    private PlanLimitService service;

    @BeforeEach
    void setUp() {
        service = new PlanLimitService(employeeRepository, patientRepository, documentRepository, userRepository);
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

        when(userRepository.countByOwnerDentistAndClinicAccessRole(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(0L);
        when(userRepository.countByOwnerDentistAndClinicAccessRoleNot(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(0L);
        when(employeeRepository.countByDentistAndClinicRole(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(0L);
        when(employeeRepository.countStaffByDentist(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(0L);
        when(employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatusAndUserIsNull(owner, com.cabinetplus.backend.enums.RecordStatus.ACTIVE)).thenReturn(0L);
        when(patientRepository.countByCreatedByAndArchivedAtIsNull(owner)).thenReturn(1L);
        when(documentRepository.sumFileSizeBytesByOwner(owner)).thenReturn(0L);

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

        when(userRepository.countByOwnerDentistAndClinicAccessRole(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(0L);
        when(userRepository.countByOwnerDentistAndClinicAccessRoleNot(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(1L);
        when(employeeRepository.countByDentistAndClinicRole(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(0L);
        when(employeeRepository.countStaffByDentist(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(1L);
        when(employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatusAndUserIsNull(owner, com.cabinetplus.backend.enums.RecordStatus.ACTIVE)).thenReturn(0L);
        when(patientRepository.countByCreatedByAndArchivedAtIsNull(owner)).thenReturn(0L);
        when(documentRepository.sumFileSizeBytesByOwner(owner)).thenReturn(0L);

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

        when(userRepository.countByOwnerDentistAndClinicAccessRole(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(10L);
        when(userRepository.countByOwnerDentistAndClinicAccessRoleNot(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(10L);
        when(employeeRepository.countByDentistAndClinicRole(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(10L);
        when(employeeRepository.countStaffByDentist(owner, ClinicAccessRole.PARTNER_DENTIST)).thenReturn(10L);
        when(employeeRepository.countByDentistAndArchivedAtIsNullAndRecordStatusAndUserIsNull(owner, com.cabinetplus.backend.enums.RecordStatus.ACTIVE)).thenReturn(0L);
        when(patientRepository.countByCreatedByAndArchivedAtIsNull(owner)).thenReturn(100L);
        when(documentRepository.sumFileSizeBytesByOwner(owner)).thenReturn(Long.MAX_VALUE);

        assertDoesNotThrow(() -> service.assertUsageFitsPlan(owner, target));
    }
}
