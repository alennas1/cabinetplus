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
import com.cabinetplus.backend.repositories.ProthesisRepository;
import com.cabinetplus.backend.repositories.ProthesisFileRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.ProthesisService;
import com.cabinetplus.backend.services.ProthesisFilesService;
import com.cabinetplus.backend.services.ProthesisStlService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import static org.mockito.Mockito.mock;

class ProtheticsControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        ProthesisService prothesisService = mock(ProthesisService.class);
        UserService userService = mock(UserService.class);
        AuditService auditService = mock(AuditService.class);
        ProthesisRepository prothesisRepository = mock(ProthesisRepository.class);
        PublicIdResolutionService publicIdResolutionService = mock(PublicIdResolutionService.class);
        CancellationSecurityService cancellationSecurityService = mock(CancellationSecurityService.class);
        ProthesisStlService prothesisStlService = mock(ProthesisStlService.class);
        ProthesisFilesService prothesisFilesService = mock(ProthesisFilesService.class);
        ProthesisFileRepository prothesisFileRepository = mock(ProthesisFileRepository.class);

        ProtheticsController controller = new ProtheticsController(
                prothesisService,
                prothesisStlService,
                prothesisFilesService,
                userService,
                auditService,
                prothesisRepository,
                prothesisFileRepository,
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
    void createProthesisWhenMissingFieldsReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/protheses")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.patientId").exists())
                .andExpect(jsonPath("$.fieldErrors.catalogId").exists())
                .andExpect(jsonPath("$.fieldErrors.teeth").exists())
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void createProthesisWhenDuplicateTeethReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/protheses")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "patientId": 1,
                                  "catalogId": 1,
                                  "teeth": [1, 1],
                                  "finalPrice": 100
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.teeth").exists());
    }

    @Test
    void assignLabWhenNegativeLabCostReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(put("/api/protheses/1/assign-lab")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "laboratoryId": 5,
                                  "labCost": -1
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.labCost").exists());
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }
}

