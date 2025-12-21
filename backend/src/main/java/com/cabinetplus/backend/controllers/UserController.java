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

import com.cabinetplus.backend.dto.UserDto;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.PlanService;
import com.cabinetplus.backend.services.UserService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final PlanService planService;
    private final JwtUtil jwtUtil;

    public UserController(UserService userService, PasswordEncoder passwordEncoder, PlanService planService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.planService = planService;
        this.jwtUtil = jwtUtil;
    }

    // ===============================
    // BASIC CRUD
    // ===============================
    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/dentists")
    public List<User> getAllDentists() {
        return userService.getAllDentists();
    }

    @GetMapping("/admins")
    public List<User> getAllAdmins(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails current) {
        User currentUser = userService.findByUsername(current.getUsername())
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        return userService.getAllAdmins(currentUser);
    }

    @GetMapping("/expiring-in/{days}")
    public List<User> getUsersExpiringIn(@PathVariable int days) {
        return userService.getUsersExpiringInDays(days);
    }

    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {
        return userService.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
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

    // ===============================
    // DELETE USER (ADMIN RESTRICTION)
    // ===============================
    @DeleteMapping("/admin/delete/{id}")
    public void deleteUser(@PathVariable Long id,
                           @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails current) {

        User currentUser = userService.findByUsername(current.getUsername())
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        User targetUser = userService.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (targetUser.getRole() == UserRole.ADMIN && !currentUser.isCanDeleteAdmin()) {
            throw new RuntimeException("You cannot delete another admin account");
        }

        userService.delete(id);
    }

    // ===============================
    // CURRENT USER
    // ===============================
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
        if (updates.containsKey("phoneNumber")) user.setPhoneNumber((String) updates.get("phoneNumber"));
        if (updates.containsKey("clinicName")) user.setClinicName((String) updates.get("clinicName"));
        if (updates.containsKey("address")) user.setAddress((String) updates.get("address"));

        return userService.save(user);
    }

    // ===============================
    // PASSWORD
    // ===============================
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

    // ===============================
    // EMAIL + PHONE VERIFICATION
    // ===============================
 

    @PutMapping("/me/verify-phone")
public User verifyPhone(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
    User user = userService.findByUsername(userDetails.getUsername())
        .orElseThrow(() -> new RuntimeException("User not found"));

    user.setPhoneVerified(true); // <--- Sets the phone verification status
    return userService.save(user);
}

    // ===============================
    // USER SELECTS A PLAN
    // ===============================
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
        user.setPlanStatus(UserPlanStatus.WAITING);
        user.setExpirationDate(null);

        return userService.save(user);
    }

    // ===============================
    // ADMIN ENDPOINTS: MANAGE PLANS
    // ===============================
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

    // ===============================
    // ADMIN MANAGEMENT: CREATE ADMIN
    // ===============================
    @PostMapping("/admin/create")
    public Map<String, Object> createAdmin(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails currentDetails,
            @RequestBody User newAdmin,
            HttpServletResponse response) {

        User currentUser = userService.findByUsername(currentDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        // Only super-admin can create another super-admin
        if (newAdmin.isCanDeleteAdmin() && !currentUser.isCanDeleteAdmin()) {
            throw new RuntimeException("Only super-admin can create another super-admin");
        }

        if (newAdmin.getPasswordHash() == null || newAdmin.getPasswordHash().isBlank()) {
            newAdmin.setPasswordHash(passwordEncoder.encode("DefaultPassword123!"));
        }

        newAdmin.setRole(UserRole.ADMIN);
        newAdmin.setCreatedAt(LocalDateTime.now());
        newAdmin.setPlanStatus(UserPlanStatus.PENDING);
        newAdmin.setPhoneVerified(false);

        User saved = userService.createAdmin(currentUser, newAdmin);

        // Generate JWT immediately
        String accessToken = jwtUtil.generateAccessToken(saved);
        String refreshToken = jwtUtil.generateRefreshToken(saved.getUsername());

        Cookie cookie = new Cookie("refresh_token", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // local dev
        cookie.setPath("/auth/refresh");
        cookie.setMaxAge(7 * 24 * 60 * 60);
        response.addCookie(cookie);

        // Return user DTO + access token
        UserDto dto = new UserDto(
                saved.getId(),
                saved.getUsername(),
                saved.getFirstname(),
                saved.getLastname(),
                saved.getPhoneNumber(),
                saved.getRole().name()
        );

        return Map.of(
                "user", dto,
                "accessToken", accessToken
        );
    }
}
