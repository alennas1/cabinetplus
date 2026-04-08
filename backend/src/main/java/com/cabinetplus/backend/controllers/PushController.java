package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.PushSubscriptionUpsertRequest;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.PushSubscriptionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.services.WebPushService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {

    private final WebPushService webPushService;
    private final PushSubscriptionService pushSubscriptionService;
    private final UserService userService;

    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> vapidPublicKey() {
        String key = webPushService.isEnabled() ? webPushService.getPublicKey() : "";
        return ResponseEntity.ok(Map.of("publicKey", key != null ? key : ""));
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<Map<String, Object>> upsert(@Valid @RequestBody PushSubscriptionUpsertRequest request, Principal principal) {
        User user = getUser(principal);
        var saved = pushSubscriptionService.upsert(user, request);
        return ResponseEntity.ok(Map.of("ok", true, "id", saved != null ? saved.getId() : null));
    }

    @DeleteMapping("/subscriptions")
    public ResponseEntity<Map<String, Object>> delete(@RequestParam("endpoint") String endpoint, Principal principal) {
        User user = getUser(principal);
        pushSubscriptionService.delete(user, endpoint);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private User getUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }
}

