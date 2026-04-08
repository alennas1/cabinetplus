package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.EmployeeService;
import com.cabinetplus.backend.services.PlanLimitService;
import com.cabinetplus.backend.services.PlanService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.SubscriptionService;
import com.cabinetplus.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    private MockMvc mockMvc;
    private UserService userService;
    private PlanService planService;
    private PlanLimitService planLimitService;
    private PublicIdResolutionService publicIdResolutionService;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        planService = mock(PlanService.class);
        planLimitService = mock(PlanLimitService.class);
        SubscriptionService subscriptionService = mock(SubscriptionService.class);
        publicIdResolutionService = mock(PublicIdResolutionService.class);
        AuditService auditService = mock(AuditService.class);
        EmployeeService employeeService = mock(EmployeeService.class);
        RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);

        UserController controller = new UserController(
                userService,
                passwordEncoder,
                planService,
                planLimitService,
                subscriptionService,
                auditService,
                employeeService,
                refreshTokenRepository,
                publicIdResolutionService
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
    void getUserByIdWhenMissingReturns404Contract() throws Exception {
        when(publicIdResolutionService.requireUserByIdOrPublicId("404"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        mockMvc.perform(get("/api/users/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Utilisateur introuvable"));
    }

    @Test
    void activatePlanWhenUserHasNoPlanReturns400Contract() throws Exception {
        User user = new User();
        user.setId(5L);
        user.setPlan(null);
        when(userService.findById(5L)).thenReturn(Optional.of(user));

        mockMvc.perform(put("/api/users/admin/activate-plan/5")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors._").value("Cet utilisateur n'a pas choisi de plan"));
    }

    @Test
    void deactivatePlanWhenUserMissingReturns404Contract() throws Exception {
        when(userService.findById(11L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/users/admin/deactivate-plan/11")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Utilisateur introuvable"));
    }

    @Test
    void activatePlanSuccessSetsActiveStatus() throws Exception {
        Plan plan = new Plan();
        plan.setDurationDays(30);

        User user = new User();
        user.setId(9L);
        user.setPlan(plan);
        when(userService.findById(9L)).thenReturn(Optional.of(user));
        when(userService.save(user)).thenReturn(user);

        mockMvc.perform(put("/api/users/admin/activate-plan/9")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planStatus").value(UserPlanStatus.ACTIVE.name()))
                .andExpect(jsonPath("$.planStartDate").exists());
    }

    @Test
    void activatePlanWhenUsageExceedsReturns400Contract() throws Exception {
        Plan plan = new Plan();
        plan.setDurationDays(30);

        User user = new User();
        user.setId(9L);
        user.setPlan(plan);
        when(userService.findById(9L)).thenReturn(Optional.of(user));

        doThrow(new IllegalArgumentException("Impossible de changer de plan: limite de patients actifs depassee"))
                .when(planLimitService)
                .assertUsageFitsPlan(user, plan);

        mockMvc.perform(put("/api/users/admin/activate-plan/9")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors._").value("Impossible de changer de plan: limite de patients actifs depassee"));
    }
}
