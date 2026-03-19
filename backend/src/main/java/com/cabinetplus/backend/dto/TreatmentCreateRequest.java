package com.cabinetplus.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.cabinetplus.backend.validation.UniqueIntegers;
import com.fasterxml.jackson.annotation.JsonSetter;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class TreatmentCreateRequest {

    @NotNull(message = "Patient obligatoire")
    @Positive(message = "Patient invalide")
    private Long patientId;

    @NotNull(message = "Traitement obligatoire")
    @Positive(message = "Traitement invalide")
    private Long treatmentCatalogId;

    @NotNull(message = "Prix obligatoire")
    @Positive(message = "Prix invalide")
    private Double price;

    @NotNull(message = "Date obligatoire")
    private LocalDateTime date;

    @Size(max = 500, message = "Les notes ne doivent pas depasser 500 caracteres")
    private String notes;

    @Pattern(regexp = "^(PLANNED|IN_PROGRESS|DONE|CANCELLED)$", message = "Statut invalide")
    private String status;

    @Size(max = 32, message = "Dents invalides")
    @UniqueIntegers(message = "Les dents doivent etre uniques")
    private List<
            @NotNull(message = "Dent invalide")
            @Min(value = 1, message = "Dent invalide")
            @Max(value = 32, message = "Dent invalide")
            Integer> teeth;

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public Long getTreatmentCatalogId() {
        return treatmentCatalogId;
    }

    public void setTreatmentCatalogId(Long treatmentCatalogId) {
        this.treatmentCatalogId = treatmentCatalogId;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public void setDate(LocalDateTime date) {
        this.date = date;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<Integer> getTeeth() {
        return teeth;
    }

    public void setTeeth(List<Integer> teeth) {
        this.teeth = teeth;
    }

    @JsonSetter("patient")
    public void setPatient(@Valid IdRef patient) {
        if (this.patientId == null && patient != null) {
            this.patientId = patient.id();
        }
    }

    @JsonSetter("treatmentCatalog")
    public void setTreatmentCatalog(@Valid IdRef treatmentCatalog) {
        if (this.treatmentCatalogId == null && treatmentCatalog != null) {
            this.treatmentCatalogId = treatmentCatalog.id();
        }
    }

    public record IdRef(
            @NotNull(message = "Id invalide")
            @Positive(message = "Id invalide")
            Long id
    ) {
    }
}
