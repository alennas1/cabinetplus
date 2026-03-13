package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.PhoneVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
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
    private PhoneVerificationService phoneVerificationService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        phoneVerificationService = mock(PhoneVerificationService.class);

        VerificationController controller = new VerificationController(userRepository, phoneVerificationService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    @Test
    void sendPhoneOtpWithoutPrincipalReturns401AndErrorKey() throws Exception {
        mockMvc.perform(post("/api/verify/phone/send"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void sendPhoneOtpWithInvalidPhoneReturns400AndErrorKey() throws Exception {
        User user = new User();
        user.setUsername("dentist");
        user.setPhoneNumber("12");
        when(userRepository.findByUsername("dentist")).thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/verify/phone/send").with(userPrincipal("dentist")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void sendPhoneOtpServiceFailureReturns500AndErrorKey() throws Exception {
        User user = new User();
        user.setUsername("dentist");
        user.setPhoneNumber("0550000000");
        when(userRepository.findByUsername("dentist")).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("provider down")).when(phoneVerificationService).sendVerificationCode(any());

        mockMvc.perform(post("/api/verify/phone/send").with(userPrincipal("dentist")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Service SMS indisponible"));
    }

    @Test
    void checkPhoneOtpInvalidCodeReturns400AndErrorKey() throws Exception {
        User user = new User();
        user.setUsername("dentist");
        user.setPhoneNumber("0550000000");
        when(userRepository.findByUsername("dentist")).thenReturn(Optional.of(user));
        when(phoneVerificationService.checkVerificationCode(any(), any())).thenReturn(false);

        mockMvc.perform(post("/api/verify/phone/check")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Code SMS invalide"));
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }

}
