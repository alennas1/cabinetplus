package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.dto.PushSubscriptionUpsertRequest;
import com.cabinetplus.backend.models.PushSubscription;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.PushSubscriptionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PushSubscriptionService {

    private final PushSubscriptionRepository repository;

    @Transactional
    public PushSubscription upsert(User user, PushSubscriptionUpsertRequest request) {
        if (user == null || user.getId() == null) return null;
        if (request == null || request.endpoint() == null || request.endpoint().isBlank()) return null;
        if (request.keys() == null) return null;

        String endpoint = request.endpoint().trim();
        LocalDateTime now = LocalDateTime.now();

        PushSubscription sub = repository.findByUserAndEndpoint(user, endpoint).orElseGet(PushSubscription::new);
        boolean isNew = sub.getId() == null;
        sub.setUser(user);
        sub.setEndpoint(endpoint);
        sub.setP256dh(request.keys().p256dh().trim());
        sub.setAuth(request.keys().auth().trim());
        if (isNew && sub.getCreatedAt() == null) sub.setCreatedAt(now);
        sub.setUpdatedAt(now);
        return repository.save(sub);
    }

    @Transactional(readOnly = true)
    public List<PushSubscription> list(User user) {
        if (user == null || user.getId() == null) return List.of();
        return repository.findAllByUser(user);
    }

    @Transactional
    public void delete(User user, String endpoint) {
        if (user == null || user.getId() == null) return;
        String ep = endpoint != null ? endpoint.trim() : "";
        if (ep.isBlank()) return;
        repository.deleteByUserAndEndpoint(user, ep);
    }

    @Transactional
    public void deleteByUserAndEndpoint(User user, String endpoint) {
        delete(user, endpoint);
    }
}

