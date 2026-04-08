package com.cabinetplus.backend.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.TreatmentService;
import com.cabinetplus.backend.services.UserService;

import static org.mockito.Mockito.mock;

class TreatmentControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        TreatmentService treatmentService = mock(TreatmentService.class);
        UserService userService = mock(UserService.class);
        AuditService auditService = mock(AuditService.class);
        PublicIdResolutionService publicIdResolutionService = mock(PublicIdResolutionService.class);
        CancellationSecurityService cancellationSecurityService = mock(CancellationSecurityService.class);

        TreatmentController controller = new TreatmentController(
                treatmentService,
                userService,
                auditService,
                publicIdResolutionService,
                cancellationSecurityService
        );

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .setValidator(validator)
                .build();
    }

    @Test
    void createTreatmentWhenMissingFieldsReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/treatments")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.patientId").exists())
                .andExpect(jsonPath("$.fieldErrors.treatmentCatalogId").exists())
                .andExpect(jsonPath("$.fieldErrors.price").exists())
                .andExpect(jsonPath("$.fieldErrors.date").exists())
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void createTreatmentWhenDuplicateTeethReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/treatments")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "patient": { "id": 1 },
                                  "treatmentCatalog": { "id": 1 },
                                  "price": 100.0,
                                  "date": "2026-03-17T10:00:00",
                                  "teeth": [1, 1]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.teeth").exists());
    }

    @Test
    void updateTreatmentWhenInvalidStatusReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(put("/api/treatments/1")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "status": "INVALID" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.status").exists());
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }
}

