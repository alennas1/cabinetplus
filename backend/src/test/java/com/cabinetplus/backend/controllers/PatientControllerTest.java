package com.cabinetplus.backend.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PatientFichePdfService;
import com.cabinetplus.backend.services.PatientRiskService;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.springframework.web.server.ResponseStatusException;

class PatientControllerTest {

    private MockMvc mockMvc;
    private UserService userService;
    private PublicIdResolutionService publicIdResolutionService;

    @BeforeEach
    void setUp() {
        PatientService patientService = mock(PatientService.class);
        userService = mock(UserService.class);
        PatientRepository patientRepository = mock(PatientRepository.class);
        AuditService auditService = mock(AuditService.class);
        PatientRiskService patientRiskService = mock(PatientRiskService.class);
        publicIdResolutionService = mock(PublicIdResolutionService.class);
        PatientFichePdfService patientFichePdfService = mock(PatientFichePdfService.class);
        JwtUtil jwtUtil = mock(JwtUtil.class);

        PatientController controller = new PatientController(
                patientService,
                userService,
                patientRepository,
                auditService,
                patientRiskService,
                publicIdResolutionService,
                patientFichePdfService,
                jwtUtil,
                900L
        );

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .setValidator(validator)
                .build();
    }

    @Test
    void createPatientWhenMissingFieldsReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/patients")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.firstname").exists())
                .andExpect(jsonPath("$.fieldErrors.lastname").exists())
                .andExpect(jsonPath("$.fieldErrors.sex").exists())
                .andExpect(jsonPath("$.fieldErrors.phone").exists())
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void createPatientWhenAgeNegativeReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/patients")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstname":"Ali",
                                  "lastname":"Ben",
                                  "age":-1,
                                  "sex":"Homme",
                                  "phone":"0550000000"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.age").exists());
    }

    @Test
    void updatePatientWhenFirstnameTooLongReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(put("/api/patients/abc")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstname":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.firstname").exists());
    }

    @Test
    void createPatientWhenUnknownFieldReturns400WithErrorEnvelope() throws Exception {
        mockMvc.perform(post("/api/patients")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstname":"Ali",
                                  "lastname":"Ben",
                                  "sex":"Homme",
                                  "phone":"0550000000",
                                  "unknownField":"nope"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.unknownField").value("Champ non supporte"));
    }

    @Test
    void getPatientByIdWhenNotFoundReturns404WithErrorEnvelope() throws Exception {
        var user = mock(com.cabinetplus.backend.models.User.class);
        when(userService.findByPhoneNumber("0551111111")).thenReturn(java.util.Optional.of(user));
        when(userService.resolveClinicOwner(user)).thenReturn(user);
        when(publicIdResolutionService.requirePatientOwnedBy("missing", user))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));

        mockMvc.perform(get("/api/patients/missing").with(userPrincipal("0551111111")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Patient introuvable"));
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }
}
