package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.security.EncryptionConverter;
import com.cabinetplus.backend.util.UuidV7;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @JsonIgnore
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    private ClinicAccessRole clinicAccessRole = ClinicAccessRole.DENTIST;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String firstname;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String lastname;

    private boolean isPhoneVerified = false;

    @ManyToOne
    @JoinColumn(name = "plan_id")
    private Plan plan;

    @Enumerated(EnumType.STRING)
    private BillingCycle planBillingCycle;

    @ManyToOne
    @JoinColumn(name = "next_plan_id")
    private Plan nextPlan;

    @Enumerated(EnumType.STRING)
    private BillingCycle nextPlanBillingCycle;

    private LocalDateTime nextPlanStartDate;
    private LocalDateTime nextPlanExpirationDate;

    @ManyToOne
    @JoinColumn(name = "owner_dentist_id")
    private User ownerDentist;

    @Enumerated(EnumType.STRING)
    private UserPlanStatus planStatus = UserPlanStatus.PENDING;

    @Column(length = 20, nullable = false, unique = true)
    private String phoneNumber;

    private LocalDateTime createdAt;
    private LocalDateTime planStartDate;
    private LocalDateTime expirationDate;

    private boolean canDeleteAdmin = false; // super-admin flag

    // --- NEW OPTIONAL CLINIC FIELDS ---
    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String clinicName;
    
    @Column(columnDefinition = "TEXT") // TEXT allows for longer addresses
    @Convert(converter = EncryptionConverter.class)
    private String address;

    // --- Gestion Cabinet PIN (optional) ---
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

    // --- Patient management thresholds (0 = disabled) ---
    private Integer patientCancelledAppointmentsThreshold = 0;

    private Double patientMoneyOwedThreshold = 0.0;

    // --- OTP cooldown tracking (Twilio Verify) ---
    // These timestamps are used to throttle repeated "send code" requests to avoid spam/Fraud Guard blocks.
    private LocalDateTime phoneVerificationOtpLastSentAt;
    private LocalDateTime passwordResetOtpLastSentAt;
    private LocalDateTime phoneChangeOtpLastSentAt;
    private LocalDateTime loginOtpLastSentAt;

    // --- Optional login 2-step verification (SMS) ---
    private boolean loginTwoFactorEnabled = true;

    @PrePersist
    private void ensurePublicId() {
        if (publicId == null) {
            publicId = UuidV7.randomUuidV7();
        }
    }
}
