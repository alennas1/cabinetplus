package com.cabinetplus.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Null;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateItemDTO {
    @NotNull(message = "Article par defaut obligatoire")
    @Positive(message = "Article par defaut invalide")
    private Long itemDefaultId;

    @NotNull(message = "La quantite est obligatoire")
    @Min(value = 1, message = "La quantite doit etre superieure a 0")
    private Integer quantity;

    @NotNull(message = "Le prix unitaire est obligatoire")
    @Positive(message = "Le prix unitaire doit etre superieur a 0")
    private Double unitPrice;

    @Null(message = "Champ non autorise")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Double price;
    private LocalDate expiryDate;

    @Null(message = "Champ non autorise")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime createdAt;    
}
