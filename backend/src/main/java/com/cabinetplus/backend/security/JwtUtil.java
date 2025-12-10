package com.cabinetplus.backend.security;

import java.security.Key;
import java.util.Date;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {

    private final Key key = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    // Access token: 15 minutes
    private final long accessExpirationMs = 15 * 60 * 1000;

    // Refresh token: 7 days
    private final long refreshExpirationMs = 7 * 24 * 60 * 60 * 1000;

    // ============================
    // ACCESS TOKEN GENERATION
    // ============================
 public String generateAccessToken(User user) {
    return Jwts.builder()
            .setSubject(user.getUsername())
            .claim("role", user.getRole().name())
            .claim("isEmailVerified", user.isEmailVerified())
            .claim("isPhoneVerified", user.isPhoneVerified())
            .claim("planStatus", 
                   user.getRole() == UserRole.ADMIN 
                   ? "ACTIVE" 
                   : (user.getPlanStatus() != null ? user.getPlanStatus().name() : "PENDING"))
            .claim("planId", user.getPlan() != null ? user.getPlan().getId() : null)
            // ✅ Only add plan code
            .claim("plan", user.getPlan() != null ? Map.of("code", user.getPlan().getCode()) : null)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + accessExpirationMs))
            .signWith(key)
            .compact();
}



    // ============================
    // REFRESH TOKEN GENERATION
    // ============================
    public String generateRefreshToken(String username, long customExpirationMs) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + customExpirationMs))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String username) {
        return generateRefreshToken(username, refreshExpirationMs);
    }

    // ============================
    // TOKEN VALIDATION / EXTRACTION
    // ============================
    public String extractUsername(String token) {
        return parseClaims(token).getBody().getSubject();
    }

    public String extractRole(String token) {
        return (String) parseClaims(token).getBody().get("role");
    }

    public String extractPlanStatus(String token) {
        return (String) parseClaims(token).getBody().get("planStatus"); // ✅ new helper
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Jws<Claims> parseClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
    }
}
