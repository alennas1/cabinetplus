package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpHeaders; // Used for better cookie control
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

import com.cabinetplus.backend.dto.RegisterRequest;
import com.cabinetplus.backend.dto.UserDto;
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

    public AuthController(AuthenticationManager authManager, JwtUtil jwtUtil,
                          UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    // Helper method to create production-ready cookies
    private void addRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(true)    // Required for Cross-Site on HTTPS
                .sameSite("None") // Required for Cross-Site (Vercel to Railway)
                .path("/auth/refresh")
                .maxAge(7 * 24 * 60 * 60)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    // ---------------- LOGIN ----------------
    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
        try {
            String username = body.get("username");
            String password = body.get("password");

            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            User user = userRepo.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String accessToken = jwtUtil.generateAccessToken(user);
            String refreshToken = jwtUtil.generateRefreshToken(username);

            addRefreshCookie(response, refreshToken);

            return Map.of("accessToken", accessToken);

        } catch (AuthenticationException e) {
            throw new RuntimeException("Invalid username/password");
        }
    }

    // ---------------- REGISTER ----------------
    @PostMapping("/register")
    public Map<String, Object> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        if (userRepo.findByUsername(request.username()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstname(request.firstname());
        user.setLastname(request.lastname());
        user.setEmail(request.email());
        user.setPhoneNumber(request.phoneNumber());
        user.setRole(UserRole.valueOf(request.role()));
        user.setCreatedAt(LocalDateTime.now());

        User saved = userRepo.save(user);

        String accessToken = jwtUtil.generateAccessToken(saved);
        String refreshToken = jwtUtil.generateRefreshToken(saved.getUsername());

        addRefreshCookie(response, refreshToken);

        UserDto dto = new UserDto(
                saved.getId(),
                saved.getUsername(),
                saved.getFirstname(),
                saved.getLastname(),
                saved.getEmail(),
                saved.getPhoneNumber(),
                saved.getRole().name()
        );

        return Map.of(
                "user", dto,
                "accessToken", accessToken
        );
    }

    // ---------------- REFRESH ----------------
    @PostMapping("/refresh")
    public Map<String, String> refresh(@CookieValue(name = "refresh_token", required = false) String refreshToken, HttpServletResponse response) {
        if (refreshToken == null) {
            throw new RuntimeException("Refresh token missing");
        }

        if (jwtUtil.validateToken(refreshToken)) {
            String username = jwtUtil.extractUsername(refreshToken);

            User user = userRepo.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String newAccessToken = jwtUtil.generateAccessToken(user);
            
            // Optional: Rotate the refresh token
            String newRefreshToken = jwtUtil.generateRefreshToken(username);
            addRefreshCookie(response, newRefreshToken);

            return Map.of("accessToken", newAccessToken);
        }
        throw new RuntimeException("Invalid refresh token");
    }

    // ---------------- LOGOUT ----------------
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/auth/refresh")
                .maxAge(0) // Deletes the cookie
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.ok().build();
    }
}