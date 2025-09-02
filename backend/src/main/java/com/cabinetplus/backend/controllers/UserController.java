package com.cabinetplus.backend.controllers;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

     private final UserService userService;
    private final PasswordEncoder passwordEncoder; // Injected encoder

    public UserController(UserService userService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public Optional<User> getUserById(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        return userService.save(user);
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        return userService.save(user);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }
@GetMapping("/me")
public User getCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
    String username = userDetails.getUsername();
    return userService.findByUsername(username)
                      .orElseThrow(() -> new RuntimeException("User not found"));
}
@PutMapping("/me")
public User updateCurrentUser(
        @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
        @RequestBody Map<String, Object> updates) { // receive a map instead of full User
    String username = userDetails.getUsername();
    User user = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

    // Update only the fields present in the request
    if (updates.containsKey("firstname")) user.setFirstname((String) updates.get("firstname"));
    if (updates.containsKey("lastname")) user.setLastname((String) updates.get("lastname"));
    if (updates.containsKey("email")) user.setEmail((String) updates.get("email"));
    if (updates.containsKey("phoneNumber")) user.setPhoneNumber((String) updates.get("phoneNumber"));

    return userService.save(user);
}
@PutMapping("/me/password")
    public User updatePassword(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @RequestBody Map<String, String> passwords) {
        String username = userDetails.getUsername();
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String oldPassword = passwords.get("oldPassword");
        String newPassword = passwords.get("newPassword");

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new RuntimeException("Ancien mot de passe incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        return userService.save(user);
    }

}
