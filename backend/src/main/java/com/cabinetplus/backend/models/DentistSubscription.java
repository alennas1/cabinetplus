package com.cabinetplus.backend.models;

import java.time.LocalDateTime;

import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "dentist_subscriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DentistSubscription {

    @Id
    @Column(name = "dentist_user_id")
    private Long dentistUserId;

    @JsonIgnore
    @OneToOne
    @MapsId
    @JoinColumn(name = "dentist_user_id")
    private User dentist;

    @ManyToOne
    @JoinColumn(name = "plan_id")
    private Plan plan;

    @Enumerated(EnumType.STRING)
    private BillingCycle planBillingCycle;

    private LocalDateTime planStartDate;
    private LocalDateTime expirationDate;

    @Enumerated(EnumType.STRING)
    private UserPlanStatus planStatus = UserPlanStatus.PENDING;

    @ManyToOne
    @JoinColumn(name = "next_plan_id")
    private Plan nextPlan;

    @Enumerated(EnumType.STRING)
    private BillingCycle nextPlanBillingCycle;

    private LocalDateTime nextPlanStartDate;
    private LocalDateTime nextPlanExpirationDate;
}

