package com.cabinetplus.backend.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.cabinetplus.backend.dto.ExpenseRequestDTO;
import com.cabinetplus.backend.dto.ExpenseResponseDTO;
import com.cabinetplus.backend.enums.ExpenseCategory;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.models.Expense;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.CancellationSecurityService;
import com.cabinetplus.backend.services.ExpenseService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

class ExpenseControllerTest {

    private MockMvc mockMvc;
    private ExpenseService expenseService;
    private UserService userService;
    private PublicIdResolutionService publicIdResolutionService;
    private AuditService auditService;
    private CancellationSecurityService cancellationSecurityService;

    @BeforeEach
    void setUp() {
        expenseService = mock(ExpenseService.class);
        userService = mock(UserService.class);
        publicIdResolutionService = mock(PublicIdResolutionService.class);
        auditService = mock(AuditService.class);
        cancellationSecurityService = mock(CancellationSecurityService.class);

        ExpenseController controller = new ExpenseController(
                expenseService,
                userService,
                publicIdResolutionService,
                auditService,
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
    void createExpenseWhenAmountNegativeReturns400WithFieldErrors() throws Exception {
        User current = new User();
        current.setId(1L);
        current.setPhoneNumber("0551111111");
        when(userService.findByPhoneNumber("0551111111")).thenReturn(Optional.of(current));
        when(userService.resolveClinicOwner(current)).thenReturn(current);

        mockMvc.perform(post("/api/expenses")
                        .with(userPrincipal("0551111111"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Test",
                                  "amount":-10,
                                  "category":"SUPPLIES"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.amount").exists());
    }

    @Test
    void createExpenseWhenSalaryMissingEmployeeReturns400WithFieldErrors() throws Exception {
        User current = new User();
        current.setId(1L);
        current.setPhoneNumber("0551111111");
        when(userService.findByPhoneNumber("0551111111")).thenReturn(Optional.of(current));
        when(userService.resolveClinicOwner(current)).thenReturn(current);

        when(expenseService.createExpense(any(ExpenseRequestDTO.class), eq(current)))
                .thenThrow(new BadRequestException(java.util.Map.of("employeeId", "Selectionnez un employe pour une depense SALARY")));

        mockMvc.perform(post("/api/expenses")
                        .with(userPrincipal("0551111111"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Salaire",
                                  "amount":1500,
                                  "category":"SALARY"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.employeeId").exists());
    }

    @Test
    void createExpenseWhenCategoryInvalidReturns400WithFieldErrors() throws Exception {
        User current = new User();
        current.setId(1L);
        current.setPhoneNumber("0551111111");
        when(userService.findByPhoneNumber("0551111111")).thenReturn(Optional.of(current));
        when(userService.resolveClinicOwner(current)).thenReturn(current);

        mockMvc.perform(post("/api/expenses")
                        .with(userPrincipal("0551111111"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Bad",
                                  "amount":10,
                                  "category":"INVALID"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.category").exists());
    }

    @Test
    void getByIdWhenMissingReturns404Contract() throws Exception {
        User current = new User();
        current.setId(1L);
        current.setPhoneNumber("0551111111");
        when(userService.findByPhoneNumber("0551111111")).thenReturn(Optional.of(current));
        when(userService.resolveClinicOwner(current)).thenReturn(current);

        when(expenseService.getExpenseByIdForUser(99L, current)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/expenses/99").with(userPrincipal("0551111111")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Depense introuvable"));
    }

    @Test
    void createExpenseSuccessReturnsResponsePayload() throws Exception {
        User current = new User();
        current.setId(1L);
        current.setPhoneNumber("0551111111");
        when(userService.findByPhoneNumber("0551111111")).thenReturn(Optional.of(current));
        when(userService.resolveClinicOwner(current)).thenReturn(current);

        Expense saved = new Expense();
        saved.setId(10L);
        saved.setTitle("Ok");
        saved.setAmount(100.0);
        saved.setCategory(ExpenseCategory.SUPPLIES);
        when(expenseService.createExpense(any(ExpenseRequestDTO.class), eq(current))).thenReturn(saved);
        when(expenseService.toDTO(saved)).thenReturn(new ExpenseResponseDTO(
                saved.getId(),
                saved.getTitle(),
                saved.getAmount(),
                saved.getCategory(),
                saved.getDate(),
                saved.getDescription(),
                null, // otherCategoryLabel
                null, // fournisseurId
                null, // fournisseurName
                null, // employeeId
                null, // createdByName
                null, // recordStatus
                null, // cancelledAt
                null, // cancelledByName
                null  // cancelReason
        ));

        mockMvc.perform(post("/api/expenses")
                        .with(userPrincipal("0551111111"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Ok",
                                  "amount":100,
                                  "category":"SUPPLIES"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.title").value("Ok"))
                .andExpect(jsonPath("$.category").value("SUPPLIES"));
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }
}
