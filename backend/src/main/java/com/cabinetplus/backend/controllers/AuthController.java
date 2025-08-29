package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body) {
        try {
            String username = body.get("username");
            String password = body.get("password");

            Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));

            String role = auth.getAuthorities().iterator().next().getAuthority();
            String token = jwtUtil.generateToken(auth.getName(), role);

            return Map.of("token", token);

        } catch (AuthenticationException e) {
            throw new RuntimeException("Invalid username/password");
        }
    }
@PostMapping("/register")
public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
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

    UserDto dto = new UserDto(
        saved.getId(),
        saved.getUsername(),
        saved.getFirstname(),
        saved.getLastname(),
        saved.getEmail(),
        saved.getPhoneNumber(),
        saved.getRole().name()
    );

    return ResponseEntity.ok(dto);
}


}
