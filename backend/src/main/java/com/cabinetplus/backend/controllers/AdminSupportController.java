package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.cabinetplus.backend.dto.SupportMessageCreateRequest;
import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.dto.SupportThreadSummaryResponse;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.SupportMessage;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.SupportService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/support")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSupportController {

    private final SupportService supportService;
    private final UserService userService;

    @GetMapping("/threads")
    public ResponseEntity<List<SupportThreadSummaryResponse>> listThreads(@RequestParam(name = "q", required = false) String q,
                                                                          Principal principal) {
        User admin = requireAdmin(principal);
        return ResponseEntity.ok(supportService.adminListThreads(q, admin));
    }

    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<List<SupportMessageResponse>> getThreadMessages(@PathVariable Long threadId, Principal principal) {
        User admin = requireAdmin(principal);
        return ResponseEntity.ok(supportService.adminGetThreadMessages(threadId, admin));
    }

    @PostMapping("/threads/{threadId}/finish")
    public ResponseEntity<SupportThreadSummaryResponse> finishThread(@PathVariable Long threadId, Principal principal) {
        User admin = requireAdmin(principal);
        return ResponseEntity.ok(supportService.adminFinishThread(threadId, admin));
    }

    @PostMapping("/threads/{threadId}/takeover")
    public ResponseEntity<SupportThreadSummaryResponse> takeOverThread(@PathVariable Long threadId, Principal principal) {
        User admin = requireAdmin(principal);
        return ResponseEntity.ok(supportService.adminTakeoverThread(threadId, admin));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<SupportMessageResponse> sendThreadMessage(@PathVariable Long threadId,
                                                                    @Valid @RequestBody SupportMessageCreateRequest request,
                                                                    Principal principal) {
        User admin = requireAdmin(principal);
        return ResponseEntity.ok(supportService.adminSendMessage(threadId, request, admin));
    }

    @PostMapping(value = "/threads/{threadId}/messages/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SupportMessageResponse> sendThreadImage(@PathVariable Long threadId,
                                                                  @RequestParam("file") MultipartFile file,
                                                                  Principal principal) {
        User admin = requireAdmin(principal);
        return ResponseEntity.ok(supportService.adminSendImageMessage(threadId, file, admin));
    }

    @GetMapping("/messages/{messageId}/attachment")
    public ResponseEntity<byte[]> getMessageAttachment(@PathVariable Long messageId, Principal principal) {
        User admin = requireAdmin(principal);
        SupportMessage message = supportService.requireAdminMessageForAttachment(messageId, admin);
        if (message.getAttachmentPath() == null || message.getAttachmentPath().isBlank()) {
            throw new NotFoundException("Pièce jointe introuvable");
        }
        byte[] bytes = supportService.loadAttachmentBytes(message.getAttachmentPath());
        MediaType mt = message.getAttachmentContentType() != null ? MediaType.parseMediaType(message.getAttachmentContentType()) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentType(mt)
                .body(bytes);
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
