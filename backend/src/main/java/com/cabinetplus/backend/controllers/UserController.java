package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.UserDto;
import com.cabinetplus.backend.dto.PlanUsageDto;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.PlanService;
import com.cabinetplus.backend.services.PlanLimitService;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.UserService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final PlanService planService;
    private final PlanLimitService planLimitService;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;

    public UserController(
            UserService userService,
            PasswordEncoder passwordEncoder,
            PlanService planService,
            PlanLimitService planLimitService,
            JwtUtil jwtUtil,
            AuditService auditService
    ) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.planService = planService;
        this.planLimitService = planLimitService;
        this.jwtUtil = jwtUtil;
        this.auditService = auditService;
    }

    // ===============================
    // BASIC CRUD
    // ===============================
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/dentists")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllDentists() {
        return userService.getAllDentists();
    }

    @GetMapping("/admins")
    public List<User> getAllAdmins(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails current) {
        User currentUser = userService.findByUsername(current.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));
        return userService.getAllAdmins(currentUser);
    }

    @GetMapping("/expiring-in/{days}")
    public List<User> getUsersExpiringIn(@PathVariable int days) {
        return userService.getUsersExpiringInDays(days);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public User getUserById(@PathVariable Long id) {
        return userService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public User createUser(@RequestBody User user) {
        return userService.save(user);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));

        User targetUser = userService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (targetUser.getRole() == UserRole.ADMIN && !currentUser.isCanDeleteAdmin()) {
            auditService.logFailureAsUser(
                    currentUser,
                    AuditEventType.USER_DELETE,
                    "USER",
                    String.valueOf(id),
                    "Suppression refusee: droits insuffisants"
            );
            throw new AccessDeniedException("Vous ne pouvez pas supprimer un autre compte admin");
        }

        userService.delete(id);
        auditService.logSuccessAsUser(currentUser, AuditEventType.USER_DELETE, "USER", String.valueOf(id), "Suppression utilisateur reussie");
    }

    // ===============================
    // CURRENT USER
    // ===============================
    @GetMapping("/me")
    public User getCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        return userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    @GetMapping("/me/plan-usage")
    public PlanUsageDto getCurrentPlanUsage(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);
        return planLimitService.getPlanUsage(owner);
    }

    @PutMapping("/me")
    public User updateCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                  @RequestBody Map<String, Object> updates) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        String oldPassword = passwords.get("oldPassword");
        String newPassword = passwords.get("newPassword");

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new AccessDeniedException("Ancien mot de passe incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        User saved = userService.save(user);
        auditService.logSuccessAsUser(saved, AuditEventType.USER_PASSWORD_CHANGE, "USER", String.valueOf(saved.getId()), "Mot de passe modifie");
        return saved;
    }

    @PostMapping("/me/verify-password")
    public Map<String, Object> verifyPassword(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @RequestBody Map<String, String> payload) {

        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        String password = payload.get("password");
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Mot de passe requis");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new AccessDeniedException("Mot de passe incorrect");
        }

        return Map.of("valid", true);
    }

    // ===============================
    // EMAIL + PHONE VERIFICATION
    // ===============================
 

    @PutMapping("/me/verify-phone")
public User verifyPhone(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
    User user = userService.findByUsername(userDetails.getUsername())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

    if (user.getRole() == UserRole.DENTIST && !userService.isOwnerDentist(user)) {
        throw new AccessDeniedException("Les comptes employes heritent la verification du proprietaire");
    }

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getRole() == UserRole.DENTIST && !userService.isOwnerDentist(user)) {
            throw new AccessDeniedException("Les comptes employes heritent le plan du proprietaire");
        }

        if (!planData.containsKey("planId")) {
            throw new IllegalArgumentException("planId est obligatoire");
        }

        Plan plan = planService.findById(Long.parseLong(planData.get("planId")))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan introuvable"));

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getPlan() == null) {
            throw new IllegalArgumentException("Cet utilisateur n'a pas choisi de plan");
        }

        user.setPlanStatus(UserPlanStatus.ACTIVE);
        int durationDays = user.getPlan().getDurationDays() != null ? user.getPlan().getDurationDays() : 30;
        user.setExpirationDate(LocalDateTime.now().plusDays(durationDays));

        return userService.save(user);
    }

    @PutMapping("/admin/deactivate-plan/{userId}")
    public User deactivatePlan(@PathVariable Long userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));

        // Seul le super-admin peut creer un autre super-admin
        if (newAdmin.isCanDeleteAdmin() && !currentUser.isCanDeleteAdmin()) {
            throw new AccessDeniedException("Seul le super-admin peut creer un autre super-admin");
        }

        if (newAdmin.getPasswordHash() == null || newAdmin.getPasswordHash().isBlank()) {
            newAdmin.setPasswordHash(passwordEncoder.encode("DefaultPassword123!"));
        }

        newAdmin.setRole(UserRole.ADMIN);
        newAdmin.setClinicAccessRole(null);
        newAdmin.setCreatedAt(LocalDateTime.now());
        newAdmin.setPlanStatus(UserPlanStatus.PENDING);
        newAdmin.setPhoneVerified(false);

        User saved = userService.createAdmin(currentUser, newAdmin);
        auditService.logSuccessAsUser(currentUser, AuditEventType.USER_ADMIN_CREATE, "USER", String.valueOf(saved.getId()), "Creation d'un compte admin");

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

