package com.cabinetplus.backend.services;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.MDC;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.cabinetplus.backend.dto.AuditLogPageResponse;
import com.cabinetplus.backend.dto.AuditLogResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.AuditStatus;
import com.cabinetplus.backend.models.AuditLog;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.AuditLogRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.util.PhoneNumberUtil;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class AuditService {
    public static final String REQUEST_ID_KEY = "requestId";
    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private static final List<String> ADMIN_SECURITY_EVENT_TYPES = List.of(
            AuditEventType.AUTH_LOGIN.name(),
            AuditEventType.AUTH_LOGOUT.name(),
            AuditEventType.AUTH_LOGOUT_ALL.name(),
            AuditEventType.AUTH_PASSWORD_RESET_SEND.name(),
            AuditEventType.SECURITY_PIN_ENABLE.name(),
            AuditEventType.SECURITY_PIN_STATUS.name(),
            AuditEventType.SECURITY_PIN_CHANGE.name(),
            AuditEventType.SECURITY_PIN_DISABLE.name(),
            AuditEventType.SECURITY_PIN_VERIFY.name(),
            AuditEventType.VERIFY_PHONE_OTP_SEND.name(),
            AuditEventType.VERIFY_PHONE_OTP_CHECK.name(),
            AuditEventType.PHONE_CHANGE_SEND.name(),
            AuditEventType.PHONE_CHANGE_CONFIRM.name(),
            AuditEventType.USER_ADMIN_CREATE.name(),
            AuditEventType.USER_CREATE.name(),
            AuditEventType.USER_UPDATE.name(),
            AuditEventType.USER_READ.name(),
            AuditEventType.USER_DELETE.name(),
            AuditEventType.USER_PASSWORD_CHANGE.name(),
            AuditEventType.HAND_PAYMENT_CREATE.name(),
            AuditEventType.HAND_PAYMENT_CONFIRM.name(),
            AuditEventType.HAND_PAYMENT_REJECT.name(),
            AuditEventType.PLAN_CREATE.name(),
            AuditEventType.PLAN_UPDATE.name(),
            AuditEventType.PLAN_DEACTIVATE.name(),
            AuditEventType.PLAN_RECOMMENDED_SET.name()
    );

    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository, PatientRepository patientRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
    }

    private static boolean isNonActionEventType(String eventType) {
        if (eventType == null || eventType.isBlank()) return false;
        String t = eventType.trim();
        return t.endsWith("_READ") || t.endsWith("_PDF_DOWNLOAD");
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

        User clinicOwner = currentUser.getOwnerDentist() != null ? currentUser.getOwnerDentist() : currentUser;
        List<Long> actorUserIds = resolveVisibleActorIds(clinicOwner);
        List<AuditLog> logs = auditLogRepository.findTop200ByActorUserIdInOrderByOccurredAtDesc(actorUserIds)
                .stream()
                .filter(log -> log != null && !isNonActionEventType(log.getEventType()))
                .toList();

        var patientNames = resolvePatientNames(logs, clinicOwner);

        return logs.stream()
                .map(log -> toResponse(log, patientNames))
                .toList();
    }

    public AuditLogPageResponse getMyLogsPaged(
            User currentUser,
            int page,
            int size,
            String q,
            String status,
            String entity,
            String action,
            String sortKey,
            String sortDirection,
            LocalDate from,
            LocalDate to
    ) {
        if (currentUser == null) {
            return new AuditLogPageResponse(List.of(), 0, 0, 0L, 0);
        }

        User clinicOwner = currentUser.getOwnerDentist() != null ? currentUser.getOwnerDentist() : currentUser;
        List<Long> actorUserIds = resolveVisibleActorIds(clinicOwner);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(safePage, safeSize, buildMyLogsSort(sortKey, sortDirection));

        String safeQ = q != null ? q : "";
        String safeStatus = status != null ? status : "";
        String safeEntity = entity != null ? entity : "";
        String safeAction = action != null ? action : "";
        if ("READ".equalsIgnoreCase(safeAction)) {
            safeAction = "ALL";
        }

        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime toExclusive = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.of(10000, 1, 1, 0, 0);

        var logsPage = auditLogRepository.searchMyLogs(
                actorUserIds,
                safeQ,
                safeStatus,
                safeEntity,
                safeAction,
                fromDateTime,
                toExclusive,
                pageable
        );

        var patientNames = resolvePatientNames(logsPage.getContent(), clinicOwner);
        var items = logsPage.getContent().stream()
                .map(log -> toResponse(log, patientNames))
                .toList();

        return new AuditLogPageResponse(
                items,
                logsPage.getNumber(),
                logsPage.getSize(),
                logsPage.getTotalElements(),
                logsPage.getTotalPages()
        );
    }

    private static Sort buildMyLogsSort(String sortKey, String sortDirection) {
        String key = sortKey != null ? sortKey.trim().toLowerCase() : "";
        boolean desc = sortDirection != null && sortDirection.trim().equalsIgnoreCase("desc");

        Sort.Order primary = switch (key) {
            case "occurredat", "date", "datetime" -> (desc ? Sort.Order.desc("occurredAt") : Sort.Order.asc("occurredAt")).nullsLast();
            case "status" -> Sort.Order.by("status").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC).nullsLast();
            case "ip", "ipaddress" -> Sort.Order.by("ipAddress").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC).nullsLast();
            case "location" -> Sort.Order.by("location").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC).nullsLast();
            case "actor", "actorusername" -> Sort.Order.by("actorUsername").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC).nullsLast();
            case "patient", "targetid" -> Sort.Order.by("targetId").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC).nullsLast();
            case "action", "entity", "eventtype" -> Sort.Order.by("eventType").ignoreCase().with(desc ? Sort.Direction.DESC : Sort.Direction.ASC).nullsLast();
            default -> Sort.Order.desc("occurredAt").nullsLast();
        };

        Sort sort = Sort.by(primary);
        if (!"occurredat".equals(key) && !"date".equals(key) && !"datetime".equals(key)) {
            sort = sort.and(Sort.by(Sort.Order.desc("occurredAt").nullsLast()));
        }
        return sort.and(Sort.by(Sort.Order.desc("id").nullsLast()));
    }

    public List<AuditLogResponse> getSecurityLogsForAdmin() {
        return auditLogRepository.findTop200ByActorRoleInOrderByOccurredAtDesc(List.of("ADMIN", "SYSTEM"))
                .stream()
                .filter(log -> log != null && !isNonActionEventType(log.getEventType()))
                .filter(log -> ADMIN_SECURITY_EVENT_TYPES.contains(log.getEventType()))
                .map(log -> toResponse(log, java.util.Map.of()))
                .toList();
    }

    public AuditLogPageResponse getSecurityLogsForAdminPaged(
            User adminUser,
            int page,
            int size,
            String q,
            String status,
            LocalDate from,
            LocalDate to
    ) {
        if (adminUser == null) {
            return new AuditLogPageResponse(List.of(), 0, 0, 0L, 0);
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "occurredAt"));

        String safeQ = q != null ? q : "";
        String safeStatus = status != null ? status : "";

        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime toExclusive = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.of(10000, 1, 1, 0, 0);

        var logsPage = auditLogRepository.searchAdminSecurityLogs(
                List.of("ADMIN", "SYSTEM"),
                ADMIN_SECURITY_EVENT_TYPES,
                safeQ,
                safeStatus,
                fromDateTime,
                toExclusive,
                pageable
        );

        var items = logsPage.getContent().stream()
                .map(log -> toResponse(log, java.util.Map.of()))
                .toList();

        return new AuditLogPageResponse(
                items,
                logsPage.getNumber(),
                logsPage.getSize(),
                logsPage.getTotalElements(),
                logsPage.getTotalPages()
        );
    }

	    public AuditLogPageResponse getPatientLogs(
	            User currentUser,
	            Long patientId,
	            int page,
	            int size,
	            String q,
	            String status,
	            String entity,
	            String action,
	            String sortKey,
	            String sortDirection,
	            LocalDate from,
	            LocalDate to
	    ) {
        if (currentUser == null || patientId == null) {
            return new AuditLogPageResponse(List.of(), 0, 0, 0L, 0);
        }

        User clinicOwner = currentUser.getOwnerDentist() != null ? currentUser.getOwnerDentist() : currentUser;
        patientRepository.findByIdAndCreatedBy(patientId, clinicOwner)
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));

	        int safePage = Math.max(page, 0);
	        int safeSize = Math.min(Math.max(size, 1), 100);

	        List<Long> actorUserIds = resolveVisibleActorIds(clinicOwner);
	        var pageable = PageRequest.of(safePage, safeSize, resolveAuditSort(sortKey, sortDirection));

        // Avoid passing NULL optional filters to PostgreSQL (can fail to infer parameter types in generated SQL).
        String safeQ = q != null ? q : "";
        String safeStatus = status != null ? status : "";
        String safeEntity = entity != null ? entity : "";
        String safeAction = action != null ? action : "";
        if ("READ".equalsIgnoreCase(safeAction)) {
            safeAction = "ALL";
        }

        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime toExclusive = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.of(10000, 1, 1, 0, 0);

        var logsPage = auditLogRepository.searchPatientLogs(
                actorUserIds,
                String.valueOf(patientId),
                safeQ,
                safeStatus,
                safeEntity,
                safeAction,
                fromDateTime,
                toExclusive,
                pageable
        );

        var patientNames = resolvePatientNames(logsPage.getContent(), clinicOwner);
        var items = logsPage.getContent().stream()
                .map(log -> toResponse(log, patientNames))
                .toList();

	        return new AuditLogPageResponse(
	                items,
	                logsPage.getNumber(),
	                logsPage.getSize(),
	                logsPage.getTotalElements(),
	                logsPage.getTotalPages()
	        );
	    }

	    private static Sort resolveAuditSort(String sortKey, String sortDirection) {
	        String key = sortKey != null ? sortKey.trim() : "";
	        String dir = sortDirection != null ? sortDirection.trim() : "";

	        Sort.Direction direction = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;

	        String property = switch (key) {
	            case "occurredAt", "date", "datetime" -> "occurredAt";
	            case "status" -> "status";
	            case "eventType", "action", "entity" -> "eventType";
	            case "message", "details" -> "message";
	            case "actor", "actorUsername", "user" -> "actorUsername";
	            case "ip", "ipAddress" -> "ipAddress";
	            case "location" -> "location";
	            default -> "occurredAt";
	        };

	        // Secondary sort keeps results stable when values are equal.
	        if (!"occurredAt".equals(property)) {
	            return Sort.by(direction, property).and(Sort.by(Sort.Direction.DESC, "occurredAt"));
	        }
	        return Sort.by(direction, property);
	    }

    private void createLog(
            AuditEventType eventType,
            AuditStatus status,
            String targetType,
            String targetId,
            String message,
            User explicitActor
    ) {
        if (eventType == null) return;
        if (isNonActionEventType(eventType.name())) {
            // Read/PDF download events are intentionally not persisted (journal d'activité: actions only).
            return;
        }

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
            log.setActorUsername(trim(actor.getPhoneNumber(), 100));
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
        var candidates = PhoneNumberUtil.algeriaStoredCandidates(auth.getName());
        if (candidates.isEmpty()) {
            return null;
        }
        return userRepository.findFirstByPhoneNumberInOrderByIdAsc(candidates).orElse(null);
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

    private AuditLogResponse toResponse(AuditLog log, java.util.Map<Long, String> patientNames) {
        String actorDisplayName = resolveActorDisplayName(log.getActorUserId(), log.getActorUsername());
        String targetDisplay = null;
        if ("PATIENT".equalsIgnoreCase(log.getTargetType())) {
            Long id = parseLongOrNull(log.getTargetId());
            if (id != null) {
                targetDisplay = patientNames.get(id);
            }
        }
        return new AuditLogResponse(
                log.getOccurredAt(),
                log.getEventType(),
                log.getStatus(),
                log.getMessage(),
                log.getTargetType(),
                log.getTargetId(),
                targetDisplay,
                log.getActorUserId(),
                actorDisplayName,
                log.getIpAddress(),
                log.getLocation()
        );
    }

    private List<Long> resolveVisibleActorIds(User clinicOwner) {
        List<Long> actorUserIds = new ArrayList<>();
        actorUserIds.add(clinicOwner.getId());
        userRepository.findByOwnerDentist(clinicOwner)
                .stream()
                .map(User::getId)
                .forEach(actorUserIds::add);
        return actorUserIds.stream().distinct().toList();
    }

    private java.util.Map<Long, String> resolvePatientNames(List<AuditLog> logs, User clinicOwner) {
        if (logs == null || logs.isEmpty()) {
            return java.util.Map.of();
        }

        List<Long> ids = logs.stream()
                .filter(l -> l != null && "PATIENT".equalsIgnoreCase(l.getTargetType()))
                .map(AuditLog::getTargetId)
                .map(this::parseLongOrNull)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        if (ids.isEmpty()) {
            return java.util.Map.of();
        }

        List<Patient> patients = patientRepository.findByIdInAndCreatedBy(ids, clinicOwner);
        java.util.Map<Long, String> out = new java.util.HashMap<>();
        for (Patient p : patients) {
            if (p == null || p.getId() == null) continue;
            String first = p.getFirstname() != null ? p.getFirstname().trim() : "";
            String last = p.getLastname() != null ? p.getLastname().trim() : "";
            String full = (first + " " + last).trim();
            out.put(p.getId(), full.isEmpty() ? ("Patient #" + p.getId()) : full);
        }
        return out;
    }

    private Long parseLongOrNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        if (v.isEmpty()) return null;
        for (int i = 0; i < v.length(); i++) {
            if (!Character.isDigit(v.charAt(i))) return null;
        }
        try {
            return Long.parseLong(v);
        } catch (NumberFormatException ignored) {
            return null;
        }
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
                    return fullName.isEmpty() ? user.getPhoneNumber() : fullName;
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
