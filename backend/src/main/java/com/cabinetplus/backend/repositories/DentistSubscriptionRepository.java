package com.cabinetplus.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.DentistSubscription;

public interface DentistSubscriptionRepository extends JpaRepository<DentistSubscription, Long> {
}

