package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import com.cabinetplus.backend.dto.PasswordResetConfirmRequest;
import com.cabinetplus.backend.dto.PasswordResetSendRequest;
import com.cabinetplus.backend.dto.RegisterRequest;
import com.cabinetplus.backend.dto.UserDto;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PhoneVerificationService;
import com.twilio.exception.ApiException;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepo;
    private final RefreshTokenRepository refreshRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final PhoneVerificationService phoneVerificationService;
    private final boolean devProfile;

    @Value("${jwt.access.expiration-ms}")
    private long accessTokenMs;

    @Value("${jwt.refresh.expiration-ms}")
    private long refreshTokenMs;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    public AuthController(AuthenticationManager authManager, JwtUtil jwtUtil,
                          UserRepository userRepo, RefreshTokenRepository refreshRepo,
                          PasswordEncoder passwordEncoder, AuditService auditService,
                          PhoneVerificationService phoneVerificationService,
                          Environment environment) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
        this.refreshRepo = refreshRepo;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.phoneVerificationService = phoneVerificationService;
        this.devProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    // ---------------- COOKIE HELPER ----------------
    private void addRefreshCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)   // secure in production
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String resolveDeviceId(HttpServletRequest request) {
    if (request.getCookies() == null) return null;

    for (var cookie : request.getCookies()) {
        if ("device_id".equals(cookie.getName())) {
            return cookie.getValue();
        }
    }
    return null;
}

private void addDeviceCookie(HttpServletResponse response, String deviceId) {
    ResponseCookie cookie = ResponseCookie.from("device_id", deviceId)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(60L * 60 * 24 * 365)
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
}
    
    // ---------------- LOGIN ----------------
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletResponse response, HttpServletRequest request) {
        String identifier = body.get("username");
        String password = body.get("password");

        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "field", "username",
                    "error", "Le nom d'utilisateur ou numero de telephone est obligatoire"
            ));
        }

        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "field", "password",
                    "error", "Le mot de passe est obligatoire"
            ));
        }

        User user = userRepo.findByUsername(identifier)
                .or(() -> userRepo.findFirstByPhoneNumberOrderByIdAsc(identifier))
                .orElse(null);
        if (user == null) {
            auditService.logFailure(
                    AuditEventType.AUTH_LOGIN,
                    "SESSION",
                    identifier,
                    "Nom d'utilisateur ou numero de telephone introuvable"
            );
            return ResponseEntity.status(401).body(Map.of(
                    "field", "username",
                    "error", "Nom d'utilisateur ou numero de telephone introuvable"
            ));
        }

        try {
            String resolvedUsername = user.getUsername();
            authManager.authenticate(new UsernamePasswordAuthenticationToken(resolvedUsername, password));

            String accessToken = jwtUtil.generateAccessToken(user);

            String deviceId = resolveDeviceId(request);

if (deviceId == null || deviceId.isBlank()) {
    deviceId = java.util.UUID.randomUUID().toString();
    addDeviceCookie(response, deviceId);
}
            revokeActiveSessionsForDevice(user, deviceId);
            RefreshToken refreshToken = new RefreshToken();
            refreshToken.setUser(user);
            refreshToken.setToken(jwtUtil.generateRefreshToken(resolvedUsername, refreshTokenMs));
            refreshToken.setDeviceId(deviceId);
            refreshToken.setCreatedAt(LocalDateTime.now());
            refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenMs / 1000));
            refreshToken.setLastUsedAt(LocalDateTime.now());
            fillSessionMeta(refreshToken, request);
            refreshRepo.save(refreshToken);

            addRefreshCookie(response, refreshToken.getToken(), refreshTokenMs / 1000);
            auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGIN, "SESSION", null, "Connexion reussie");

            return ResponseEntity.ok(Map.of("accessToken", accessToken));

        } catch (AuthenticationException e) {
            auditService.logFailureAsUser(
                    user,
                    AuditEventType.AUTH_LOGIN,
                    "SESSION",
                    String.valueOf(user.getId()),
                    "Mot de passe invalide"
            );
            return ResponseEntity.status(401).body(Map.of(
                    "field", "password",
                    "error", "Mot de passe invalide"
            ));
        }
    }

    // ---------------- REGISTER ----------------
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response, HttpServletRequest httpRequest) {
        if (userRepo.findByUsername(request.username()).isPresent()) {
            auditService.logFailure(AuditEventType.AUTH_REGISTER, "USER", request.username(), "Nom d'utilisateur deja utilise");
            return ResponseEntity.badRequest().body(Map.of("error", "Ce nom d'utilisateur est deja utilise"));
        }
        if (request.phoneNumber() != null && !request.phoneNumber().isBlank()
                && userRepo.existsByPhoneNumber(request.phoneNumber())) {
            auditService.logFailure(
                    AuditEventType.AUTH_REGISTER,
                    "USER",
                    request.phoneNumber(),
                    "Numero de telephone deja utilise"
            );
            return ResponseEntity.badRequest().body(Map.of("error", "Ce numero de telephone est deja utilise"));
        }

        User user = new User();
        user.setUsername(request.username());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstname(request.firstname());
        user.setLastname(request.lastname());
        user.setPhoneNumber(request.phoneNumber());
        String clinicName = request.clinicName() == null ? null : request.clinicName().trim();
        String address = request.address() == null ? null : request.address().trim();
        user.setClinicName(clinicName == null || clinicName.isBlank() ? null : clinicName);
        user.setAddress(address == null || address.isBlank() ? null : address);
        UserRole role = UserRole.valueOf(request.role());
        user.setRole(role);
        user.setClinicAccessRole(role == UserRole.DENTIST ? ClinicAccessRole.DENTIST : null);
        user.setCreatedAt(LocalDateTime.now());

        User saved = userRepo.save(user);

        String accessToken = jwtUtil.generateAccessToken(saved);

        String deviceId = resolveDeviceId(httpRequest);

if (deviceId == null || deviceId.isBlank()) {
    deviceId = java.util.UUID.randomUUID().toString();
    addDeviceCookie(response, deviceId);
}
        revokeActiveSessionsForDevice(saved, deviceId);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(saved);
        refreshToken.setToken(jwtUtil.generateRefreshToken(saved.getUsername(), refreshTokenMs));
        refreshToken.setDeviceId(deviceId);

        refreshToken.setCreatedAt(LocalDateTime.now());
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenMs / 1000));
        refreshToken.setLastUsedAt(LocalDateTime.now());
        fillSessionMeta(refreshToken, httpRequest);
        refreshRepo.save(refreshToken);

        addRefreshCookie(response, refreshToken.getToken(), refreshTokenMs / 1000);
        auditService.logSuccessAsUser(saved, AuditEventType.AUTH_REGISTER, "USER", String.valueOf(saved.getId()), "Inscription reussie");

        UserDto dto = new UserDto(
                saved.getId(),
                saved.getUsername(),
                saved.getFirstname(),
                saved.getLastname(),
                saved.getPhoneNumber(),
                saved.getRole().name()
        );

        return ResponseEntity.ok(Map.of("user", dto, "accessToken", accessToken));
    }

    // ---------------- SESSION ----------------
    @PostMapping("/session")
    public ResponseEntity<?> session(@CookieValue(name = "refresh_token", required = false) String refreshTokenCookie,
                                     HttpServletResponse response,
                                     HttpServletRequest request) {
        if (refreshTokenCookie == null) {
            return ResponseEntity.ok(Map.of("accessToken", ""));
        }

        return refreshRepo.findByTokenWithUser(refreshTokenCookie)
                .map(tokenEntity -> {
                    User user = tokenEntity.getUser();
                    boolean expiredJwt = !jwtUtil.validateRefreshToken(tokenEntity.getToken());

                    if (tokenEntity.isRevoked() || tokenEntity.getExpiresAt().isBefore(LocalDateTime.now())
                            || user == null || expiredJwt) {
                        return ResponseEntity.ok(Map.of("accessToken", ""));
                    }

                    // Only generate new access token, no refresh token rotation
                    ensureDeviceIdCookieAndToken(tokenEntity, request, response);
                    tokenEntity.setLastUsedAt(LocalDateTime.now());
                    fillSessionMetaIfMissing(tokenEntity, request);
                    refreshRepo.save(tokenEntity);
                    String newAccessToken = jwtUtil.generateAccessToken(user);
                    return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
                })
                .orElseGet(() -> ResponseEntity.ok(Map.of("accessToken", "")));
    }

    // ---------------- LOGOUT ----------------
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "refresh_token", required = false) String refreshTokenCookie,
                                       HttpServletResponse response) {
        if (refreshTokenCookie != null) {
            refreshRepo.findByToken(refreshTokenCookie).ifPresent(tokenEntity -> {
                tokenEntity.setRevoked(true);
                refreshRepo.save(tokenEntity);
                if (tokenEntity.getUser() != null) {
                    auditService.logSuccessAsUser(
                            tokenEntity.getUser(),
                            AuditEventType.AUTH_LOGOUT,
                            "SESSION",
                            String.valueOf(tokenEntity.getId()),
                            "Deconnexion reussie"
                    );
                }
            });
        }

        ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok().build();
    }

    // ---------------- LOGOUT ALL DEVICES ----------------
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll(@RequestParam Long userId,
                                          HttpServletResponse response) {
        userRepo.findById(userId).ifPresentOrElse(user -> {
            refreshRepo.deleteAllByUser(user);
            auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGOUT_ALL, "USER", String.valueOf(userId), "Deconnexion de tous les appareils");
        }, () -> auditService.logFailure(AuditEventType.AUTH_LOGOUT_ALL, "USER", String.valueOf(userId), "Utilisateur introuvable"));

        ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok().build();
    }

    // ---------------- RESET PASSWORD (SMS) ----------------
    @PostMapping("/password/reset/send")
    public ResponseEntity<?> sendPasswordReset(@Valid @RequestBody PasswordResetSendRequest request,
                                               HttpServletRequest httpRequest) {
        String formattedNumber = formatPhoneNumber(request.phoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numero de telephone invalide ou manquant."));
        }

        User user = findUserByPhoneNumber(request.phoneNumber());
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Numero de telephone introuvable"));
        }
        if (isEmployeeAccount(user)) {
            return ResponseEntity.status(403).body(Map.of(
                    "error",
                    "Les comptes employes ne peuvent pas reinitialiser le mot de passe. Contactez le proprietaire du cabinet."
            ));
        }

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            phoneVerificationService.sendVerificationCode(formattedNumber);
            return ResponseEntity.ok(Map.of("message", "Code SMS envoye"));
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for password reset send (to={})", maskPhone(formattedNumber), e);
            return ResponseEntity.status(500).body(Map.of("error", "Service SMS indisponible", "reason", "not_configured"));
        } catch (ApiException e) {
            int status = e.getStatusCode();
            logger.warn("Twilio Verify send failed for password reset (to={}, status={})", maskPhone(formattedNumber), status, e);

            if (status == 400) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Numero de telephone invalide");
                body.put("reason", "twilio_rejected");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.badRequest().body(body);
            }
            if (status == 429) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Trop de demandes. Reessayez plus tard.");
                body.put("reason", "rate_limited");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.status(429).body(body);
            }
            var body = new java.util.HashMap<String, Object>();
            body.put("error", "Service SMS indisponible");
            body.put("reason", "upstream_error");
            body.put("twilioStatus", status);
            if (e.getCode() != null) body.put("twilioCode", e.getCode());
            return ResponseEntity.status(502).body(body);
        } catch (Exception e) {
            logger.error("Unexpected error during password reset send (to={})", maskPhone(formattedNumber), e);
            return ResponseEntity.status(500).body(Map.of("error", "Service SMS indisponible", "reason", "unexpected"));
        }
    }

    @PostMapping("/password/reset/confirm")
    public ResponseEntity<?> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request,
                                                  HttpServletRequest httpRequest) {
        String formattedNumber = formatPhoneNumber(request.phoneNumber());
        if (formattedNumber == null || formattedNumber.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numero de telephone invalide ou manquant."));
        }

        User user = findUserByPhoneNumber(request.phoneNumber());
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Numero de telephone introuvable"));
        }
        if (isEmployeeAccount(user)) {
            return ResponseEntity.status(403).body(Map.of(
                    "error",
                    "Les comptes employes ne peuvent pas reinitialiser le mot de passe. Contactez le proprietaire du cabinet."
            ));
        }

        boolean approved;
        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, request.code());
            }
        } catch (IllegalStateException e) {
            logger.error("Twilio Verify not configured for password reset confirm (to={})", maskPhone(formattedNumber), e);
            return ResponseEntity.status(500).body(Map.of("error", "Service SMS indisponible", "reason", "not_configured"));
        } catch (ApiException e) {
            int status = e.getStatusCode();
            logger.warn("Twilio Verify check failed for password reset (to={}, status={})", maskPhone(formattedNumber), status, e);
            if (status == 400) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Code SMS invalide");
                body.put("reason", "twilio_rejected");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.badRequest().body(body);
            }
            if (status == 429) {
                var body = new java.util.HashMap<String, Object>();
                body.put("error", "Trop de demandes. Reessayez plus tard.");
                body.put("reason", "rate_limited");
                body.put("twilioStatus", status);
                if (e.getCode() != null) body.put("twilioCode", e.getCode());
                return ResponseEntity.status(429).body(body);
            }
            var body = new java.util.HashMap<String, Object>();
            body.put("error", "Service SMS indisponible");
            body.put("reason", "upstream_error");
            body.put("twilioStatus", status);
            if (e.getCode() != null) body.put("twilioCode", e.getCode());
            return ResponseEntity.status(502).body(body);
        } catch (Exception e) {
            logger.error("Unexpected error during password reset confirm (to={})", maskPhone(formattedNumber), e);
            return ResponseEntity.status(500).body(Map.of("error", "Service SMS indisponible", "reason", "unexpected"));
        }

        if (!approved) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code SMS invalide"));
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPhoneVerified(true);
        userRepo.save(user);
        refreshRepo.deleteAllByUser(user);

        auditService.logSuccessAsUser(
                user,
                AuditEventType.USER_PASSWORD_CHANGE,
                "USER",
                String.valueOf(user.getId()),
                "Mot de passe reinitialise par SMS"
        );

        return ResponseEntity.ok(Map.of("message", "Mot de passe reinitialise"));
    }

    // ---------------- HELPERS ----------------
    private String formatPhoneNumber(String number) {
        if (number == null || number.isBlank()) return null;
        String clean = number.replaceAll("[^0-9]", "");

        if (clean.startsWith("0") && clean.length() == 10) return "+213" + clean.substring(1);
        if (clean.startsWith("213") && clean.length() == 12) return "+" + clean;
        if (clean.length() >= 10) return "+" + clean;

        return null;
    }

    private User findUserByPhoneNumber(String rawNumber) {
        if (rawNumber == null || rawNumber.isBlank()) return null;
        String clean = rawNumber.replaceAll("[^0-9]", "");

        if (clean.startsWith("0") && clean.length() == 10) {
            String local = clean;
            String intl = "+213" + clean.substring(1);
            return userRepo.findFirstByPhoneNumberOrderByIdAsc(local)
                    .or(() -> userRepo.findFirstByPhoneNumberOrderByIdAsc(intl))
                    .orElse(null);
        }

        if (clean.startsWith("213") && clean.length() == 12) {
            String intl = "+" + clean;
            String local = "0" + clean.substring(3);
            return userRepo.findFirstByPhoneNumberOrderByIdAsc(intl)
                    .or(() -> userRepo.findFirstByPhoneNumberOrderByIdAsc(local))
                    .orElse(null);
        }

        if (rawNumber.startsWith("+")) {
            String intl = "+" + clean;
            return userRepo.findFirstByPhoneNumberOrderByIdAsc(intl).orElse(null);
        }

        return userRepo.findFirstByPhoneNumberOrderByIdAsc(rawNumber).orElse(null);
    }

    private boolean isLocalRequest(HttpServletRequest request) {
        if (request == null) return false;
        String remoteAddr = request.getRemoteAddr();
        return "127.0.0.1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr)
                || "::1".equals(remoteAddr);
    }

    private void fillSessionMeta(RefreshToken token, HttpServletRequest request) {
        if (request == null || token == null) return;
        token.setUserAgent(trim(request.getHeader("User-Agent"), 255));
        String ipAddress = trim(extractClientIp(request), 100);
        token.setIpAddress(ipAddress);
        token.setLocation(trim(extractLocation(request, ipAddress), 120));
    }

    private void fillSessionMetaIfMissing(RefreshToken token, HttpServletRequest request) {
        if (token == null || request == null) return;
        if (token.getUserAgent() == null || token.getUserAgent().isBlank()) {
            token.setUserAgent(trim(request.getHeader("User-Agent"), 255));
        }
        if (token.getIpAddress() == null || token.getIpAddress().isBlank()) {
            String ipAddress = trim(extractClientIp(request), 100);
            token.setIpAddress(ipAddress);
            token.setLocation(trim(extractLocation(request, ipAddress), 120));
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
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
        String lower = ip.toLowerCase();
        if (lower.startsWith("10.")
                || lower.startsWith("192.168.")
                || lower.startsWith("fc")
                || lower.startsWith("fd")
                || "127.0.0.1".equals(lower)
                || "0:0:0:0:0:0:0:1".equals(lower)
                || "::1".equals(lower)) {
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

    private void revokeActiveSessionsForDevice(User user, String deviceId) {
        if (user == null || deviceId == null || deviceId.isBlank()) return;
        var existing = refreshRepo.findActiveSessionsByDevice(user, deviceId, LocalDateTime.now());
        if (existing == null || existing.isEmpty()) return;
        for (var token : existing) {
            token.setRevoked(true);
        }
        refreshRepo.saveAll(existing);
    }

    private void ensureDeviceIdCookieAndToken(RefreshToken tokenEntity, HttpServletRequest request, HttpServletResponse response) {
        if (tokenEntity == null || response == null) return;

        String tokenDeviceId = tokenEntity.getDeviceId();
        String cookieDeviceId = resolveDeviceId(request);

        String resolvedDeviceId = (tokenDeviceId != null && !tokenDeviceId.isBlank())
                ? tokenDeviceId
                : (cookieDeviceId != null && !cookieDeviceId.isBlank())
                ? cookieDeviceId
                : UUID.randomUUID().toString();

        if (tokenDeviceId == null || tokenDeviceId.isBlank()) {
            tokenEntity.setDeviceId(resolvedDeviceId);
        }

        if (cookieDeviceId == null || cookieDeviceId.isBlank() || !cookieDeviceId.equals(resolvedDeviceId)) {
            addDeviceCookie(response, resolvedDeviceId);
        }
    }

    private String maskPhone(String value) {
        if (value == null || value.isBlank()) return "<empty>";
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() <= 4) return "****";
        return "****" + digits.substring(digits.length() - 4);
    }

    private boolean isEmployeeAccount(User user) {
        if (user == null) return false;
        if (user.getRole() != UserRole.DENTIST) return false;
        // Any linked sub-account (or non-owner clinic role) is treated as an "employee" account for password reset.
        if (user.getOwnerDentist() != null) return true;
        return user.getClinicAccessRole() != null && user.getClinicAccessRole() != ClinicAccessRole.DENTIST;
    }
    
}
