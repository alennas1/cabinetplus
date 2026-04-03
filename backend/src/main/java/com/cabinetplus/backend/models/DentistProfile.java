package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import com.cabinetplus.backend.security.EncryptionConverter;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "dentist_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DentistProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @JsonIgnore
    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String clinicName;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String address;

    private boolean gestionCabinetPinEnabled = false;

    @JsonIgnore
    @Column(length = 100)
    private String gestionCabinetPinHash;

    private LocalDateTime gestionCabinetPinUpdatedAt;

    @Column(length = 20)
    private String workingHoursMode = "standard";

    @Column(length = 5)
    private String workingHoursStart = "08:00";

    @Column(length = 5)
    private String workingHoursEnd = "17:00";

    @Column(length = 10)
    private String timeFormat = "24h";

    @Column(length = 20)
    private String dateFormat = "dd/mm/yyyy";

    @Column(length = 20)
    private String moneyFormat = "space";

    @Column(length = 5)
    private String currencyLabel = "DA";

    private Integer patientCancelledAppointmentsThreshold = 0;

    private Double patientMoneyOwedThreshold = 0.0;
}

