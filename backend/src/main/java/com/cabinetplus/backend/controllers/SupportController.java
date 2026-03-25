package com.cabinetplus.backend.controllers;

import java.security.Principal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestParam;

import com.cabinetplus.backend.dto.SupportMessageCreateRequest;
import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.dto.SupportThreadSummaryResponse;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.SupportMessage;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.SupportService;
import com.cabinetplus.backend.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;
    private final UserService userService;

    @GetMapping("/messages")
    public ResponseEntity<List<SupportMessageResponse>> getMyMessages(Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(supportService.getMyMessages(user));
    }

    @PostMapping("/messages")
    public ResponseEntity<SupportMessageResponse> sendMyMessage(@Valid @RequestBody SupportMessageCreateRequest request,
                                                                Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(supportService.sendMyMessage(request, user));
    }

    @GetMapping("/threads")
    public ResponseEntity<List<SupportThreadSummaryResponse>> listThreads(Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(supportService.listMyThreads(user));
    }

    @PostMapping("/threads")
    public ResponseEntity<SupportThreadSummaryResponse> createThread(Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(supportService.createMyThread(user));
    }

    @PostMapping("/threads/mark-read")
    public ResponseEntity<Void> markAllThreadsRead(Principal principal) {
        User user = getUser(principal);
        supportService.markAllMyThreadsRead(user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<List<SupportMessageResponse>> getThreadMessages(@PathVariable Long threadId, Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(supportService.getMyThreadMessages(threadId, user));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<SupportMessageResponse> sendThreadMessage(@PathVariable Long threadId,
                                                                    @Valid @RequestBody SupportMessageCreateRequest request,
                                                                    Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(supportService.sendMyMessage(threadId, request, user));
    }

    @PostMapping(value = "/threads/{threadId}/messages/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SupportMessageResponse> sendThreadImage(@PathVariable Long threadId,
                                                                  @RequestParam("file") MultipartFile file,
                                                                  Principal principal) {
        User user = getUser(principal);
        return ResponseEntity.ok(supportService.sendMyImageMessage(threadId, file, user));
    }

    @GetMapping("/messages/{messageId}/attachment")
    public ResponseEntity<byte[]> getMessageAttachment(@PathVariable Long messageId, Principal principal) {
        User user = getUser(principal);
        SupportMessage message = supportService.requireMyMessageForAttachment(messageId, user);
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

    private User getUser(Principal principal) {
        return userService.findByPhoneNumber(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }
}
