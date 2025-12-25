package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.dto.RegisterRequest;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authManager,
                          JwtUtil jwtUtil,
                          UserRepository userRepo,
                          PasswordEncoder passwordEncoder) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    private void addCookie(HttpServletResponse response,
                           String name,
                           String value,
                           int maxAge) {

        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(maxAge)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    // -------- LOGIN --------
    @PostMapping("/login")
    public ResponseEntity<Void> login(
            @RequestBody Map<String, String> body,
            HttpServletResponse response) {

        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        body.get("username"),
                        body.get("password"))
        );

        User user = userRepo.findByUsername(body.get("username"))
                .orElseThrow();

        addCookie(response, "access_token",
                jwtUtil.generateAccessToken(user),
                15 * 60);

        addCookie(response, "refresh_token",
                jwtUtil.generateRefreshToken(user.getUsername()),
                7 * 24 * 60 * 60);

        return ResponseEntity.ok().build();
    }

    // -------- REGISTER --------
    @PostMapping("/register")
    public ResponseEntity<Void> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {

        if (userRepo.findByUsername(request.username()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }

        User user = new User();
        user.setUsername(request.username());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstname(request.firstname());
        user.setLastname(request.lastname());
        user.setPhoneNumber(request.phoneNumber());
        user.setRole(UserRole.valueOf(request.role()));
        user.setCreatedAt(LocalDateTime.now());

        userRepo.save(user);

        addCookie(response, "access_token",
                jwtUtil.generateAccessToken(user),
                15 * 60);

        addCookie(response, "refresh_token",
                jwtUtil.generateRefreshToken(user.getUsername()),
                7 * 24 * 60 * 60);

        return ResponseEntity.ok().build();
    }

    // -------- REFRESH --------
    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {

        if (refreshToken == null) {
            return ResponseEntity.status(401).build();
        }

        var claims = jwtUtil.validateAndGetClaims(refreshToken);

        if (!"REFRESH".equals(claims.get("tokenType"))) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepo.findByUsername(claims.getSubject())
                .orElseThrow();

        addCookie(response, "access_token",
                jwtUtil.generateAccessToken(user),
                15 * 60);

        addCookie(response, "refresh_token",
                jwtUtil.generateRefreshToken(user.getUsername()),
                7 * 24 * 60 * 60);

        return ResponseEntity.ok().build();
    }

    // -------- LOGOUT --------
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        addCookie(response, "access_token", "", 0);
        addCookie(response, "refresh_token", "", 0);
        return ResponseEntity.ok().build();
    }
}
