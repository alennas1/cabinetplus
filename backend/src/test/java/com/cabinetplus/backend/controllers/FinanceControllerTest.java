package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.FinanceCardsResponseDTO;
import com.cabinetplus.backend.dto.FinanceGraphResponseDTO;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.FinanceService;
import com.cabinetplus.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FinanceControllerTest {

    private MockMvc mockMvc;
    private FinanceService financeService;
    private UserService userService;

    @BeforeEach
    void setUp() {
        financeService = mock(FinanceService.class);
        userService = mock(UserService.class);

        FinanceController controller = new FinanceController(financeService, userService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    @Test
    void graphWhenUserMissingReturns404Contract() throws Exception {
        when(userService.findByUsername("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/finance/graph")
                        .with(userPrincipal("missing"))
                        .param("timeframe", "daily"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Utilisateur introuvable"));
    }

    @Test
    void graphInvalidTimeframeReturns400Contract() throws Exception {
        User dentist = new User();
        dentist.setUsername("dentist");
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(dentist));
        when(userService.resolveClinicOwner(dentist)).thenReturn(dentist);
        when(financeService.getFinanceGraph(dentist, "invalid"))
                .thenThrow(new IllegalArgumentException("Periode invalide: invalid"));

        mockMvc.perform(get("/api/finance/graph")
                        .with(userPrincipal("dentist"))
                        .param("timeframe", "invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors._").value("Periode invalide: invalid"));
    }

    @Test
    void cardsSuccessReturnsPayload() throws Exception {
        User dentist = new User();
        dentist.setUsername("dentist");
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(dentist));
        when(userService.resolveClinicOwner(dentist)).thenReturn(dentist);

        FinanceCardsResponseDTO dto = new FinanceCardsResponseDTO();
        dto.setRevenue(new FinanceCardsResponseDTO.RevenueDTO(
                new FinanceCardsResponseDTO.ValueComparisonDTO(10.0, 9.0),
                new FinanceCardsResponseDTO.ValueComparisonDTO(8.0, 7.0),
                new FinanceCardsResponseDTO.ValueComparisonDTO(6.0, 5.0),
                new FinanceCardsResponseDTO.ValueComparisonDTO(2.0, 2.0)
        ));
        dto.setExpense(new FinanceCardsResponseDTO.ExpenseDTO(
                new FinanceCardsResponseDTO.ValueComparisonDTO(3.0, 2.0),
                new FinanceCardsResponseDTO.ValueComparisonDTO(2.0, 1.0),
                new FinanceCardsResponseDTO.ValueComparisonDTO(1.0, 1.0)
        ));

        when(financeService.getFinanceCards(eq(dentist), eq("today"), any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/finance/cards")
                        .with(userPrincipal("dentist"))
                        .param("timeframe", "today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revenue.revenuedu.current").value(10.0))
                .andExpect(jsonPath("$.expense.total.current").value(3.0));
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }
}
