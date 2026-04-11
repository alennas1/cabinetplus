package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.NotificationResponse;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.NotificationService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list(@RequestParam(name = "limit", required = false) Integer limit,
                                                          Principal principal) {
        User user = getUser(principal);
        int l = limit != null ? limit : 20;
        return ResponseEntity.ok(notificationService.listMyNotifications(user, l));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> unreadCount(Principal principal) {
        User user = getUser(principal);
        long count = notificationService.countUnread(user);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable("id") Long id, Principal principal) {
        User user = getUser(principal);
        NotificationResponse res = notificationService.markRead(user, id);
        if (res == null) throw new NotFoundException("Notification introuvable");
        return ResponseEntity.ok(res);
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead(Principal principal) {
        User user = getUser(principal);
        int updated = notificationService.markAllRead(user);
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    private User getUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }
}

