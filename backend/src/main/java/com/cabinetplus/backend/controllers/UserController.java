package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.services.PlanService;
import com.cabinetplus.backend.services.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final PlanService planService;

    public UserController(UserService userService, PasswordEncoder passwordEncoder, PlanService planService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.planService = planService;
    }

    // ==========================================================
    // BASIC CRUD
    // ==========================================================
    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {
        return userService.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
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

    // ==========================================================
    // CURRENT USER
    // ==========================================================
    @GetMapping("/me")
    public User getCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        return userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PutMapping("/me")
    public User updateCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                  @RequestBody Map<String, Object> updates) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (updates.containsKey("firstname")) user.setFirstname((String) updates.get("firstname"));
        if (updates.containsKey("lastname")) user.setLastname((String) updates.get("lastname"));
        if (updates.containsKey("email")) user.setEmail((String) updates.get("email"));
        if (updates.containsKey("phoneNumber")) user.setPhoneNumber((String) updates.get("phoneNumber"));

        return userService.save(user);
    }

    // ==========================================================
    // PASSWORD
    // ==========================================================
    @PutMapping("/me/password")
    public User updatePassword(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                               @RequestBody Map<String, String> passwords) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String oldPassword = passwords.get("oldPassword");
        String newPassword = passwords.get("newPassword");

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new RuntimeException("Ancien mot de passe incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        return userService.save(user);
    }

    // ==========================================================
    // EMAIL + PHONE VERIFICATION
    // ==========================================================
    @PutMapping("/me/verify-email")
    public User verifyEmail(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setEmailVerified(true);
        return userService.save(user);
    }

    @PutMapping("/me/verify-phone")
    public User verifyPhone(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPhoneVerified(true);
        return userService.save(user);
    }

    // ==========================================================
    // USER SELECTS A PLAN (PLAN NOT ACTIVE YET)
    // ==========================================================
    @PutMapping("/me/plan")
    public User selectPlan(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                           @RequestBody Map<String, String> planData) {

        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!planData.containsKey("planId")) {
            throw new RuntimeException("planId is required");
        }

        Plan plan = planService.findById(Long.parseLong(planData.get("planId")))
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        user.setPlan(plan);
        user.setPlanStatus(UserPlanStatus.WAITING); // selected but not activated
        user.setExpirationDate(null); // will be set when admin activates

        return userService.save(user);
    }

    // ==========================================================
    // ADMIN ENDPOINTS: MANAGE WAITING PLANS
    // ==========================================================
    @GetMapping("/admin/waiting-plans")
    public List<User> getWaitingPlans() {
        return userService.findByPlanStatus(UserPlanStatus.WAITING);
    }

    @PutMapping("/admin/activate-plan/{userId}")
    public User activatePlan(@PathVariable Long userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getPlan() == null) {
            throw new RuntimeException("User has not selected a plan");
        }

        user.setPlanStatus(UserPlanStatus.ACTIVE);

        // Set expiration from activation date
        int durationDays = user.getPlan().getDurationDays() != null ? user.getPlan().getDurationDays() : 30;
        user.setExpirationDate(LocalDateTime.now().plusDays(durationDays));

        return userService.save(user);
    }

    @PutMapping("/admin/deactivate-plan/{userId}")
    public User deactivatePlan(@PathVariable Long userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPlanStatus(UserPlanStatus.INACTIVE);
        user.setExpirationDate(null);
        return userService.save(user);
    }
}
