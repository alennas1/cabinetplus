package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.MessagingContactResponse;
import com.cabinetplus.backend.dto.MessagingMessageCreateRequest;
import com.cabinetplus.backend.dto.MessagingMessageResponse;
import com.cabinetplus.backend.dto.MessagingThreadSummaryResponse;
import com.cabinetplus.backend.enums.LaboratoryConnectionStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.LaboratoryConnection;
import com.cabinetplus.backend.models.MessagingMessage;
import com.cabinetplus.backend.models.MessagingThread;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.LaboratoryConnectionRepository;
import com.cabinetplus.backend.repositories.LaboratoryRepository;
import com.cabinetplus.backend.repositories.MessagingMessageRepository;
import com.cabinetplus.backend.repositories.MessagingThreadRepository;
import com.cabinetplus.backend.repositories.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessagingService {

    private static final String PERM_EMPLOYEE_MESSAGE_LABS = "LABORATORIES_MESSAGE";
    private static final String PERM_EMPLOYEE_MESSAGE_LABS_LEGACY = "MESSAGING_LABS";

    private final MessagingThreadRepository threadRepository;
    private final MessagingMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final LaboratoryRepository laboratoryRepository;
    private final LaboratoryConnectionRepository laboratoryConnectionRepository;
    private final LaboratoryAccessService laboratoryAccessService;

    @Transactional(readOnly = true)
    public List<MessagingContactResponse> listContacts(User actor) {
        if (actor == null || actor.getRole() == null) return List.of();

        if (actor.getRole() == UserRole.LAB) {
            return listLabContacts(actor);
        }
        return listClinicContacts(actor);
    }

    @Transactional(readOnly = true)
    public List<MessagingThreadSummaryResponse> listMyThreads(User actor) {
        if (actor == null) return List.of();
        List<MessagingThread> threads = threadRepository.findMyThreads(actor);
        return threads.stream()
                .filter(t -> canMessage(actor, resolveOtherParticipant(t, actor)))
                .map(t -> toSummary(t, actor))
                .toList();
    }

    @Transactional
    public MessagingThreadSummaryResponse ensureThreadWith(UUID otherUserPublicId, User actor) {
        if (otherUserPublicId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Utilisateur obligatoire");
        }
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable");
        }

        User other = userRepository.findByPublicId(otherUserPublicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        requireCanMessage(actor, other);

        MessagingThread thread = findOrCreateThread(actor, other);
        return toSummary(thread, actor);
    }

    @Transactional
    public List<MessagingMessageResponse> getThreadMessages(Long threadId, User actor) {
        MessagingThread thread = requireThreadForViewer(threadId, actor);

        markRead(thread, actor);
        threadRepository.save(thread);

        LocalDateTime otherLastReadAt = otherLastReadAt(thread, actor);
        List<MessagingMessage> messages = messageRepository.findByThreadIdOrderByCreatedAtAsc(thread.getId());
        return messages.stream().map(m -> toResponse(m, thread, actor, otherLastReadAt)).toList();
    }

    @Transactional
    public MessagingMessageResponse sendMessage(Long threadId, MessagingMessageCreateRequest request, User actor) {
        MessagingThread thread = requireThreadForViewer(threadId, actor);
        String content = request != null ? request.content() : null;
        content = content != null ? content.trim() : null;
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message obligatoire");
        }

        MessagingMessage message = new MessagingMessage();
        message.setThread(thread);
        message.setSender(actor);
        message.setContent(content);
        message.setCreatedAt(LocalDateTime.now());
        MessagingMessage saved = messageRepository.save(message);

        thread.setUpdatedAt(LocalDateTime.now());
        if (thread.getFirstMessageAt() == null) {
            thread.setFirstMessageAt(saved.getCreatedAt());
        }
        thread.setLastMessageAt(saved.getCreatedAt());
        thread.setLastMessagePreview(truncatePreview(content));
        setLastReadAtFor(thread, actor, LocalDateTime.now());
        threadRepository.save(thread);

        LocalDateTime otherLastReadAt = otherLastReadAt(thread, actor);
        return toResponse(saved, thread, actor, otherLastReadAt);
    }

    private List<MessagingContactResponse> listClinicContacts(User actor) {
        User clinicOwner = userService.resolveClinicOwner(actor);
        boolean isStaff = actor.getRole() == UserRole.EMPLOYEE || actor.getOwnerDentist() != null;
        List<MessagingContactResponse> out = new ArrayList<>();

        if (clinicOwner == null) return List.of();

        if (isStaff) {
            if (clinicOwner.getId() != null && actor.getId() != null && !clinicOwner.getId().equals(actor.getId())) {
                out.add(toContact(clinicOwner, "Dentiste", null, null));
            }
            List<User> employees = userRepository.findByOwnerDentist(clinicOwner).stream()
                    .filter(u -> u != null && u.getId() != null && (actor.getId() == null || !u.getId().equals(actor.getId())))
                    .filter(User::isAccountSetupCompleted)
                    .toList();
            for (User u : employees) {
                out.add(toContact(u, "Employé", employeeMeta(clinicOwner), clinicOwner.getId()));
            }

            if (employeeCanMessageLabs(actor)) {
                appendAcceptedLabs(out, clinicOwner);
            }
            out.sort(Comparator.comparing(MessagingContactResponse::name, String.CASE_INSENSITIVE_ORDER));
            return out;
        }

        // Owner dentist
        List<User> employees = userRepository.findByOwnerDentist(clinicOwner).stream()
                .filter(User::isAccountSetupCompleted)
                .toList();
        for (User u : employees) {
            out.add(toContact(u, "Employé", employeeMeta(clinicOwner), clinicOwner.getId()));
        }

        appendAcceptedLabs(out, clinicOwner);

        out.sort(Comparator.comparing(MessagingContactResponse::name, String.CASE_INSENSITIVE_ORDER));
        return out;
    }

    private List<MessagingContactResponse> listLabContacts(User labUser) {
        Laboratory lab = laboratoryAccessService.requireMyLab(labUser);
        List<LaboratoryConnection> accepted = laboratoryConnectionRepository.findByLaboratoryAndStatusOrderByDentist_LastnameAsc(
                lab,
                LaboratoryConnectionStatus.ACCEPTED
        );
        List<MessagingContactResponse> out = new ArrayList<>();
        java.util.Set<UUID> seen = new java.util.HashSet<>();
        for (LaboratoryConnection c : accepted) {
            User dentist = c != null ? c.getDentist() : null;
            if (dentist == null || dentist.getPublicId() == null) continue;
            if (seen.add(dentist.getPublicId())) {
                out.add(new MessagingContactResponse(dentist.getPublicId(), dentist.getId(), fullName(dentist), "DENTIST", "Dentiste", null, null));
            }

            // Employees of connected dentists that are allowed to message labs.
            List<User> employees = userRepository.findByOwnerDentist(dentist).stream()
                    .filter(User::isAccountSetupCompleted)
                    .filter(this::employeeCanMessageLabs)
                    .toList();
            for (User emp : employees) {
                if (emp == null || emp.getPublicId() == null) continue;
                if (!seen.add(emp.getPublicId())) continue;
                out.add(new MessagingContactResponse(emp.getPublicId(), emp.getId(), fullName(emp), "EMPLOYEE", "Employé", employeeMeta(dentist), dentist.getId()));
            }
        }
        out.sort(Comparator.comparing(MessagingContactResponse::name, String.CASE_INSENSITIVE_ORDER));
        return out;
    }

    private MessagingContactResponse toContact(User user, String badge, String meta, Long ownerDentistId) {
        if (user == null) return null;
        return new MessagingContactResponse(
                user.getPublicId(),
                user.getId(),
                fullName(user),
                user.getRole() != null ? user.getRole().name() : null,
                badge,
                meta,
                ownerDentistId
        );
    }

    private MessagingThread findOrCreateThread(User a, User b) {
        if (a == null || b == null || a.getId() == null || b.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Utilisateur invalide");
        }
        if (a.getId().equals(b.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conversation invalide");
        }

        User ordered1 = a;
        User ordered2 = b;
        if (ordered1.getId() > ordered2.getId()) {
            ordered1 = b;
            ordered2 = a;
        }
        final User user1 = ordered1;
        final User user2 = ordered2;

        return threadRepository.findByUser1AndUser2(user1, user2)
                .orElseGet(() -> {
                    MessagingThread t = new MessagingThread();
                    t.setUser1(user1);
                    t.setUser2(user2);
                    t.setCreatedAt(LocalDateTime.now());
                    t.setUpdatedAt(LocalDateTime.now());
                    return threadRepository.save(t);
                });
    }

    private MessagingThread requireThreadForViewer(Long threadId, User actor) {
        if (threadId == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable");
        if (actor == null || actor.getId() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable");
        MessagingThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable"));
        if (!isParticipant(thread, actor)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable");
        }
        // Enforce current permission rules (so revoking access hides and blocks old threads too).
        requireCanMessage(actor, resolveOtherParticipant(thread, actor));
        return thread;
    }

    private boolean isParticipant(MessagingThread thread, User actor) {
        if (thread == null || actor == null || actor.getId() == null) return false;
        User u1 = thread.getUser1();
        User u2 = thread.getUser2();
        return (u1 != null && u1.getId() != null && u1.getId().equals(actor.getId()))
                || (u2 != null && u2.getId() != null && u2.getId().equals(actor.getId()));
    }

    private void markRead(MessagingThread thread, User actor) {
        if (thread == null || actor == null) return;
        LocalDateTime now = LocalDateTime.now();
        setLastReadAtFor(thread, actor, now);
        thread.setUpdatedAt(now);
    }

    private void setLastReadAtFor(MessagingThread thread, User actor, LocalDateTime at) {
        if (thread == null || actor == null || actor.getId() == null) return;
        if (thread.getUser1() != null && actor.getId().equals(thread.getUser1().getId())) {
            thread.setUser1LastReadAt(at);
        } else if (thread.getUser2() != null && actor.getId().equals(thread.getUser2().getId())) {
            thread.setUser2LastReadAt(at);
        }
    }

    private LocalDateTime otherLastReadAt(MessagingThread thread, User actor) {
        if (thread == null || actor == null || actor.getId() == null) return null;
        if (thread.getUser1() != null && actor.getId().equals(thread.getUser1().getId())) {
            return thread.getUser2LastReadAt();
        }
        return thread.getUser1LastReadAt();
    }

    private MessagingThreadSummaryResponse toSummary(MessagingThread thread, User viewer) {
        if (thread == null || viewer == null || viewer.getId() == null) return null;
        User other = resolveOtherParticipant(thread, viewer);
        String otherBadge = otherBadgeLabel(other);
        String otherName = otherDisplayName(other);
        Long otherOwnerDentistId = null;
        if (other != null && other.getRole() == UserRole.EMPLOYEE) {
            User owner = userService.resolveClinicOwner(other);
            otherOwnerDentistId = owner != null ? owner.getId() : null;
        }

        long unread;
        LocalDateTime lastRead = null;
        if (thread.getUser1() != null && viewer.getId().equals(thread.getUser1().getId())) {
            lastRead = thread.getUser1LastReadAt();
        } else if (thread.getUser2() != null && viewer.getId().equals(thread.getUser2().getId())) {
            lastRead = thread.getUser2LastReadAt();
        }

        if (lastRead == null) {
            unread = messageRepository.countByThreadIdAndSenderNot(thread.getId(), viewer);
        } else {
            unread = messageRepository.countByThreadIdAndSenderNotAndCreatedAtAfter(thread.getId(), viewer, lastRead);
        }

        return new MessagingThreadSummaryResponse(
                thread.getId(),
                other != null ? other.getPublicId() : null,
                other != null ? other.getId() : null,
                otherName,
                other != null && other.getRole() != null ? other.getRole().name() : null,
                otherBadge,
                otherOwnerDentistId,
                thread.getLastMessagePreview(),
                thread.getLastMessageAt(),
                unread
        );
    }

    private User resolveOtherParticipant(MessagingThread thread, User viewer) {
        if (thread == null || viewer == null || viewer.getId() == null) return null;
        User u1 = thread.getUser1();
        User u2 = thread.getUser2();
        if (u1 != null && u1.getId() != null && u1.getId().equals(viewer.getId())) return u2;
        return u1;
    }

    private MessagingMessageResponse toResponse(MessagingMessage message, MessagingThread thread, User viewer, LocalDateTime otherLastReadAt) {
        if (message == null) return null;
        User sender = message.getSender();
        boolean isMine = sender != null && viewer != null && viewer.getId() != null && sender.getId() != null && sender.getId().equals(viewer.getId());
        boolean readByOther = false;
        if (isMine && otherLastReadAt != null && message.getCreatedAt() != null) {
            readByOther = !message.getCreatedAt().isAfter(otherLastReadAt);
        }
        String badge = otherBadgeLabel(sender);
        return new MessagingMessageResponse(
                message.getId(),
                thread != null ? thread.getId() : null,
                sender != null ? sender.getPublicId() : null,
                sender != null && sender.getRole() != null ? sender.getRole().name() : null,
                fullName(sender),
                badge,
                message.getContent(),
                message.getCreatedAt(),
                readByOther
        );
    }

    private void requireCanMessage(User actor, User other) {
        if (actor == null || other == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable");
        if (actor.getId() != null && other.getId() != null && actor.getId().equals(other.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conversation invalide");
        }
        if (actor.getRole() == null || other.getRole() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        if (actor.getRole() == UserRole.ADMIN || other.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        if (actor.getRole() == UserRole.LAB) {
            Laboratory lab = laboratoryAccessService.requireMyLab(actor);

            if (other.getRole() == UserRole.DENTIST) {
                boolean ok = laboratoryConnectionRepository.existsByDentistAndLaboratoryAndStatus(other, lab, LaboratoryConnectionStatus.ACCEPTED);
                if (!ok) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
                return;
            }

            if (other.getRole() == UserRole.EMPLOYEE) {
                if (!employeeCanMessageLabs(other)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
                User otherOwner = userService.resolveClinicOwner(other);
                if (otherOwner == null || otherOwner.getRole() != UserRole.DENTIST) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
                boolean ok = laboratoryConnectionRepository.existsByDentistAndLaboratoryAndStatus(otherOwner, lab, LaboratoryConnectionStatus.ACCEPTED);
                if (!ok) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
                if (!other.isAccountSetupCompleted()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
                return;
            }

            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        // Clinic side (dentist + employees)
        User clinicOwner = userService.resolveClinicOwner(actor);
        boolean isStaff = actor.getRole() == UserRole.EMPLOYEE || actor.getOwnerDentist() != null;

        if (other.getRole() == UserRole.LAB) {
            Laboratory lab = laboratoryAccessService.requireMyLab(other);

            // Owner dentist can message connected labs.
            if (!isStaff) {
                boolean ok = laboratoryConnectionRepository.existsByDentistAndLaboratoryAndStatus(clinicOwner, lab, LaboratoryConnectionStatus.ACCEPTED);
                if (!ok) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
                return;
            }

            // Staff can message labs only if the dentist allowed it.
            if (!employeeCanMessageLabs(actor)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
            boolean ok = laboratoryConnectionRepository.existsByDentistAndLaboratoryAndStatus(clinicOwner, lab, LaboratoryConnectionStatus.ACCEPTED);
            if (!ok) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
            return;
        }

        if (isStaff) {
            // Staff can message clinic owner dentist or colleagues in the same clinic.
            if (clinicOwner != null && other.getId() != null && clinicOwner.getId() != null && other.getId().equals(clinicOwner.getId())) {
                return;
            }
            User otherOwner = userService.resolveClinicOwner(other);
            boolean otherIsStaff = other.getRole() == UserRole.EMPLOYEE || other.getOwnerDentist() != null;
            if (!otherIsStaff) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
            if (clinicOwner == null || otherOwner == null || clinicOwner.getId() == null || otherOwner.getId() == null || !clinicOwner.getId().equals(otherOwner.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
            }
            if (!other.isAccountSetupCompleted()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
            }
            return;
        }

        // Owner dentist can message employees that completed setup.
        if (other.getOwnerDentist() != null && clinicOwner != null && clinicOwner.getId() != null && other.getOwnerDentist().getId() != null
                && clinicOwner.getId().equals(other.getOwnerDentist().getId())
                && other.isAccountSetupCompleted()) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
    }

    private String fullName(User user) {
        if (user == null) return "";
        String name = (nullToEmpty(user.getFirstname()) + " " + nullToEmpty(user.getLastname())).trim();
        if (!name.isBlank()) return name;
        String phone = user.getPhoneNumber() != null ? user.getPhoneNumber() : "";
        return phone.isBlank() ? "Utilisateur" : phone;
    }

    private String otherDisplayName(User other) {
        if (other == null) return "Utilisateur";
        if (other.getRole() == UserRole.LAB) {
            var lab = laboratoryRepository.findFirstByCreatedByAndArchivedAtIsNullAndRecordStatusOrderByIdAsc(other, com.cabinetplus.backend.enums.RecordStatus.ACTIVE).orElse(null);
            if (lab != null && lab.getName() != null && !lab.getName().isBlank()) return lab.getName().trim();
        }
        return fullName(other);
    }

    private String otherBadgeLabel(User user) {
        if (user == null || user.getRole() == null) return "";
        return switch (user.getRole()) {
            case DENTIST -> "Dentiste";
            case EMPLOYEE -> "Employé";
            case LAB -> "Laboratoire";
            default -> user.getRole().name().toUpperCase(Locale.ROOT);
        };
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

    private boolean hasPermission(User user, String permission) {
        if (user == null || permission == null) return false;
        var perms = user.getPermissions();
        return perms != null && perms.contains(permission);
    }

    private boolean employeeCanMessageLabs(User user) {
        return hasPermission(user, PERM_EMPLOYEE_MESSAGE_LABS) || hasPermission(user, PERM_EMPLOYEE_MESSAGE_LABS_LEGACY);
    }

    private boolean canMessage(User actor, User other) {
        if (actor == null || other == null) return false;
        try {
            requireCanMessage(actor, other);
            return true;
        } catch (ResponseStatusException ex) {
            return false;
        } catch (Exception ex) {
            return false;
        }
    }

    private String employeeMeta(User clinicOwner) {
        if (clinicOwner == null) return "Employé du dentiste";
        String name = fullName(clinicOwner);
        if (name == null || name.isBlank()) return "Employé du dentiste";
        return "Employé de " + name;
    }

    private void appendAcceptedLabs(List<MessagingContactResponse> out, User clinicOwner) {
        if (out == null || clinicOwner == null) return;
        List<LaboratoryConnection> accepted = laboratoryConnectionRepository.findByDentistAndStatusOrderByInvitedAtDesc(
                clinicOwner,
                LaboratoryConnectionStatus.ACCEPTED
        );
        for (LaboratoryConnection c : accepted) {
            Laboratory lab = c != null ? c.getLaboratory() : null;
            User labUser = lab != null ? lab.getCreatedBy() : null;
            if (labUser == null || labUser.getPublicId() == null) continue;
            String label = (lab.getName() != null && !lab.getName().isBlank()) ? lab.getName().trim() : fullName(labUser);
            out.add(new MessagingContactResponse(labUser.getPublicId(), labUser.getId(), label, "LAB", "Laboratoire", null, null));
        }
    }
}
