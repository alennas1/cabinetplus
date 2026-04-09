package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cabinetplus.backend.dto.SupportMessageCreateRequest;
import com.cabinetplus.backend.dto.SupportMessageResponse;
import com.cabinetplus.backend.dto.SupportThreadSummaryResponse;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.SupportMessageKind;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.events.SupportClaimUpdatedEvent;
import com.cabinetplus.backend.events.SupportMessageCreatedEvent;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.SupportMessage;
import com.cabinetplus.backend.models.SupportThread;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.SupportMessageRepository;
import com.cabinetplus.backend.repositories.SupportThreadRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.websocket.MessagingWebSocketHandler;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SupportService {

    private static final long PRESENCE_ONLINE_WINDOW_SECONDS = 60L;

    private final SupportThreadRepository threadRepository;
    private final SupportMessageRepository messageRepository;
    private final UserService userService;
    private final SupportAttachmentStorageService attachmentStorageService;
    private final UserRepository userRepository;
    private final LaboratoryRepository laboratoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MessagingWebSocketHandler messagingWebSocketHandler;

    @Transactional
    public List<SupportThreadSummaryResponse> listMyThreads(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread kept = keepOnlyLatestThreadForRequester(clinicOwner, actor);
        if (kept == null) return List.of();
        return List.of(toSummary(kept, false));
    }

    @Transactional
    public SupportThreadSummaryResponse createMyThread(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        SupportThread kept = keepOnlyLatestThreadForRequester(clinicOwner, actor);
        if (kept != null) return toSummary(kept, false);

        SupportThread thread = new SupportThread();
        thread.setClinicOwner(clinicOwner);
        thread.setRequester(actor);
        thread.setCreatedAt(LocalDateTime.now());
        thread.setUpdatedAt(LocalDateTime.now());
        SupportThread saved = threadRepository.save(thread);
        return toSummary(saved, false);
    }

    @Transactional
    public void markAllMyThreadsRead(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        LocalDateTime now = LocalDateTime.now();
        SupportThread kept = keepOnlyLatestThreadForRequester(clinicOwner, actor);
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
        if (thread.getRequester() == null || thread.getRequester().getId() == null
                || actor == null || actor.getId() == null || !thread.getRequester().getId().equals(actor.getId())) {
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
        SupportThread kept = keepOnlyLatestThreadForRequester(clinicOwner, actor);
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
            thread = keepOnlyLatestThreadForRequester(clinicOwner, actor);
            if (thread == null) {
                thread = new SupportThread();
                thread.setClinicOwner(clinicOwner);
                thread.setRequester(actor);
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
            if (thread.getRequester() == null || thread.getRequester().getId() == null
                    || actor == null || actor.getId() == null || !thread.getRequester().getId().equals(actor.getId())) {
                throw new NotFoundException("Conversation introuvable");
            }
        }

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(actor);
        message.setKind(SupportMessageKind.MESSAGE);
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

        SupportMessageResponse out = toResponse(saved, thread, false);
        publishSupportMessageCreated(thread, saved);
        return out;
    }

    private SupportThread keepOnlyLatestThreadForRequester(User clinicOwner, User requester) {
        if (clinicOwner == null || clinicOwner.getId() == null) return null;
        if (requester == null || requester.getId() == null) return null;

        List<SupportThread> threads = threadRepository.findByClinicOwnerAndRequesterOrderByLastMessageAtDescUpdatedAtDescIdDesc(clinicOwner, requester);
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
        if (thread.getRequester() == null || thread.getRequester().getId() == null
                || actor == null || actor.getId() == null || !thread.getRequester().getId().equals(actor.getId())) {
            throw new NotFoundException("Conversation introuvable");
        }

        SupportAttachmentStorageService.StoredAttachment stored = attachmentStorageService.storeThreadImage(threadId, file);

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(actor);
        message.setKind(SupportMessageKind.MESSAGE);
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

        SupportMessageResponse out = toResponse(saved, thread, false);
        publishSupportMessageCreated(thread, saved);
        return out;
    }

    // Backward-compatible: send message to latest thread (or creates a new one)
    @Transactional
    public SupportMessageResponse sendMyMessage(SupportMessageCreateRequest request, User actor) {
        return sendMyMessage(null, request, actor);
    }

    @Transactional
    public SupportMessageResponse adminSendMessage(Long threadId, SupportMessageCreateRequest request, User admin) {
        requireAdminUser(admin);

        String content = request != null ? request.content() : null;
        content = content != null ? content.trim() : null;
        if (content == null || content.isBlank()) {
            throw new BadRequestException(java.util.Map.of("content", "Message obligatoire"));
        }

        SupportThread thread = threadRepository.findByIdForUpdate(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        ensureAdminCanSend(thread, admin);

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(admin);
        message.setKind(SupportMessageKind.MESSAGE);
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

        SupportMessageResponse out = toResponse(saved, thread, true);
        publishSupportMessageCreated(thread, saved);
        return out;
    }

    @Transactional
    public SupportMessageResponse adminSendImageMessage(Long threadId, MultipartFile file, User admin) {
        requireAdminUser(admin);
        if (threadId == null) {
            throw new BadRequestException(java.util.Map.of("threadId", "Conversation obligatoire"));
        }

        SupportThread thread = threadRepository.findByIdForUpdate(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        ensureAdminCanSend(thread, admin);

        SupportAttachmentStorageService.StoredAttachment stored = attachmentStorageService.storeThreadImage(threadId, file);

        SupportMessage message = new SupportMessage();
        message.setThread(thread);
        message.setSender(admin);
        message.setKind(SupportMessageKind.MESSAGE);
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

        SupportMessageResponse out = toResponse(saved, thread, true);
        publishSupportMessageCreated(thread, saved);
        return out;
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
        if (thread.getRequester() == null || thread.getRequester().getId() == null
                || actor == null || actor.getId() == null || !thread.getRequester().getId().equals(actor.getId())) {
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

    public List<SupportThreadSummaryResponse> adminListThreads(String query, User admin) {
        requireAdminUser(admin);
        String q = query != null ? query.trim().toLowerCase() : "";
        List<SupportThread> threads = threadRepository.findAllByOrderByLastMessageAtDescUpdatedAtDescIdDesc();
        return threads.stream()
                .filter(t -> {
                    if (isSuperAdmin(admin)) return true;
                    User claimed = t != null ? t.getClaimedByAdmin() : null;
                    if (claimed == null) return true;
                    if (claimed.getId() == null || admin.getId() == null) return false;
                    return claimed.getId().equals(admin.getId());
                })
                .filter(t -> {
                    if (q.isEmpty()) return true;
                    User owner = t.getClinicOwner();
                    User requester = t.getRequester();
                    String phone = owner != null ? String.valueOf(owner.getPhoneNumber()) : "";
                    String clinicName = owner != null ? nullToEmpty(owner.getClinicName()) : "";
                    String name = owner != null ? (nullToEmpty(owner.getFirstname()) + " " + nullToEmpty(owner.getLastname())).trim() : "";
                    String requesterPhone = requester != null ? String.valueOf(requester.getPhoneNumber()) : "";
                    String requesterName = requester != null ? (nullToEmpty(requester.getFirstname()) + " " + nullToEmpty(requester.getLastname())).trim() : "";
                    String requesterRole = requester != null && requester.getRole() != null ? requester.getRole().name() : "";
                    return phone.toLowerCase().contains(q)
                             || clinicName.toLowerCase().contains(q)
                             || name.toLowerCase().contains(q)
                             || requesterPhone.toLowerCase().contains(q)
                             || requesterName.toLowerCase().contains(q)
                             || requesterRole.toLowerCase().contains(q);
                })
                .map(t -> toSummary(t, true))
                .toList();
    }

    @Transactional
    public List<SupportMessageResponse> adminGetThreadMessages(Long threadId, User admin) {
        requireAdminUser(admin);

        SupportThread thread = threadRepository.findByIdForUpdate(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        maybeClaimThread(thread, admin);

        LocalDateTime now = LocalDateTime.now();
        thread.setAdminLastReadAt(now);
        thread.setUpdatedAt(now);
        threadRepository.save(thread);

        return messageRepository.findByThreadIdOrderByCreatedAtAsc(thread.getId()).stream()
                .map(m -> toResponse(m, thread, true))
                .toList();
    }

    @Transactional
    public SupportThreadSummaryResponse adminFinishThread(Long threadId, User admin) {
        requireAdminUser(admin);

        SupportThread thread = threadRepository.findByIdForUpdate(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        User claimedBy = thread.getClaimedByAdmin();
        if (claimedBy == null) {
            return toSummary(thread, true);
        }

        boolean same = claimedBy.getId() != null && admin.getId() != null && claimedBy.getId().equals(admin.getId());
        if (!same && !isSuperAdmin(admin)) {
            throw new BadRequestException("Cette conversation est d\u00e9j\u00e0 prise en charge par un autre admin");
        }

        LocalDateTime now = LocalDateTime.now();
        thread.setFinishedAt(now);
        thread.setClaimedAt(null);
        thread.setClaimedByAdmin(null);
        thread.setUpdatedAt(now);
        threadRepository.save(thread);

        publishClaimUpdated(thread, null);
        return toSummary(thread, true);
    }

    @Transactional
    public SupportThreadSummaryResponse adminTakeoverThread(Long threadId, User admin) {
        requireAdminUser(admin);
        if (!isSuperAdmin(admin)) {
            throw new BadRequestException("Seul le super admin peut reprendre une conversation");
        }

        SupportThread thread = threadRepository.findByIdForUpdate(threadId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable"));

        LocalDateTime now = LocalDateTime.now();
        boolean alreadyMine = thread.getClaimedByAdmin() != null
                && thread.getClaimedByAdmin().getId() != null
                && admin.getId() != null
                && thread.getClaimedByAdmin().getId().equals(admin.getId());

        if (!alreadyMine) {
            claimThread(thread, admin, now, true);
        }

        return toSummary(thread, true);
    }

    private void requireAdminUser(User admin) {
        if (admin == null || admin.getRole() != UserRole.ADMIN) {
            throw new NotFoundException("Utilisateur introuvable");
        }
    }

    private boolean isSuperAdmin(User admin) {
        return admin != null && admin.getRole() == UserRole.ADMIN && admin.isCanDeleteAdmin();
    }

    private void ensureAdminCanSend(SupportThread thread, User admin) {
        if (thread == null) throw new NotFoundException("Conversation introuvable");
        User claimed = thread.getClaimedByAdmin();
        if (claimed == null) {
            claimThread(thread, admin, LocalDateTime.now(), true);
            return;
        }
        boolean same = claimed.getId() != null && admin.getId() != null && claimed.getId().equals(admin.getId());
        if (same) return;

        if (isSuperAdmin(admin)) {
            throw new BadRequestException("Conversation d\u00e9j\u00e0 prise en charge. Utilisez \u00ab Take over \u00bb pour r\u00e9pondre.");
        }
        String byName = (nullToEmpty(claimed.getFirstname()) + " " + nullToEmpty(claimed.getLastname())).trim();
        throw new BadRequestException(byName.isBlank()
                ? "Conversation d\u00e9j\u00e0 prise en charge par un autre admin"
                : ("Conversation d\u00e9j\u00e0 prise en charge par " + byName));
    }

    private void maybeClaimThread(SupportThread thread, User admin) {
        if (thread == null) throw new NotFoundException("Conversation introuvable");

        User claimed = thread.getClaimedByAdmin();
        if (claimed == null) {
            claimThread(thread, admin, LocalDateTime.now(), true);
            return;
        }

        boolean same = claimed.getId() != null && admin.getId() != null && claimed.getId().equals(admin.getId());
        if (same) return;

        if (isSuperAdmin(admin)) return; // super admin can view without taking over

        String byName = (nullToEmpty(claimed.getFirstname()) + " " + nullToEmpty(claimed.getLastname())).trim();
        throw new BadRequestException(byName.isBlank()
                ? "Conversation d\u00e9j\u00e0 prise en charge par un autre admin"
                : ("Conversation d\u00e9j\u00e0 prise en charge par " + byName));
    }

    private void claimThread(SupportThread thread, User admin, LocalDateTime now, boolean addSystemMessage) {
        thread.setClaimedByAdmin(admin);
        thread.setClaimedAt(now);
        thread.setFinishedAt(null);
        threadRepository.save(thread);

        SupportMessage system = null;
        if (addSystemMessage) {
            String adminName = (nullToEmpty(admin.getFirstname()) + " " + nullToEmpty(admin.getLastname())).trim();
            String content = adminName.isBlank()
                    ? "Un admin a rejoint la conversation"
                    : (adminName + " a rejoint la conversation");
            system = new SupportMessage();
            system.setThread(thread);
            system.setSender(admin);
            system.setKind(SupportMessageKind.SYSTEM);
            system.setContent(content);
            system.setCreatedAt(now);
            system = messageRepository.save(system);
        }

        publishClaimUpdated(thread, system);
    }

    private void publishSupportMessageCreated(SupportThread thread, SupportMessage saved) {
        try {
            if (thread == null || thread.getId() == null || saved == null || saved.getId() == null) return;

            SupportThreadSummaryResponse clinicThread = toSummary(thread, false);
            SupportThreadSummaryResponse adminThread = toSummary(thread, true);
            SupportMessageResponse clinicMessage = toResponse(saved, thread, false);
            SupportMessageResponse adminMessage = toResponse(saved, thread, true);

            List<String> clinicPhones = resolveClinicPhones(thread);
            List<String> adminPhones = resolveAdminPhones();
            List<String> adminPhonesWithMessage = resolveAdminPhonesWithMessage(thread, saved);

            eventPublisher.publishEvent(new SupportMessageCreatedEvent(
                    thread.getId(),
                    clinicPhones,
                    adminPhones,
                    adminPhonesWithMessage,
                    clinicThread,
                    adminThread,
                    clinicMessage,
                    adminMessage
            ));
        } catch (Exception ignored) {
            // ignore realtime failures
        }
    }

    private void publishClaimUpdated(SupportThread thread, SupportMessage systemMessage) {
        try {
            if (thread == null || thread.getId() == null) return;

            SupportThreadSummaryResponse clinicThread = toSummary(thread, false);
            SupportThreadSummaryResponse adminThread = toSummary(thread, true);
            SupportMessageResponse clinicMessage = systemMessage != null ? toResponse(systemMessage, thread, false) : null;
            SupportMessageResponse adminMessage = systemMessage != null ? toResponse(systemMessage, thread, true) : null;

            eventPublisher.publishEvent(new SupportClaimUpdatedEvent(
                    thread.getId(),
                    resolveClinicPhones(thread),
                    resolveAdminPhones(),
                    clinicThread,
                    adminThread,
                    clinicMessage,
                    adminMessage
            ));
        } catch (Exception ignored) {
            // ignore realtime failures
        }
    }

    private List<String> resolveAdminPhones() {
        return userRepository.findByRole(UserRole.ADMIN).stream()
                .map(User::getPhoneNumber)
                .filter(v -> v != null && !v.isBlank())
                .distinct()
                .toList();
    }

    private List<String> resolveClinicPhones(SupportThread thread) {
        if (thread == null) return List.of();
        User owner = thread.getClinicOwner();
        if (owner == null) return List.of();

        Set<String> phones = new java.util.HashSet<>();
        if (owner.getPhoneNumber() != null && !owner.getPhoneNumber().isBlank()) {
            phones.add(owner.getPhoneNumber());
        }

        if (owner.getRole() == UserRole.DENTIST) {
            userRepository.findByOwnerDentist(owner).stream()
                    .map(User::getPhoneNumber)
                    .filter(v -> v != null && !v.isBlank())
                    .forEach(phones::add);
        }

        return phones.stream().toList();
    }

    private List<String> resolveAdminPhonesWithMessage(SupportThread thread, SupportMessage message) {
        Set<String> phones = new java.util.HashSet<>();
        if (thread != null && thread.getClaimedByAdmin() != null) {
            String p = thread.getClaimedByAdmin().getPhoneNumber();
            if (p != null && !p.isBlank()) phones.add(p);
        }

        userRepository.findByRole(UserRole.ADMIN).stream()
                .filter(User::isCanDeleteAdmin)
                .map(User::getPhoneNumber)
                .filter(v -> v != null && !v.isBlank())
                .forEach(phones::add);

        if (message != null && message.getSender() != null) {
            String p = message.getSender().getPhoneNumber();
            if (p != null && !p.isBlank()) phones.add(p);
        }

        return phones.stream().toList();
    }

    private SupportThreadSummaryResponse toSummary(SupportThread thread, boolean viewerIsAdmin) {
        User owner = thread.getClinicOwner();
        String ownerName = owner != null ? (nullToEmpty(owner.getFirstname()) + " " + nullToEmpty(owner.getLastname())).trim() : "";
        String labName = resolveLabName(owner);
        if (ownerName.isBlank() && labName != null && !labName.isBlank()) ownerName = labName;
        String clinicName = owner != null ? owner.getClinicName() : null;
        if ((clinicName == null || clinicName.isBlank()) && labName != null && !labName.isBlank()) clinicName = labName;
        String phone = owner != null ? owner.getPhoneNumber() : null;
        String ownerRole = owner != null && owner.getRole() != null ? owner.getRole().name() : null;

        User requester = thread.getRequester();
        String requesterName = requester != null
                ? (nullToEmpty(requester.getFirstname()) + " " + nullToEmpty(requester.getLastname())).trim()
                : "";
        if (requesterName.isBlank()) {
            String requesterLabName = resolveLabName(requester);
            if (requesterLabName != null && !requesterLabName.isBlank()) requesterName = requesterLabName;
        }
        String requesterRole = requester != null && requester.getRole() != null ? requester.getRole().name() : null;

        SupportMessage lastClinicMessage = thread != null && thread.getId() != null
                ? messageRepository.findFirstByThreadIdAndSender_RoleNotOrderByCreatedAtDesc(thread.getId(), UserRole.ADMIN)
                : null;
        User lastClinicSender = lastClinicMessage != null ? lastClinicMessage.getSender() : null;
        String lastClinicSenderName = lastClinicSender != null
                ? (nullToEmpty(lastClinicSender.getFirstname()) + " " + nullToEmpty(lastClinicSender.getLastname())).trim()
                : "";
        if (lastClinicSenderName.isBlank()) {
            String senderLabName = resolveLabName(lastClinicSender);
            if (senderLabName != null && !senderLabName.isBlank()) lastClinicSenderName = senderLabName;
        }

        User claimedAdmin = thread != null ? thread.getClaimedByAdmin() : null;
        String claimedAdminName = claimedAdmin != null
                ? (nullToEmpty(claimedAdmin.getFirstname()) + " " + nullToEmpty(claimedAdmin.getLastname())).trim()
                : "";

        SupportMessage lastMessage = thread != null && thread.getId() != null
                ? messageRepository.findFirstByThreadIdAndKindOrderByCreatedAtDescIdDesc(thread.getId(), SupportMessageKind.MESSAGE)
                : null;
        User lastSender = lastMessage != null ? lastMessage.getSender() : null;
        String lastSenderRole = lastSender != null && lastSender.getRole() != null ? lastSender.getRole().name() : null;

        LocalDateTime ownerLastSeenAt = owner != null ? owner.getMessagingLastSeenAt() : null;
        boolean ownerOnline = owner != null
                && (messagingWebSocketHandler.isOnlineForDisplay(owner.getPhoneNumber()) || isRecentlySeen(ownerLastSeenAt));

        LocalDateTime lastClinicSenderLastSeenAt = lastClinicSender != null ? lastClinicSender.getMessagingLastSeenAt() : null;
        boolean lastClinicSenderOnline = lastClinicSender != null
                && (messagingWebSocketHandler.isOnlineForDisplay(lastClinicSender.getPhoneNumber()) || isRecentlySeen(lastClinicSenderLastSeenAt));

        long unreadCount = countUnreadForViewer(thread, viewerIsAdmin);
        return new SupportThreadSummaryResponse(
                thread.getId(),
                owner != null ? owner.getId() : null,
                ownerName.isBlank() ? null : ownerName,
                clinicName,
                phone,
                ownerRole,
                thread.getCreatedAt(),
                thread.getFirstMessagePreview(),
                thread.getFirstMessageAt(),
                thread.getLastMessagePreview(),
                thread.getLastMessageAt(),
                lastSenderRole,
                unreadCount,
                lastClinicSender != null ? lastClinicSender.getId() : null,
                lastClinicSender != null && lastClinicSender.getRole() != null ? lastClinicSender.getRole().name() : null,
                lastClinicSenderName.isBlank() ? null : lastClinicSenderName,
                lastClinicSender != null ? lastClinicSender.getPhoneNumber() : null,
                claimedAdmin != null ? claimedAdmin.getId() : null,
                claimedAdmin != null ? claimedAdmin.getPublicId() : null,
                claimedAdminName.isBlank() ? null : claimedAdminName,
                thread.getClaimedAt(),
                thread.getFinishedAt(),
                ownerOnline,
                ownerLastSeenAt,
                lastClinicSenderOnline,
                lastClinicSenderLastSeenAt,
                requester != null ? requester.getId() : null,
                requesterName.isBlank() ? null : requesterName,
                requesterRole
        );
    }

    private boolean isRecentlySeen(LocalDateTime at) {
        if (at == null) return false;
        try {
            long seconds = Math.abs(Duration.between(at, LocalDateTime.now()).getSeconds());
            return seconds < PRESENCE_ONLINE_WINDOW_SECONDS;
        } catch (Exception ignored) {
            return false;
        }
    }

    private long countUnreadForViewer(SupportThread thread, boolean viewerIsAdmin) {
        if (thread == null || thread.getId() == null) return 0L;
        LocalDateTime lastReadAt = viewerIsAdmin ? thread.getAdminLastReadAt() : thread.getClinicLastReadAt();
        if (lastReadAt == null) {
            return viewerIsAdmin
                    ? messageRepository.countByThreadIdAndSender_RoleNotAndKind(thread.getId(), UserRole.ADMIN, SupportMessageKind.MESSAGE)
                    : messageRepository.countByThreadIdAndSender_RoleAndKind(thread.getId(), UserRole.ADMIN, SupportMessageKind.MESSAGE);
        }
        return viewerIsAdmin
                ? messageRepository.countByThreadIdAndSender_RoleNotAndKindAndCreatedAtAfter(thread.getId(), UserRole.ADMIN, SupportMessageKind.MESSAGE, lastReadAt)
                : messageRepository.countByThreadIdAndSender_RoleAndKindAndCreatedAtAfter(thread.getId(), UserRole.ADMIN, SupportMessageKind.MESSAGE, lastReadAt);
    }

    private SupportMessageResponse toResponse(SupportMessage message, SupportThread thread, boolean viewerIsAdmin) {
        User sender = message.getSender();
        String senderName = sender != null
                ? (nullToEmpty(sender.getFirstname()) + " " + nullToEmpty(sender.getLastname())).trim()
                : "";
        if (senderName.isBlank()) {
            String senderLabName = resolveLabName(sender);
            if (senderLabName != null && !senderLabName.isBlank()) senderName = senderLabName;
        }

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
                message.getAttachmentOriginalName(),
                message.getKind() != null ? message.getKind().name() : SupportMessageKind.MESSAGE.name()
        );
    }

    private String truncatePreview(String text) {
        if (text == null) return null;
        String t = text.trim().replaceAll("\\s+", " ");
        if (t.length() <= 120) return t;
        return t.substring(0, 120);
    }

    private String resolveLabName(User user) {
        if (user == null || user.getRole() != UserRole.LAB) return null;
        try {
            Laboratory lab = laboratoryRepository
                    .findFirstByCreatedByAndArchivedAtIsNullAndRecordStatusOrderByIdAsc(user, RecordStatus.ACTIVE)
                    .orElse(null);
            if (lab != null && lab.getName() != null && !lab.getName().isBlank()) {
                return lab.getName().trim();
            }
        } catch (Exception ignored) {
            // ignore
        }
        return null;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
