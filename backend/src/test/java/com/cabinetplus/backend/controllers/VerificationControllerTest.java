package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;

import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PhoneVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class VerificationControllerTest {

    private MockMvc mockMvc;
    private UserRepository userRepository;
    private EmployeeRepository employeeRepository;
    private PhoneVerificationService phoneVerificationService;
    private AuditService auditService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        phoneVerificationService = mock(PhoneVerificationService.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        auditService = mock(AuditService.class);
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[0]);

        VerificationController controller = new VerificationController(
                userRepository,
                employeeRepository,
                phoneVerificationService,
                passwordEncoder,
                auditService,
                environment
        );

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    @Test
    void sendPhoneOtpWithoutPrincipalReturns401AndErrorKey() throws Exception {
        mockMvc.perform(post("/api/verify/phone/send"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.fieldErrors._").exists());
    }

    @Test
    void sendPhoneOtpWithInvalidPhoneReturns400AndErrorKey() throws Exception {
        User user = new User();
        user.setPhoneNumber("12");
        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/verify/phone/send").with(userPrincipal("0551111111")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.phoneNumber").exists());
    }

    @Test
    void sendPhoneOtpServiceFailureReturns500AndErrorKey() throws Exception {
        User user = new User();
        user.setPhoneNumber("0550000000");
        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("provider down")).when(phoneVerificationService).sendVerificationCode(any());

        mockMvc.perform(post("/api/verify/phone/send").with(userPrincipal("0551111111")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.fieldErrors._").value("Service SMS indisponible"));
    }

    @Test
    void checkPhoneOtpInvalidCodeReturns400AndErrorKey() throws Exception {
        User user = new User();
        user.setPhoneNumber("0550000000");
        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));
        when(phoneVerificationService.checkVerificationCode(any(), any())).thenReturn(false);

        mockMvc.perform(post("/api/verify/phone/check")
                        .with(userPrincipal("0551111111"))
                        .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.code").value("Code SMS invalide"));
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }

}
