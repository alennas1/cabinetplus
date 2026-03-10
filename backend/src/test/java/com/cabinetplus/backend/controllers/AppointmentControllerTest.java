package com.cabinetplus.backend.controllers;

import com.cabinetplus.backend.dto.PatientDto;
import com.cabinetplus.backend.enums.AppointmentStatus;
import com.cabinetplus.backend.exceptions.GlobalExceptionHandler;
import com.cabinetplus.backend.models.Appointment;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AppointmentService;
import com.cabinetplus.backend.services.PatientService;
import com.cabinetplus.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AppointmentControllerTest {

    private MockMvc mockMvc;
    private UserService userService;
    private AppointmentService appointmentService;
    private PatientService patientService;

    @BeforeEach
    void setUp() {
        appointmentService = mock(AppointmentService.class);
        userService = mock(UserService.class);
        patientService = mock(PatientService.class);

        AppointmentController controller = new AppointmentController(appointmentService, userService, patientService);

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
    void getAllAppointmentsWhenUserMissingReturns404Contract() throws Exception {
        when(userService.findByUsername("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/appointments").with(userPrincipal("missing")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Utilisateur introuvable"))
                .andExpect(jsonPath("$.path").value("/api/appointments"));
    }

    @Test
    void createAppointmentWhenOverlappingReturns409Contract() throws Exception {
        User current = new User();
        current.setId(1L);
        current.setUsername("dentist");
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(current));

        Appointment existing = new Appointment();
        existing.setId(10L);
        existing.setDateTimeStart(LocalDateTime.parse("2026-03-10T10:00:00"));
        existing.setDateTimeEnd(LocalDateTime.parse("2026-03-10T11:00:00"));
        when(appointmentService.findByPractitioner(current)).thenReturn(List.of(existing));

        mockMvc.perform(post("/api/appointments")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dateTimeStart":"2026-03-10T10:30:00",
                                  "dateTimeEnd":"2026-03-10T11:15:00",
                                  "status":"SCHEDULED",
                                  "notes":"test",
                                  "patientId":5
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Ce rendez-vous chevauche un autre rendez-vous"))
                .andExpect(jsonPath("$.path").value("/api/appointments"));
    }

    @Test
    void createAppointmentWhenPatientMissingReturns404Contract() throws Exception {
        User current = new User();
        current.setId(1L);
        current.setUsername("dentist");
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(current));
        when(appointmentService.findByPractitioner(current)).thenReturn(List.of());
        when(patientService.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/appointments")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dateTimeStart":"2026-03-10T12:00:00",
                                  "dateTimeEnd":"2026-03-10T12:30:00",
                                  "status":"SCHEDULED",
                                  "notes":"test",
                                  "patientId":99
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Patient introuvable"))
                .andExpect(jsonPath("$.path").value("/api/appointments"));
    }

    @Test
    void createAppointmentSuccessReturnsResponsePayload() throws Exception {
        User current = new User();
        current.setId(7L);
        current.setFirstname("John");
        current.setLastname("Doe");
        current.setUsername("dentist");
        when(userService.findByUsername("dentist")).thenReturn(Optional.of(current));
        when(appointmentService.findByPractitioner(current)).thenReturn(List.of());

        PatientDto patientDto = new PatientDto(5L, "Ali", "Ben", 32, "Homme", "0550000000", LocalDateTime.now());
        when(patientService.findById(5L)).thenReturn(Optional.of(patientDto));

        Appointment saved = new Appointment();
        saved.setId(123L);
        saved.setDateTimeStart(LocalDateTime.parse("2026-03-10T12:00:00"));
        saved.setDateTimeEnd(LocalDateTime.parse("2026-03-10T12:30:00"));
        saved.setStatus(AppointmentStatus.SCHEDULED);
        saved.setNotes("ok");
        when(appointmentService.save(any(Appointment.class))).thenReturn(saved);

        mockMvc.perform(post("/api/appointments")
                        .with(userPrincipal("dentist"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dateTimeStart":"2026-03-10T12:00:00",
                                  "dateTimeEnd":"2026-03-10T12:30:00",
                                  "status":"SCHEDULED",
                                  "notes":"ok",
                                  "patientId":5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(123))
                .andExpect(jsonPath("$.patient.id").value(5))
                .andExpect(jsonPath("$.practitionerId").value(7));
    }

    @Test
    void statsWhenUserMissingReturns404Contract() throws Exception {
        when(userService.findByUsername("missing")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/appointments/stats/completed-today").with(userPrincipal("missing")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Utilisateur introuvable"))
                .andExpect(jsonPath("$.path").value("/api/appointments/stats/completed-today"));
    }

    private static RequestPostProcessor userPrincipal(String username) {
        return request -> {
            request.setUserPrincipal(() -> username);
            return request;
        };
    }
}
