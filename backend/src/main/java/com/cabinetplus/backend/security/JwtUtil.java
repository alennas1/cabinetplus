package com.cabinetplus.backend.security;

import java.security.Key;
import java.util.Date;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {

    // ✅ Injected from application.properties
    // This key must stay the same across server restarts
    @Value("${jwt.secret}")
private String secretKey;

@Value("${jwt.access.expiration-ms}")
private long accessExpirationMs;

@Value("${jwt.refresh.expiration-ms}")
private long refreshExpirationMs;
    /**
     * Helper to decode the Base64 secret into a HMAC Key object
     */
    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ============================
    // ACCESS TOKEN GENERATION
    // ============================
    public String generateAccessToken(User user) {
        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("role", user.getRole().name())
                .claim("isPhoneVerified", user.isPhoneVerified())
                .claim("planStatus", 
                       user.getRole() == UserRole.ADMIN 
                       ? "ACTIVE" 
                       : (user.getPlanStatus() != null ? user.getPlanStatus().name() : "PENDING"))
                .claim("planId", user.getPlan() != null ? user.getPlan().getId() : null)
                // Added plan code as per your logic
                .claim("plan", user.getPlan() != null ? Map.of("code", user.getPlan().getCode()) : null)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + accessExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
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
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
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
        return (String) parseClaims(token).getBody().get("planStatus");
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            // Token is expired
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            // Token is malformed or signature is invalid
            return false;
        }
    }

    private Jws<Claims> parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
    }
}