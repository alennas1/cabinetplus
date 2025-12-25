package com.cabinetplus.backend.controllers;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.security.JwtUtil;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepo;

    public AuthController(AuthenticationManager authManager, JwtUtil jwtUtil, UserRepository userRepo) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
    }

    private void setTokenCookies(HttpServletResponse response, User user) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user.getUsername());

        ResponseCookie accessCookie = ResponseCookie.from("access_token", accessToken)
                .httpOnly(true).secure(true).sameSite("None").path("/")
                .maxAge(jwtUtil.getAccessExpirationSeconds()).build();

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true).secure(true).sameSite("None").path("/")
                .maxAge(jwtUtil.getRefreshExpirationSeconds()).build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(body.get("username"), body.get("password")));
        User user = userRepo.findByUsername(body.get("username")).orElseThrow();
        setTokenCookies(response, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(@CookieValue(name = "refresh_token", required = false) String token, HttpServletResponse response) {
        if (token == null) return ResponseEntity.status(401).build();
        
        var claims = jwtUtil.validateAndGetClaims(token);
        if (!"REFRESH".equals(claims.get("tokenType"))) return ResponseEntity.status(401).build();

        User user = userRepo.findByUsername(claims.getSubject()).orElseThrow();
        setTokenCookies(response, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        ResponseCookie c1 = ResponseCookie.from("access_token", "").maxAge(0).path("/").build();
        ResponseCookie c2 = ResponseCookie.from("refresh_token", "").maxAge(0).path("/").build();
        response.addHeader(HttpHeaders.SET_COOKIE, c1.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, c2.toString());
        return ResponseEntity.ok().build();
    }
}