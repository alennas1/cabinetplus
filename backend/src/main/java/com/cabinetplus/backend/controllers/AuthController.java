package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import com.cabinetplus.backend.dto.RegisterRequest;
import com.cabinetplus.backend.dto.UserDto;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.AuditService;

import jakarta.servlet.http.HttpServletResponse;
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

    @Value("${jwt.access.expiration-ms}")
    private long accessTokenMs;

    @Value("${jwt.refresh.expiration-ms}")
    private long refreshTokenMs;

    public AuthController(AuthenticationManager authManager, JwtUtil jwtUtil,
                          UserRepository userRepo, RefreshTokenRepository refreshRepo,
                          PasswordEncoder passwordEncoder, AuditService auditService) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
        this.refreshRepo = refreshRepo;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    // ---------------- COOKIE HELPER ----------------
    private void addRefreshCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)   // secure in production
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    // ---------------- LOGIN ----------------
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
        String username = body.get("username");
        String password = body.get("password");
        try {
            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            User user = userRepo.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

            String accessToken = jwtUtil.generateAccessToken(user);

            RefreshToken refreshToken = new RefreshToken();
            refreshToken.setUser(user);
            refreshToken.setToken(jwtUtil.generateRefreshToken(username, refreshTokenMs));
            refreshToken.setCreatedAt(LocalDateTime.now());
            refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshTokenMs / 1000));
            refreshRepo.save(refreshToken);

            addRefreshCookie(response, refreshToken.getToken(), refreshTokenMs / 1000);
            auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGIN, "SESSION", null, "Connexion reussie");

            return ResponseEntity.ok(Map.of("accessToken", accessToken));

        } catch (AuthenticationException e) {
            userRepo.findByUsername(username).ifPresentOrElse(
                    user -> auditService.logFailureAsUser(
                            user,
                            AuditEventType.AUTH_LOGIN,
                            "SESSION",
                            String.valueOf(user.getId()),
                            "Identifiants invalides"
                    ),
                    () -> auditService.logFailure(AuditEventType.AUTH_LOGIN, "SESSION", username, "Identifiants invalides")
            );
            return ResponseEntity.status(401).body(Map.of("error", "Nom d'utilisateur ou mot de passe invalide"));
        }
    }

    // ---------------- REGISTER ----------------
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        if (userRepo.findByUsername(request.username()).isPresent()) {
            auditService.logFailure(AuditEventType.AUTH_REGISTER, "USER", request.username(), "Nom d'utilisateur deja utilise");
            return ResponseEntity.badRequest().body(Map.of("error", "Ce nom d'utilisateur est deja utilise"));
        }

        User user = new User();
        user.setUsername(request.username());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstname(request.firstname());
        user.setLastname(request.lastname());
        user.setPhoneNumber(request.phoneNumber());
        user.setRole(UserRole.valueOf(request.role()));
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
                .secure(false)
                .sameSite("Lax")
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
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok().build();
    }
    
}
