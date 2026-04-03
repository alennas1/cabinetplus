package com.cabinetplus.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.security.EncryptionConverter;
import com.cabinetplus.backend.util.UuidV7;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
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

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String firstname;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptionConverter.class)
    private String lastname;

    private boolean isPhoneVerified = false;

    @ManyToOne
    @JoinColumn(name = "owner_dentist_id")
    private User ownerDentist;

    @Column(length = 20, nullable = false, unique = true)
    private String phoneNumber;

    private LocalDateTime createdAt;

    private boolean canDeleteAdmin = false; // super-admin flag

    // --- OTP cooldown tracking (Twilio Verify) ---
    // These timestamps are used to throttle repeated "send code" requests to avoid spam/Fraud Guard blocks.
    private LocalDateTime phoneVerificationOtpLastSentAt;
    private LocalDateTime passwordResetOtpLastSentAt;
    private LocalDateTime phoneChangeOtpLastSentAt;
    private LocalDateTime loginOtpLastSentAt;

    // --- Optional login 2-step verification (SMS) ---
    private boolean loginTwoFactorEnabled = true;

    // Dentist-only data (split into dedicated tables)
    @JsonIgnore
    @OneToOne(mappedBy = "user", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    private DentistProfile dentistProfile;

    @JsonIgnore
    @OneToOne(mappedBy = "dentist", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    private DentistSubscription dentistSubscription;

    // ===============================
    // Derived accessors (backward-compatible API)
    // ===============================
    private User resolveClinicOwner() {
        User cursor = this;
        int guard = 0;
        while (cursor != null && cursor.getRole() == UserRole.EMPLOYEE && cursor.getOwnerDentist() != null && guard < 5) {
            cursor = cursor.getOwnerDentist();
            guard++;
        }
        return cursor == null ? this : cursor;
    }

    private boolean isOwnerDentist() {
        return role == UserRole.DENTIST && ownerDentist == null;
    }

    private DentistProfile ensureDentistProfile() {
        if (!isOwnerDentist()) return null;
        if (dentistProfile == null) {
            DentistProfile profile = new DentistProfile();
            profile.setUser(this);
            this.dentistProfile = profile;
        }
        return dentistProfile;
    }

    private DentistSubscription ensureDentistSubscription() {
        if (!isOwnerDentist()) return null;
        if (dentistSubscription == null) {
            DentistSubscription subscription = new DentistSubscription();
            subscription.setDentist(this);
            this.dentistSubscription = subscription;
        }
        return dentistSubscription;
    }

    public String getClinicName() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getClinicName();
        return dentistProfile != null ? dentistProfile.getClinicName() : null;
    }

    public void setClinicName(String clinicName) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setClinicName(clinicName);
    }

    public String getAddress() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getAddress();
        return dentistProfile != null ? dentistProfile.getAddress() : null;
    }

    public void setAddress(String address) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setAddress(address);
    }

    public boolean isGestionCabinetPinEnabled() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.isGestionCabinetPinEnabled();
        return dentistProfile != null && dentistProfile.isGestionCabinetPinEnabled();
    }

    public void setGestionCabinetPinEnabled(boolean enabled) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setGestionCabinetPinEnabled(enabled);
    }

    @JsonIgnore
    public String getGestionCabinetPinHash() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getGestionCabinetPinHash();
        return dentistProfile != null ? dentistProfile.getGestionCabinetPinHash() : null;
    }

    public boolean isGestionCabinetPinConfigured() {
        return getGestionCabinetPinHash() != null;
    }

    public void setGestionCabinetPinHash(String hash) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setGestionCabinetPinHash(hash);
    }

    public LocalDateTime getGestionCabinetPinUpdatedAt() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getGestionCabinetPinUpdatedAt();
        return dentistProfile != null ? dentistProfile.getGestionCabinetPinUpdatedAt() : null;
    }

    public void setGestionCabinetPinUpdatedAt(LocalDateTime at) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setGestionCabinetPinUpdatedAt(at);
    }

    public String getWorkingHoursMode() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getWorkingHoursMode();
        return dentistProfile != null ? dentistProfile.getWorkingHoursMode() : "standard";
    }

    public void setWorkingHoursMode(String mode) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setWorkingHoursMode(mode);
    }

    public String getWorkingHoursStart() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getWorkingHoursStart();
        return dentistProfile != null ? dentistProfile.getWorkingHoursStart() : "08:00";
    }

    public void setWorkingHoursStart(String start) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setWorkingHoursStart(start);
    }

    public String getWorkingHoursEnd() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getWorkingHoursEnd();
        return dentistProfile != null ? dentistProfile.getWorkingHoursEnd() : "17:00";
    }

    public void setWorkingHoursEnd(String end) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setWorkingHoursEnd(end);
    }

    public String getTimeFormat() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getTimeFormat();
        return dentistProfile != null ? dentistProfile.getTimeFormat() : "24h";
    }

    public void setTimeFormat(String format) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setTimeFormat(format);
    }

    public String getDateFormat() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getDateFormat();
        return dentistProfile != null ? dentistProfile.getDateFormat() : "dd/mm/yyyy";
    }

    public void setDateFormat(String format) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setDateFormat(format);
    }

    public String getMoneyFormat() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getMoneyFormat();
        return dentistProfile != null ? dentistProfile.getMoneyFormat() : "space";
    }

    public void setMoneyFormat(String format) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setMoneyFormat(format);
    }

    public String getCurrencyLabel() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getCurrencyLabel();
        return dentistProfile != null ? dentistProfile.getCurrencyLabel() : "DA";
    }

    public void setCurrencyLabel(String label) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setCurrencyLabel(label);
    }

    public Integer getPatientCancelledAppointmentsThreshold() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getPatientCancelledAppointmentsThreshold();
        return dentistProfile != null ? dentistProfile.getPatientCancelledAppointmentsThreshold() : 0;
    }

    public void setPatientCancelledAppointmentsThreshold(Integer threshold) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setPatientCancelledAppointmentsThreshold(threshold);
    }

    public Double getPatientMoneyOwedThreshold() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getPatientMoneyOwedThreshold();
        return dentistProfile != null ? dentistProfile.getPatientMoneyOwedThreshold() : 0.0;
    }

    public void setPatientMoneyOwedThreshold(Double threshold) {
        DentistProfile profile = ensureDentistProfile();
        if (profile != null) profile.setPatientMoneyOwedThreshold(threshold);
    }

    @PrePersist
    private void ensurePublicId() {
        if (publicId == null) {
            publicId = UuidV7.randomUuidV7();
        }
    }

    // --- Subscription fields (dentist-only; inherited by employees) ---
    public Plan getPlan() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getPlan();
        return dentistSubscription != null ? dentistSubscription.getPlan() : null;
    }

    public void setPlan(Plan plan) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setPlan(plan);
    }

    public com.cabinetplus.backend.enums.BillingCycle getPlanBillingCycle() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getPlanBillingCycle();
        return dentistSubscription != null ? dentistSubscription.getPlanBillingCycle() : null;
    }

    public void setPlanBillingCycle(com.cabinetplus.backend.enums.BillingCycle cycle) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setPlanBillingCycle(cycle);
    }

    public Plan getNextPlan() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getNextPlan();
        return dentistSubscription != null ? dentistSubscription.getNextPlan() : null;
    }

    public void setNextPlan(Plan plan) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setNextPlan(plan);
    }

    public com.cabinetplus.backend.enums.BillingCycle getNextPlanBillingCycle() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getNextPlanBillingCycle();
        return dentistSubscription != null ? dentistSubscription.getNextPlanBillingCycle() : null;
    }

    public void setNextPlanBillingCycle(com.cabinetplus.backend.enums.BillingCycle cycle) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setNextPlanBillingCycle(cycle);
    }

    public LocalDateTime getNextPlanStartDate() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getNextPlanStartDate();
        return dentistSubscription != null ? dentistSubscription.getNextPlanStartDate() : null;
    }

    public void setNextPlanStartDate(LocalDateTime at) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setNextPlanStartDate(at);
    }

    public LocalDateTime getNextPlanExpirationDate() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getNextPlanExpirationDate();
        return dentistSubscription != null ? dentistSubscription.getNextPlanExpirationDate() : null;
    }

    public void setNextPlanExpirationDate(LocalDateTime at) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setNextPlanExpirationDate(at);
    }

    public LocalDateTime getPlanStartDate() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getPlanStartDate();
        return dentistSubscription != null ? dentistSubscription.getPlanStartDate() : null;
    }

    public void setPlanStartDate(LocalDateTime at) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setPlanStartDate(at);
    }

    public LocalDateTime getExpirationDate() {
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getExpirationDate();
        return dentistSubscription != null ? dentistSubscription.getExpirationDate() : null;
    }

    public void setExpirationDate(LocalDateTime at) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setExpirationDate(at);
    }

    public com.cabinetplus.backend.enums.UserPlanStatus getPlanStatus() {
        if (role == UserRole.ADMIN) return com.cabinetplus.backend.enums.UserPlanStatus.ACTIVE;
        User owner = resolveClinicOwner();
        if (owner != this) return owner.getPlanStatus();
        return dentistSubscription != null && dentistSubscription.getPlanStatus() != null
                ? dentistSubscription.getPlanStatus()
                : com.cabinetplus.backend.enums.UserPlanStatus.PENDING;
    }

    public void setPlanStatus(com.cabinetplus.backend.enums.UserPlanStatus status) {
        DentistSubscription subscription = ensureDentistSubscription();
        if (subscription != null) subscription.setPlanStatus(status);
    }
}
