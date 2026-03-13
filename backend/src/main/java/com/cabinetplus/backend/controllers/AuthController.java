package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;

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

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

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

    // ---------------- LOGIN ----------------
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
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

            RefreshToken refreshToken = new RefreshToken();
            refreshToken.setUser(user);
            refreshToken.setToken(jwtUtil.generateRefreshToken(resolvedUsername, refreshTokenMs));
            refreshToken.setCreatedAt(LocalDateTime.now());
            refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenMs / 1000));
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
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
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

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(saved);
        refreshToken.setToken(jwtUtil.generateRefreshToken(saved.getUsername(), refreshTokenMs));
        refreshToken.setCreatedAt(LocalDateTime.now());
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenMs / 1000));
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
                                     HttpServletResponse response) {
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

        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                return ResponseEntity.ok(Map.of("message", "Code SMS envoye (mode dev)"));
            }
            phoneVerificationService.sendVerificationCode(formattedNumber);
            return ResponseEntity.ok(Map.of("message", "Code SMS envoye"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Service SMS indisponible"));
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

        boolean approved;
        try {
            if (devProfile && isLocalRequest(httpRequest)) {
                approved = true;
            } else {
                approved = phoneVerificationService.checkVerificationCode(formattedNumber, request.code());
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Service SMS indisponible"));
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
    
}
