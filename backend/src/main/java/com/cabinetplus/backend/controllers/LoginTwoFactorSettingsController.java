package com.cabinetplus.backend.controllers;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.LoginTwoFactorSettingsRequest;
import com.cabinetplus.backend.dto.LoginTwoFactorSettingsResponse;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PhoneVerificationService;
import com.cabinetplus.backend.services.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/security/login-2fa")
public class LoginTwoFactorSettingsController {

    private final UserService userService;
    private final AuditService auditService;
    private final PhoneVerificationService phoneVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final boolean devProfile;

    @Value("${app.login-2fa.bypass-local:false}")
    private boolean bypassLoginTwoFactorLocal;

    public LoginTwoFactorSettingsController(
            UserService userService,
            AuditService auditService,
            PhoneVerificationService phoneVerificationService,
            PasswordEncoder passwordEncoder,
            Environment environment
    ) {
        this.userService = userService;
        this.auditService = auditService;
        this.phoneVerificationService = phoneVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.devProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");
    }

    @GetMapping
    public LoginTwoFactorSettingsResponse getSettings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        return new LoginTwoFactorSettingsResponse(user.isLoginTwoFactorEnabled());
    }

    @PutMapping
    public LoginTwoFactorSettingsResponse updateSettings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody LoginTwoFactorSettingsRequest request,
            HttpServletRequest httpRequest
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException(java.util.Map.of("password", "Mot de passe incorrect"));
        }

        boolean enabled = Boolean.TRUE.equals(request.enabled());
        if (enabled) {
            boolean devBypass = bypassLoginTwoFactorLocal && devProfile && isLocalRequest(httpRequest);
            if (!devBypass && !phoneVerificationService.isConfigured()) {
                throw new BadRequestException(
                    java.util.Map.of("_", "Service SMS indisponible. Veuillez reessayer plus tard ou contacter le support.")
                );
            }
        }

        user.setLoginTwoFactorEnabled(enabled);
        if (!enabled) {
            user.setLoginOtpLastSentAt(null);
        }
        User saved = userService.save(user);

        auditService.logSuccessAsUser(
                saved,
                AuditEventType.SETTINGS_LOGIN_2FA_UPDATE,
                "USER",
                String.valueOf(saved.getId()),
                enabled ? "Verification en 2 etapes activee" : "Verification en 2 etapes desactivee"
        );

        return new LoginTwoFactorSettingsResponse(saved.isLoginTwoFactorEnabled());
    }

    private boolean isLocalRequest(HttpServletRequest request) {
        if (request == null) return false;

        String origin = request.getHeader("Origin");
        if (origin != null) {
            String o = origin.toLowerCase();
            if (o.startsWith("http://localhost")
                    || o.startsWith("https://localhost")
                    || o.startsWith("http://127.0.0.1")
                    || o.startsWith("https://127.0.0.1")) {
                return true;
            }
        }

        String serverName = request.getServerName();
        if ("localhost".equalsIgnoreCase(serverName) || "127.0.0.1".equals(serverName)) {
            return true;
        }

        String clientIp = extractClientIp(request);
        if (clientIp == null) return false;
        String ip = clientIp.trim();
        if (ip.startsWith("::ffff:")) ip = ip.substring(7);

        if ("127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) return true;
        return isPrivateIpv4(ip);
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String first = forwardedFor.split(",")[0].trim();
            if (!first.isBlank()) return first;
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return request.getRemoteAddr();
    }

    private boolean isPrivateIpv4(String ip) {
        if (ip == null || ip.isBlank()) return false;
        String[] parts = ip.split("\\.");
        if (parts.length != 4) return false;
        try {
            int a = Integer.parseInt(parts[0]);
            int b = Integer.parseInt(parts[1]);
            if (a == 10) return true;
            if (a == 192 && b == 168) return true;
            if (a == 172 && b >= 16 && b <= 31) return true;
            if (a == 127) return true;
        } catch (NumberFormatException ignore) {
            return false;
        }
        return false;
    }
}
