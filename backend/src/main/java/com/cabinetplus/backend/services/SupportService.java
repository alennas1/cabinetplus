package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.dto.SupportMessageCreateRequest;
import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.dto.SupportThreadSummaryResponse;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.SupportMessage;
import com.cabinetplus.backend.models.SupportThread;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.SupportMessageRepository;
import com.cabinetplus.backend.repositories.SupportThreadRepository;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SupportService {

    private final SupportThreadRepository threadRepository;
    private final SupportMessageRepository messageRepository;
    private final UserService userService;
    private final SupportAttachmentStorageService attachmentStorageService;

    @Transactional
    public List<SupportThreadSummaryResponse> listMyThreads(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread kept = keepOnlyLatestThread(clinicOwner);
        if (kept == null) return List.of();
        return List.of(toSummary(kept, false));
    }

    @Transactional
    public SupportThreadSummaryResponse createMyThread(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread kept = keepOnlyLatestThread(clinicOwner);
        if (kept != null) return toSummary(kept, false);

        SupportThread thread = new SupportThread();
        thread.setClinicOwner(clinicOwner);
        thread.setCreatedAt(LocalDateTime.now());
        thread.setUpdatedAt(LocalDateTime.now());
        SupportThread saved = threadRepository.save(thread);
        return toSummary(saved, false);
    }

    @Transactional
    public void markAllMyThreadsRead(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        LocalDateTime now = LocalDateTime.now();
        SupportThread kept = keepOnlyLatestThread(clinicOwner);
        if (kept == null) return;
        kept.setClinicLastReadAt(now);
        kept.setUpdatedAt(now);
        threadRepository.save(kept);
    }

    @Transactional
    public List<SupportMessageResponse> getMyThreadMessages(Long threadId, User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));
        if (thread.getClinicOwner() == null || thread.getClinicOwner().getId() == null
                || clinicOwner.getId() == null || !thread.getClinicOwner().getId().equals(clinicOwner.getId())) {
            throw new NotFoundException("Conversation introuvable");
        }

        thread.setClinicLastReadAt(LocalDateTime.now());
        thread.setUpdatedAt(LocalDateTime.now());
        threadRepository.save(thread);

        return messageRepository.findByThreadIdOrderByCreatedAtAsc(thread.getId()).stream()
                .map(m -> toResponse(m, thread, false))
                .toList();
    }

    // Backward-compatible: returns messages for the latest thread (if any)
    @Transactional
    public List<SupportMessageResponse> getMyMessages(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread kept = keepOnlyLatestThread(clinicOwner);
        if (kept == null) return List.of();
        return getMyThreadMessages(kept.getId(), actor);
    }

    @Transactional
    public SupportMessageResponse sendMyMessage(Long threadId, SupportMessageCreateRequest request, User actor) {
        String content = request != null ? request.content() : null;
        content = content != null ? content.trim() : null;
        if (content == null || content.isBlank()) {
            throw new BadRequestException(java.util.Map.of("content", "Message obligatoire"));
        }

        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread thread;
        if (threadId == null) {
            thread = keepOnlyLatestThread(clinicOwner);
            if (thread == null) {
                thread = new SupportThread();
                thread.setClinicOwner(clinicOwner);
                thread.setCreatedAt(LocalDateTime.now());
                thread.setUpdatedAt(LocalDateTime.now());
                thread = threadRepository.save(thread);
            }
        } else {
            thread = threadRepository.findById(threadId)
                    .orElseThrow(() -> new NotFoundException("Conversation introuvable"));
            if (thread.getClinicOwner() == null || thread.getClinicOwner().getId() == null
                    || clinicOwner.getId() == null || !thread.getClinicOwner().getId().equals(clinicOwner.getId())) {
                throw new NotFoundException("Conversation introuvable");
            }
        }

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(actor);
        message.setContent(content);
        message.setCreatedAt(LocalDateTime.now());

        SupportMessage saved = messageRepository.save(message);

        thread.setUpdatedAt(LocalDateTime.now());
        if (thread.getFirstMessageAt() == null) {
            thread.setFirstMessageAt(saved.getCreatedAt());
        }
        if (thread.getFirstMessagePreview() == null || thread.getFirstMessagePreview().isBlank()) {
            thread.setFirstMessagePreview(truncatePreview(content));
        }
        thread.setLastMessageAt(saved.getCreatedAt());
        thread.setLastMessagePreview(truncatePreview(content));
        thread.setClinicLastReadAt(LocalDateTime.now());
        threadRepository.save(thread);

        return toResponse(saved, thread, false);
    }

    private SupportThread keepOnlyLatestThread(User clinicOwner) {
        if (clinicOwner == null || clinicOwner.getId() == null) return null;

        List<SupportThread> threads = threadRepository.findByClinicOwnerOrderByLastMessageAtDescUpdatedAtDescIdDesc(clinicOwner);
        if (threads == null || threads.isEmpty()) return null;

        SupportThread kept = threads.get(0);
        if (threads.size() <= 1) return kept;

        List<SupportThread> extras = threads.subList(1, threads.size());
        for (SupportThread t : extras) {
            try {
                if (t != null && t.getId() != null) attachmentStorageService.deleteThreadFolder(t.getId());
            } catch (Exception ignored) {
                // ignore
            }
        }
        threadRepository.deleteAll(extras);
        return kept;
    }

    @Transactional
    public SupportMessageResponse sendMyImageMessage(Long threadId, MultipartFile file, User actor) {
        if (threadId == null) {
            throw new BadRequestException(java.util.Map.of("threadId", "Conversation obligatoire"));
        }

        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));
        if (thread.getClinicOwner() == null || thread.getClinicOwner().getId() == null
                || clinicOwner.getId() == null || !thread.getClinicOwner().getId().equals(clinicOwner.getId())) {
            throw new NotFoundException("Conversation introuvable");
        }

        SupportAttachmentStorageService.StoredAttachment stored = attachmentStorageService.storeThreadImage(threadId, file);

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(actor);
        message.setContent("");
        message.setAttachmentPath(stored.path());
        message.setAttachmentContentType(stored.contentType());
        message.setAttachmentOriginalName(stored.originalName());
        message.setAttachmentSize(stored.size());
        message.setCreatedAt(LocalDateTime.now());
        SupportMessage saved = messageRepository.save(message);

        thread.setUpdatedAt(LocalDateTime.now());
        if (thread.getFirstMessageAt() == null) {
            thread.setFirstMessageAt(saved.getCreatedAt());
        }
        if (thread.getFirstMessagePreview() == null || thread.getFirstMessagePreview().isBlank()) {
            thread.setFirstMessagePreview("Image");
        }
        thread.setLastMessageAt(saved.getCreatedAt());
        thread.setLastMessagePreview("Image");
        thread.setClinicLastReadAt(LocalDateTime.now());
        threadRepository.save(thread);

        return toResponse(saved, thread, false);
    }

    // Backward-compatible: send message to latest thread (or creates a new one)
    @Transactional
    public SupportMessageResponse sendMyMessage(SupportMessageCreateRequest request, User actor) {
        return sendMyMessage(null, request, actor);
    }

    @Transactional
    public SupportMessageResponse adminSendMessage(Long threadId, SupportMessageCreateRequest request, User admin) {
        if (admin == null || admin.getRole() != UserRole.ADMIN) {
            throw new NotFoundException("Utilisateur introuvable");
        }

        String content = request != null ? request.content() : null;
        content = content != null ? content.trim() : null;
        if (content == null || content.isBlank()) {
            throw new BadRequestException(java.util.Map.of("content", "Message obligatoire"));
        }

        SupportThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(admin);
        message.setContent(content);
        message.setCreatedAt(LocalDateTime.now());
        SupportMessage saved = messageRepository.save(message);

        thread.setUpdatedAt(LocalDateTime.now());
        if (thread.getFirstMessageAt() == null) {
            thread.setFirstMessageAt(saved.getCreatedAt());
        }
        if (thread.getFirstMessagePreview() == null || thread.getFirstMessagePreview().isBlank()) {
            thread.setFirstMessagePreview(truncatePreview(content));
        }
        thread.setLastMessageAt(saved.getCreatedAt());
        thread.setLastMessagePreview(truncatePreview(content));
        thread.setAdminLastReadAt(LocalDateTime.now());
        threadRepository.save(thread);

        return toResponse(saved, thread, true);
    }

    @Transactional
    public SupportMessageResponse adminSendImageMessage(Long threadId, MultipartFile file, User admin) {
        if (admin == null || admin.getRole() != UserRole.ADMIN) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        if (threadId == null) {
            throw new BadRequestException(java.util.Map.of("threadId", "Conversation obligatoire"));
        }

        SupportThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        SupportAttachmentStorageService.StoredAttachment stored = attachmentStorageService.storeThreadImage(threadId, file);

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(admin);
        message.setContent("");
        message.setAttachmentPath(stored.path());
        message.setAttachmentContentType(stored.contentType());
        message.setAttachmentOriginalName(stored.originalName());
        message.setAttachmentSize(stored.size());
        message.setCreatedAt(LocalDateTime.now());
        SupportMessage saved = messageRepository.save(message);

        thread.setUpdatedAt(LocalDateTime.now());
        if (thread.getFirstMessageAt() == null) {
            thread.setFirstMessageAt(saved.getCreatedAt());
        }
        if (thread.getFirstMessagePreview() == null || thread.getFirstMessagePreview().isBlank()) {
            thread.setFirstMessagePreview("Image");
        }
        thread.setLastMessageAt(saved.getCreatedAt());
        thread.setLastMessagePreview("Image");
        thread.setAdminLastReadAt(LocalDateTime.now());
        threadRepository.save(thread);

        return toResponse(saved, thread, true);
    }

    @Transactional(readOnly = true)
    public SupportMessage requireMyMessageForAttachment(Long messageId, User actor) {
        if (messageId == null) throw new NotFoundException("Message introuvable");
        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message introuvable"));
        SupportThread thread = message.getThread();
        if (thread == null || thread.getClinicOwner() == null || thread.getClinicOwner().getId() == null
                || clinicOwner.getId() == null || !thread.getClinicOwner().getId().equals(clinicOwner.getId())) {
            throw new NotFoundException("Message introuvable");
        }
        return message;
    }

    @Transactional(readOnly = true)
    public SupportMessage requireAdminMessageForAttachment(Long messageId, User admin) {
        if (admin == null || admin.getRole() != UserRole.ADMIN) {
            throw new NotFoundException("Utilisateur introuvable");
        }
        if (messageId == null) throw new NotFoundException("Message introuvable");
        return messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message introuvable"));
    }

    public byte[] loadAttachmentBytes(String storedPath) {
        try {
            return attachmentStorageService.loadBytes(storedPath);
        } catch (java.io.IOException ex) {
            throw new NotFoundException("Pièce jointe introuvable");
        }
    }

    public List<SupportThreadSummaryResponse> adminListThreads(String query) {
        String q = query != null ? query.trim().toLowerCase() : "";
        List<SupportThread> threads = threadRepository.findAllByOrderByLastMessageAtDescUpdatedAtDescIdDesc();
        return threads.stream()
                .filter(t -> {
                    if (q.isEmpty()) return true;
                    User owner = t.getClinicOwner();
                    String phone = owner != null ? String.valueOf(owner.getPhoneNumber()) : "";
                    String clinicName = owner != null ? nullToEmpty(owner.getClinicName()) : "";
                    String name = owner != null ? (nullToEmpty(owner.getFirstname()) + " " + nullToEmpty(owner.getLastname())).trim() : "";
                    return phone.toLowerCase().contains(q)
                             || clinicName.toLowerCase().contains(q)
                             || name.toLowerCase().contains(q);
                })
                .map(t -> toSummary(t, true))
                .toList();
    }

    @Transactional
    public List<SupportMessageResponse> adminGetThreadMessages(Long threadId) {
        SupportThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        thread.setAdminLastReadAt(LocalDateTime.now());
        thread.setUpdatedAt(LocalDateTime.now());
        threadRepository.save(thread);

        return messageRepository.findByThreadIdOrderByCreatedAtAsc(thread.getId()).stream()
                .map(m -> toResponse(m, thread, true))
                .toList();
    }

    private SupportThreadSummaryResponse toSummary(SupportThread thread, boolean viewerIsAdmin) {
        User owner = thread.getClinicOwner();
        String ownerName = owner != null ? (nullToEmpty(owner.getFirstname()) + " " + nullToEmpty(owner.getLastname())).trim() : "";
        String clinicName = owner != null ? owner.getClinicName() : null;
        String phone = owner != null ? owner.getPhoneNumber() : null;

        SupportMessage lastClinicMessage = thread != null && thread.getId() != null
                ? messageRepository.findFirstByThreadIdAndSender_RoleNotOrderByCreatedAtDesc(thread.getId(), UserRole.ADMIN)
                : null;
        User lastClinicSender = lastClinicMessage != null ? lastClinicMessage.getSender() : null;
        String lastClinicSenderName = lastClinicSender != null
                ? (nullToEmpty(lastClinicSender.getFirstname()) + " " + nullToEmpty(lastClinicSender.getLastname())).trim()
                : "";
        long unreadCount = countUnreadForViewer(thread, viewerIsAdmin);
        return new SupportThreadSummaryResponse(
                thread.getId(),
                owner != null ? owner.getId() : null,
                ownerName.isBlank() ? null : ownerName,
                clinicName,
                phone,
                thread.getCreatedAt(),
                thread.getFirstMessagePreview(),
                thread.getFirstMessageAt(),
                thread.getLastMessagePreview(),
                thread.getLastMessageAt(),
                unreadCount,
                lastClinicSender != null ? lastClinicSender.getId() : null,
                lastClinicSender != null && lastClinicSender.getRole() != null ? lastClinicSender.getRole().name() : null,
                lastClinicSenderName.isBlank() ? null : lastClinicSenderName,
                lastClinicSender != null ? lastClinicSender.getPhoneNumber() : null
        );
    }

    private long countUnreadForViewer(SupportThread thread, boolean viewerIsAdmin) {
        if (thread == null || thread.getId() == null) return 0L;
        UserRole roleToCount = viewerIsAdmin ? UserRole.DENTIST : UserRole.ADMIN;
        LocalDateTime lastReadAt = viewerIsAdmin ? thread.getAdminLastReadAt() : thread.getClinicLastReadAt();
        if (lastReadAt == null) {
            return messageRepository.countByThreadIdAndSender_Role(thread.getId(), roleToCount);
        }
        return messageRepository.countByThreadIdAndSender_RoleAndCreatedAtAfter(thread.getId(), roleToCount, lastReadAt);
    }

    private SupportMessageResponse toResponse(SupportMessage message, SupportThread thread, boolean viewerIsAdmin) {
        User sender = message.getSender();
        String senderName = sender != null
                ? (nullToEmpty(sender.getFirstname()) + " " + nullToEmpty(sender.getLastname())).trim()
                : "";

        boolean isAdminSender = sender != null && sender.getRole() == UserRole.ADMIN;
        boolean isMine = viewerIsAdmin ? isAdminSender : !isAdminSender;
        LocalDateTime otherLastReadAt = viewerIsAdmin ? thread.getClinicLastReadAt() : thread.getAdminLastReadAt();
        boolean readByOther = false;
        if (isMine && otherLastReadAt != null && message.getCreatedAt() != null) {
            readByOther = !message.getCreatedAt().isAfter(otherLastReadAt);
        }

        String attachmentUrl = null;
        if (message.getAttachmentPath() != null && !message.getAttachmentPath().isBlank() && message.getId() != null) {
            attachmentUrl = viewerIsAdmin
                    ? ("/api/admin/support/messages/" + message.getId() + "/attachment")
                    : ("/api/support/messages/" + message.getId() + "/attachment");
        }

        return new SupportMessageResponse(
                message.getId(),
                message.getThread() != null ? message.getThread().getId() : null,
                sender != null ? sender.getId() : null,
                sender != null && sender.getRole() != null ? sender.getRole().name() : null,
                senderName.isBlank() ? null : senderName,
                message.getContent(),
                message.getCreatedAt(),
                readByOther,
                attachmentUrl,
                message.getAttachmentContentType(),
                message.getAttachmentOriginalName()
        );
    }

    private String truncatePreview(String text) {
        if (text == null) return null;
        String t = text.trim().replaceAll("\\s+", " ");
        if (t.length() <= 120) return t;
        return t.substring(0, 120);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
