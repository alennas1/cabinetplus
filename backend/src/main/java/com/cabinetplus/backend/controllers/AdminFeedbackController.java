package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.FeedbackResponse;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.FeedbackService;
import com.cabinetplus.backend.services.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/feedback")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminFeedbackController {

    private final FeedbackService feedbackService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<FeedbackResponse>> listAll(Principal principal) {
        requireAdmin(principal);
        return ResponseEntity.ok(feedbackService.adminListAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeedbackResponse> getById(@PathVariable Long id, Principal principal) {
        requireAdmin(principal);
        return ResponseEntity.ok(feedbackService.adminGetById(id));
    }

    private User requireAdmin(Principal principal) {
        User user = userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        if (user.getRole() != UserRole.ADMIN) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        return user;
    }
}
