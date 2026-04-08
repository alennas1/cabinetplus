package com.cabinetplus.backend.controllers;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.LaboratoryService;
import com.cabinetplus.backend.services.PhoneVerificationService;

class AuthControllerPasswordResetTest {

    private MockMvc mockMvc;
    private UserRepository userRepo;

    @BeforeEach
    void setUp() {
        AuthenticationManager authManager = mock(AuthenticationManager.class);
        JwtUtil jwtUtil = mock(JwtUtil.class);
        userRepo = mock(UserRepository.class);
        LaboratoryRepository laboratoryRepository = mock(LaboratoryRepository.class);
        LaboratoryService laboratoryService = mock(LaboratoryService.class);
        RefreshTokenRepository refreshRepo = mock(RefreshTokenRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AuditService auditService = mock(AuditService.class);
        PhoneVerificationService phoneVerificationService = mock(PhoneVerificationService.class);
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[0]);

        AuthController controller = new AuthController(
                authManager,
                jwtUtil,
                userRepo,
                laboratoryRepository,
                laboratoryService,
                refreshRepo,
                passwordEncoder,
                auditService,
                phoneVerificationService,
                environment
        );

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    @Test
    void passwordResetSendIsForbiddenForEmployeeAccounts() throws Exception {
        User employee = new User();
        employee.setId(99L);
        employee.setRole(UserRole.EMPLOYEE);
        employee.setPhoneNumber("0550000000");

        when(userRepo.findFirstByPhoneNumberOrderByIdAsc("0550000000")).thenReturn(Optional.of(employee));

        mockMvc.perform(post("/auth/password/reset/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":\"0550000000\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.fieldErrors._").exists());
    }

    @Test
    void passwordResetConfirmIsForbiddenForEmployeeAccounts() throws Exception {
        User employee = new User();
        employee.setId(99L);
        employee.setRole(UserRole.EMPLOYEE);
        employee.setPhoneNumber("0550000000");

        when(userRepo.findFirstByPhoneNumberOrderByIdAsc("0550000000")).thenReturn(Optional.of(employee));

        mockMvc.perform(post("/auth/password/reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":\"0550000000\",\"code\":\"000000\",\"newPassword\":\"NewPassword123!\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.fieldErrors._").exists());
    }
}
