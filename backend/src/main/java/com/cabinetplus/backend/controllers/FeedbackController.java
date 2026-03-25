package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.FeedbackCreateRequest;
import com.cabinetplus.backend.dto.FeedbackResponse;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.FeedbackService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<FeedbackResponse> create(@Valid @RequestBody FeedbackCreateRequest request, Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(feedbackService.create(request, user));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<FeedbackResponse>> mine(Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(feedbackService.listMine(user));
    }

    private User getUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }
}

