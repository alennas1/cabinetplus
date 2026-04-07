package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.MessagingContactResponse;
import com.cabinetplus.backend.dto.MessagingMessageCreateRequest;
import com.cabinetplus.backend.dto.MessagingMessageResponse;
import com.cabinetplus.backend.dto.MessagingThreadSummaryResponse;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.MessagingService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/messaging")
@RequiredArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;
    private final UserService userService;

    @GetMapping("/contacts")
    public ResponseEntity<List<MessagingContactResponse>> contacts(Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(messagingService.listContacts(user));
    }

    @GetMapping("/threads")
    public ResponseEntity<List<MessagingThreadSummaryResponse>> threads(Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(messagingService.listMyThreads(user));
    }

    @PostMapping("/threads/with/{publicId}")
    public ResponseEntity<MessagingThreadSummaryResponse> ensureThread(@PathVariable String publicId, Principal principal) {
        User user = getUser(principal);
        UUID id;
        try {
            id = UUID.fromString(publicId != null ? publicId.trim() : "");
        } catch (Exception e) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        return ResponseEntity.ok(messagingService.ensureThreadWith(id, user));
    }

    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<List<MessagingMessageResponse>> messages(@PathVariable Long threadId, Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(messagingService.getThreadMessages(threadId, user));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<MessagingMessageResponse> sendMessage(@PathVariable Long threadId,
                                                                @Valid @RequestBody MessagingMessageCreateRequest request,
                                                                Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(messagingService.sendMessage(threadId, request, user));
    }

    private User getUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }
}

