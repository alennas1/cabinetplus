package com.cabinetplus.backend.security;

import java.security.Key;
import java.util.Date;

import org.springframework.stereotype.Component;

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

    // Generate access token with full user info
    public String generateAccessToken(User user) {
        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("role", user.getRole().name())                 // existing claim
                .claim("isEmailVerified", user.isEmailVerified())    // new claim
                .claim("isPhoneVerified", user.isPhoneVerified())    // new claim
                .claim("planStatus", user.getPlanStatus().name())    // new claim
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + accessExpirationMs))
                .signWith(key)
                .compact();
    }

    // Generate refresh token with optional custom expiration
    public String generateRefreshToken(String username, long customExpirationMs) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + customExpirationMs))
                .signWith(key)
                .compact();
    }

    // Default 7 days
    public String generateRefreshToken(String username) {
        return generateRefreshToken(username, refreshExpirationMs);
    }

    public String extractUsername(String token) {
        return parseClaims(token).getBody().getSubject();
    }

    public String extractRole(String token) {
        return (String) parseClaims(token).getBody().get("role");
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
