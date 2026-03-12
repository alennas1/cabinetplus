package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.net.InetAddress;
import java.net.UnknownHostException;

import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.cabinetplus.backend.dto.AuditLogResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.AuditStatus;
import com.cabinetplus.backend.models.AuditLog;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.AuditLogRepository;
import com.cabinetplus.backend.repositories.UserRepository;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class AuditService {
    public static final String REQUEST_ID_KEY = "requestId";
    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private static final List<String> ADMIN_SECURITY_EVENT_TYPES = List.of(
            AuditEventType.AUTH_LOGIN.name(),
            AuditEventType.AUTH_LOGOUT.name(),
            AuditEventType.AUTH_LOGOUT_ALL.name(),
            AuditEventType.SECURITY_PIN_ENABLE.name(),
            AuditEventType.SECURITY_PIN_CHANGE.name(),
            AuditEventType.SECURITY_PIN_DISABLE.name(),
            AuditEventType.SECURITY_PIN_VERIFY.name(),
            AuditEventType.USER_ADMIN_CREATE.name(),
            AuditEventType.USER_DELETE.name(),
            AuditEventType.USER_PASSWORD_CHANGE.name(),
            AuditEventType.HAND_PAYMENT_CONFIRM.name(),
            AuditEventType.HAND_PAYMENT_REJECT.name()
    );

    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    public void logSuccess(AuditEventType eventType, String targetType, String targetId, String message) {
        createLog(eventType, AuditStatus.SUCCESS, targetType, targetId, message, null);
    }

    public void logFailure(AuditEventType eventType, String targetType, String targetId, String message) {
        createLog(eventType, AuditStatus.FAILURE, targetType, targetId, message, null);
    }

    public void logSuccessAsUser(User actor, AuditEventType eventType, String targetType, String targetId, String message) {
        createLog(eventType, AuditStatus.SUCCESS, targetType, targetId, message, actor);
    }

    public void logFailureAsUser(User actor, AuditEventType eventType, String targetType, String targetId, String message) {
        createLog(eventType, AuditStatus.FAILURE, targetType, targetId, message, actor);
    }

    public List<AuditLogResponse> getMyLogs(User currentUser) {
        if (currentUser == null) {
            return List.of();
        }

        List<Long> actorUserIds = resolveVisibleActorIds(currentUser);
        return auditLogRepository.findTop200ByActorUserIdInOrderByOccurredAtDesc(actorUserIds)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AuditLogResponse> getSecurityLogsForAdmin() {
        return auditLogRepository.findTop200ByActorRoleInOrderByOccurredAtDesc(List.of("ADMIN", "SYSTEM"))
                .stream()
                .filter(log -> ADMIN_SECURITY_EVENT_TYPES.contains(log.getEventType()))
                .map(this::toResponse)
                .toList();
    }

    private void createLog(
            AuditEventType eventType,
            AuditStatus status,
            String targetType,
            String targetId,
            String message,
            User explicitActor
    ) {
        AuditLog log = new AuditLog();
        log.setOccurredAt(LocalDateTime.now());
        log.setRequestId(trim(MDC.get(REQUEST_ID_KEY), 64));
        log.setEventType(eventType.name());
        log.setStatus(status.name());
        log.setTargetType(trim(targetType, 80));
        log.setTargetId(trim(targetId, 120));
        log.setMessage(trim(message, 300));

        HttpServletRequest request = currentRequest();
        if (request != null) {
            log.setHttpMethod(trim(request.getMethod(), 10));
            log.setPath(trim(request.getRequestURI(), 255));
            String ipAddress = trim(extractClientIp(request), 100);
            log.setIpAddress(ipAddress);
            log.setLocation(trim(extractLocation(request, ipAddress), 120));
        }

        User actor = explicitActor != null ? explicitActor : resolveCurrentUser();
        if (actor != null) {
            log.setActorUserId(actor.getId());
            log.setActorUsername(trim(actor.getUsername(), 100));
            log.setActorRole(actor.getRole() != null ? actor.getRole().name() : "UNKNOWN");
        } else {
            log.setActorRole("SYSTEM");
        }

        auditLogRepository.save(log);
    }

    private User resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    private HttpServletRequest currentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            return servletAttributes.getRequest();
        }
        return null;
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private AuditLogResponse toResponse(AuditLog log) {
        String actorDisplayName = resolveActorDisplayName(log.getActorUserId(), log.getActorUsername());
        return new AuditLogResponse(
                log.getOccurredAt(),
                log.getEventType(),
                log.getStatus(),
                log.getMessage(),
                log.getActorUserId(),
                actorDisplayName,
                log.getIpAddress(),
                log.getLocation()
        );
    }

    private List<Long> resolveVisibleActorIds(User currentUser) {
        User clinicOwner = currentUser.getOwnerDentist() != null ? currentUser.getOwnerDentist() : currentUser;
        List<Long> actorUserIds = new ArrayList<>();
        actorUserIds.add(clinicOwner.getId());
        userRepository.findByOwnerDentist(clinicOwner)
                .stream()
                .map(User::getId)
                .forEach(actorUserIds::add);
        return actorUserIds.stream().distinct().toList();
    }

    private String resolveActorDisplayName(Long actorUserId, String fallbackUsername) {
        if (actorUserId == null) {
            return fallbackUsername;
        }

        return userRepository.findById(actorUserId)
                .map(user -> {
                    String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
                    String last = user.getLastname() != null ? user.getLastname().trim() : "";
                    String fullName = (first + " " + last).trim();
                    return fullName.isEmpty() ? user.getUsername() : fullName;
                })
                .orElse(fallbackUsername);
    }

    private String extractLocation(HttpServletRequest request, String ipAddress) {
        String city = headerOrNull(request, "X-City");
        String region = headerOrNull(request, "X-Region");
        String country = firstNonBlank(
                headerOrNull(request, "CF-IPCountry"),
                headerOrNull(request, "X-Country-Code"),
                headerOrNull(request, "X-Country"),
                headerOrNull(request, "X-AppEngine-Country"),
                headerOrNull(request, "X-Geo-Country")
        );

        StringBuilder location = new StringBuilder();
        if (city != null) location.append(city);
        if (region != null) {
            if (!location.isEmpty()) location.append(", ");
            location.append(region);
        }
        if (country != null) {
            if (!location.isEmpty()) location.append(", ");
            location.append(country);
        }
        if (!location.isEmpty()) return location.toString();

        if (isPrivateOrLocalIp(ipAddress)) {
            return "Reseau local";
        }
        return "Localisation indisponible";
    }

    private String headerOrNull(HttpServletRequest request, String headerName) {
        String value = request.getHeader(headerName);
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private boolean isPrivateOrLocalIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return true;

        String ip = ipAddress.trim();
        try {
            InetAddress addr = InetAddress.getByName(ip);
            if (addr.isAnyLocalAddress()
                    || addr.isLoopbackAddress()
                    || addr.isSiteLocalAddress()
                    || addr.isLinkLocalAddress()) {
                return true;
            }
        } catch (UnknownHostException ignored) {
            // Fall through to prefix-based checks.
        }

        String lower = ip.toLowerCase();
        if (lower.startsWith("10.")
                || lower.startsWith("192.168.")
                || lower.startsWith("fc")
                || lower.startsWith("fd")) {
            return true;
        }

        if (!lower.contains(".")) {
            return false;
        }

        String[] parts = lower.split("\\.");
        if (parts.length != 4) {
            return false;
        }

        try {
            int first = Integer.parseInt(parts[0]);
            int second = Integer.parseInt(parts[1]);
            return first == 172 && second >= 16 && second <= 31;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }

    private String trim(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
