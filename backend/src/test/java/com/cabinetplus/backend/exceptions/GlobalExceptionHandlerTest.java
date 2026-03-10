package com.cabinetplus.backend.exceptions;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders
                .standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .setValidator(validator)
                .build();
    }

    @Test
    void handlesResponseStatusException() throws Exception {
        mockMvc.perform(get("/test/response-status"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict happened"))
                .andExpect(jsonPath("$.path").value("/test/response-status"));
    }

    @Test
    void handlesIllegalArgumentException() throws Exception {
        mockMvc.perform(get("/test/illegal-argument"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Invalid input"))
                .andExpect(jsonPath("$.path").value("/test/illegal-argument"));
    }

    @Test
    void handlesAccessDeniedException() throws Exception {
        mockMvc.perform(get("/test/access-denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Acces refuse"))
                .andExpect(jsonPath("$.path").value("/test/access-denied"));
    }

    @Test
    void handlesRuntimeException() throws Exception {
        mockMvc.perform(get("/test/runtime"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Runtime failure"))
                .andExpect(jsonPath("$.path").value("/test/runtime"));
    }

    @Test
    void handlesUnhandledException() throws Exception {
        mockMvc.perform(get("/test/unhandled"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Une erreur interne est survenue"))
                .andExpect(jsonPath("$.path").value("/test/unhandled"));
    }

    @Test
    void handlesDataIntegrityViolationException() throws Exception {
        mockMvc.perform(get("/test/data-integrity"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Ce nom d'utilisateur est deja utilise"))
                .andExpect(jsonPath("$.path").value("/test/data-integrity"));
    }

    @Test
    void handlesForeignKeyDeleteConflictWithSpecificMessage() throws Exception {
        mockMvc.perform(get("/test/data-integrity-fk"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value(
                        "Suppression impossible: cet element est utilise dans le catalogue des protheses. Supprimez d'abord les donnees liees."))
                .andExpect(jsonPath("$.path").value("/test/data-integrity-fk"));
    }

    @Test
    void handlesValidationErrors() throws Exception {
        mockMvc.perform(post("/test/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Certaines informations sont invalides"))
                .andExpect(jsonPath("$.path").value("/test/validate"))
                .andExpect(jsonPath("$.fieldErrors.name").exists());
    }

    @RestController
    @RequestMapping("/test")
    static class TestController {

        @GetMapping("/response-status")
        String responseStatus() {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Conflict happened");
        }

        @GetMapping("/illegal-argument")
        String illegalArgument() {
            throw new IllegalArgumentException("Invalid input");
        }

        @GetMapping("/access-denied")
        String accessDenied() {
            throw new AccessDeniedException("No permission");
        }

        @GetMapping("/runtime")
        String runtime() {
            throw new RuntimeException("Runtime failure");
        }

        @GetMapping("/unhandled")
        String unhandled() throws Exception {
            throw new Exception("Unhandled");
        }

        @GetMapping("/data-integrity")
        String dataIntegrity() {
            throw new DataIntegrityViolationException(
                    "Duplicate",
                    new RuntimeException("duplicate key username")
            );
        }

        @GetMapping("/data-integrity-fk")
        String dataIntegrityFk() {
            throw new DataIntegrityViolationException(
                    "FK violation",
                    new RuntimeException(
                            "update or delete on table \"materials\" violates foreign key constraint "
                                    + "\"fk_prothesis_catalog_material\" on table \"prothesis_catalog\""
                    )
            );
        }

        @PostMapping("/validate")
        String validate(@Valid @RequestBody ValidationRequest request) {
            return request.name();
        }
    }

    record ValidationRequest(@NotBlank String name) {
    }
}
