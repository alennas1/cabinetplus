package com.cabinetplus.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ErrorEnvelopeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthorizedReturnsEnvelope() throws Exception {
        mockMvc.perform(get("/api/patients"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.fieldErrors._").exists());
    }

    @Test
    @WithMockUser(username = "dentist", roles = "DENTIST")
    void forbiddenReturnsEnvelope() throws Exception {
        mockMvc.perform(get("/api/hand-payments/all"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.fieldErrors._").exists());
    }

    @Test
    @WithMockUser(username = "dentist", roles = "DENTIST")
    void notFoundRouteReturnsEnvelope() throws Exception {
        mockMvc.perform(get("/definitely-not-a-route"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.fieldErrors._").value("Route introuvable"));
    }

    @Test
    @WithMockUser(username = "dentist", roles = "DENTIST")
    void malformedJsonReturnsEnvelope() throws Exception {
        mockMvc.perform(post("/api/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors._").exists());
    }

    @Test
    @WithMockUser(username = "dentist", roles = "DENTIST")
    void unknownFieldReturnsEnvelope() throws Exception {
        mockMvc.perform(post("/api/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstname":"Ali",
                                  "lastname":"Ben",
                                  "sex":"Homme",
                                  "phone":"0550000000",
                                  "unknownField":"nope"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.unknownField").value("Champ non supporte"));
    }
}
