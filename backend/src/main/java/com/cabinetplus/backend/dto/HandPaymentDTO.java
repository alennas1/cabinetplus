package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.PaymentMethod;
import com.cabinetplus.backend.enums.PaymentStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HandPaymentDTO {
    @Null(message = "Champ non autorise")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    @NotNull(message = "Plan obligatoire")
    @Positive(message = "Plan invalide")
    private Long planId;

    @NotNull(message = "Le montant est obligatoire")
    @Positive(message = "Le montant doit etre superieur a 0")
    private Integer amount;

    @Pattern(regexp = "^(?i:MONTHLY|YEARLY)$", message = "Cycle de facturation invalide")
    private String billingCycle; // MONTHLY | YEARLY

    @Null(message = "Champ non autorise")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime paymentDate;

    @Null(message = "Champ non autorise")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private PaymentStatus status;

    @Null(message = "Champ non autorise")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private PaymentMethod paymentMethod;

    @Size(max = 500, message = "Notes trop longues")
    private String notes;

    @NotBlank(message = "Mot de passe requis")
    private String password;
}
