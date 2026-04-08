package com.cabinetplus.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cabinetplus.backend.models.PushSubscription;
import com.cabinetplus.backend.models.User;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    Optional<PushSubscription> findByUserAndEndpoint(User user, String endpoint);
    List<PushSubscription> findAllByUser(User user);
    long deleteByUserAndEndpoint(User user, String endpoint);
}

