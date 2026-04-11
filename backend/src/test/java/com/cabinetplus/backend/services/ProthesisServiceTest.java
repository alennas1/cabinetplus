package com.cabinetplus.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.LaboratoryConnectionRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.ProthesisCatalogRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;

class ProthesisServiceTest {

    private ProthesisRepository prothesisRepository;
    private ProthesisCatalogRepository prothesisCatalogRepository;
    private PatientRepository patientRepository;
    private LaboratoryRepository laboratoryRepository;
    private LaboratoryConnectionRepository laboratoryConnectionRepository;
    private RealtimeRecipientsService realtimeRecipientsService;
    private ApplicationEventPublisher eventPublisher;
    private ProthesisService prothesisService;

    @BeforeEach
    void setUp() {
        prothesisRepository = mock(ProthesisRepository.class);
        prothesisCatalogRepository = mock(ProthesisCatalogRepository.class);
        patientRepository = mock(PatientRepository.class);
        laboratoryRepository = mock(LaboratoryRepository.class);
        laboratoryConnectionRepository = mock(LaboratoryConnectionRepository.class);
        realtimeRecipientsService = mock(RealtimeRecipientsService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        prothesisService = new ProthesisService(
                prothesisRepository,
                prothesisCatalogRepository,
                patientRepository,
                laboratoryRepository,
                laboratoryConnectionRepository,
                realtimeRecipientsService,
                eventPublisher
        );
    }

    @Test
    void updateStatusWhenInvalidValueReturns400WithFieldErrors() {
        User practitioner = new User();
        practitioner.setId(1L);
        practitioner.setRole(UserRole.DENTIST);

        Prothesis existing = new Prothesis();
        existing.setId(10L);
        existing.setPractitioner(practitioner);

        when(prothesisRepository.findForResponseById(10L)).thenReturn(Optional.of(existing));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> prothesisService.updateStatus(10L, "INVALID_STATUS", practitioner, practitioner));
        assertEquals("Statut invalide", ex.getFieldErrors().get("status"));
    }
}

