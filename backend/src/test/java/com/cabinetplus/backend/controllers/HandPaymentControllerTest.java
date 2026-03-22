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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

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
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        handPaymentService = mock(HandPaymentService.class);
        userRepository = mock(UserRepository.class);
        planRepository = mock(PlanRepository.class);
        auditService = mock(AuditService.class);
        publicIdResolutionService = mock(PublicIdResolutionService.class);
        passwordEncoder = mock(PasswordEncoder.class);

        HandPaymentController controller = new HandPaymentController(
                handPaymentService,
                userRepository,
                planRepository,
                auditService,
                publicIdResolutionService,
                passwordEncoder
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
    void createWhenUserMissingReturns404Contract() throws Exception {
        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/hand-payments/create")
                        .with(userPrincipal("0550000000"))
                        .contentType("application/json")
                        .content("""
                                {"planId":1,"amount":3000,"billingCycle":"MONTHLY","notes":"n","password":"pw"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Utilisateur introuvable"));
    }

    @Test
    void createWhenPlanMissingReturns404Contract() throws Exception {
        User user = new User();
        user.setPhoneNumber("0551111111");
        user.setPasswordHash("hash");
        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pw", "hash")).thenReturn(true);
        when(planRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/hand-payments/create")
                        .with(userPrincipal("0551111111"))
                        .contentType("application/json")
                        .content("""
                                {"planId":99,"amount":3000,"billingCycle":"MONTHLY","notes":"n","password":"pw"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Plan introuvable"));
    }

    @Test
    void createWithInvalidBillingCycleReturns400WithFieldErrors() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setPhoneNumber("0551111111");
        Plan plan = new Plan();
        plan.setId(2L);

        when(userRepository.findFirstByPhoneNumberInOrderByIdAsc(any())).thenReturn(Optional.of(user));
        when(planRepository.findById(2L)).thenReturn(Optional.of(plan));

        mockMvc.perform(post("/api/hand-payments/create")
                        .with(userPrincipal("0551111111"))
                        .contentType("application/json")
                        .content("""
                                {"planId":2,"amount":3000,"billingCycle":"whatever","notes":"n","password":"pw"}
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
