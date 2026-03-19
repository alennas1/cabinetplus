package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.models.HandPayment;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PlanRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.HandPaymentService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HandPaymentControllerTest {

    private MockMvc mockMvc;
    private HandPaymentService handPaymentService;
    private UserRepository userRepository;
    private PlanRepository planRepository;
    private AuditService auditService;
    private PublicIdResolutionService publicIdResolutionService;

    @BeforeEach
    void setUp() {
        handPaymentService = mock(HandPaymentService.class);
        userRepository = mock(UserRepository.class);
        planRepository = mock(PlanRepository.class);
        auditService = mock(AuditService.class);
        publicIdResolutionService = mock(PublicIdResolutionService.class);

        HandPaymentController controller = new HandPaymentController(handPaymentService, userRepository, planRepository, auditService, publicIdResolutionService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    @Test
    void createWhenUserMissingReturns404Contract() throws Exception {
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/hand-payments/create")
                        .with(userPrincipal("missing"))
                        .contentType("application/json")
                        .content("""
                                {"planId":1,"amount":3000,"billingCycle":"MONTHLY","notes":"n"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Utilisateur introuvable"));
    }

    @Test
    void createWhenPlanMissingReturns404Contract() throws Exception {
        User user = new User();
        user.setUsername("dentist");
        when(userRepository.findByUsername("dentist")).thenReturn(Optional.of(user));
        when(planRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/hand-payments/create")
                        .with(userPrincipal("dentist"))
                        .contentType("application/json")
                        .content("""
                                {"planId":99,"amount":3000,"billingCycle":"MONTHLY","notes":"n"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Plan introuvable"));
    }

    @Test
    void createWithInvalidBillingCycleReturns400WithFieldErrors() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setUsername("dentist");
        Plan plan = new Plan();
        plan.setId(2L);

        when(userRepository.findByUsername("dentist")).thenReturn(Optional.of(user));
        when(planRepository.findById(2L)).thenReturn(Optional.of(plan));

        mockMvc.perform(post("/api/hand-payments/create")
                        .with(userPrincipal("dentist"))
                        .contentType("application/json")
                        .content("""
                                {"planId":2,"amount":3000,"billingCycle":"whatever","notes":"n"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.billingCycle").value("Cycle de facturation invalide"));
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }
}
