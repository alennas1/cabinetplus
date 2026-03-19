package com.cabinetplus.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.models.AuditLog;
import com.cabinetplus.backend.repositories.AuditLogRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PatientRepository patientRepository;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditLogRepository, userRepository, patientRepository);
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void logSuccessWithGeoHeadersStoresIpAndLocation() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI("/auth/login");
        request.addHeader("X-Forwarded-For", "41.220.77.14");
        request.addHeader("X-City", "Alger");
        request.addHeader("X-Region", "Alger");
        request.addHeader("CF-IPCountry", "DZ");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        auditService.logSuccess(AuditEventType.AUTH_LOGIN, "SESSION", null, "Connexion reussie");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertEquals("41.220.77.14", saved.getIpAddress());
        assertEquals("Alger, Alger, DZ", saved.getLocation());
    }

    @Test
    void logSuccessWithLocalIpStoresReseauLocal() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI("/auth/login");
        request.setRemoteAddr("0:0:0:0:0:0:0:1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        auditService.logSuccess(AuditEventType.AUTH_LOGIN, "SESSION", null, "Connexion reussie");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertEquals("0:0:0:0:0:0:0:1", saved.getIpAddress());
        assertEquals("Reseau local", saved.getLocation());
    }
}
