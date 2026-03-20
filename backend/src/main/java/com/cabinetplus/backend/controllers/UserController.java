package com.cabinetplus.backend.controllers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cabinetplus.backend.dto.AdminCreateAdminRequest;
import com.cabinetplus.backend.dto.AdminUserCreateRequest;
import com.cabinetplus.backend.dto.AdminUserUpdateRequest;
import com.cabinetplus.backend.dto.CurrentUserUpdateRequest;
import com.cabinetplus.backend.dto.PasswordChangeRequest;
import com.cabinetplus.backend.dto.PasswordVerifyRequest;
import com.cabinetplus.backend.dto.PlanSelectRequest;
import com.cabinetplus.backend.dto.UserDto;
import com.cabinetplus.backend.dto.UserSessionResponse;
import com.cabinetplus.backend.dto.PatientManagementSettingsRequest;
import com.cabinetplus.backend.dto.PatientManagementSettingsResponse;
import com.cabinetplus.backend.dto.UserPreferencesRequest;
import com.cabinetplus.backend.dto.UserPreferencesResponse;
import com.cabinetplus.backend.dto.PlanUsageDto;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.security.JwtUtil;
import com.cabinetplus.backend.services.PlanService;
import com.cabinetplus.backend.services.PlanLimitService;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final PlanService planService;
    private final PlanLimitService planLimitService;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;
    private final PublicIdResolutionService publicIdResolutionService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    public UserController(
            UserService userService,
            PasswordEncoder passwordEncoder,
            PlanService planService,
            PlanLimitService planLimitService,
            JwtUtil jwtUtil,
            AuditService auditService,
            RefreshTokenRepository refreshTokenRepository,
            PublicIdResolutionService publicIdResolutionService
    ) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.planService = planService;
        this.planLimitService = planLimitService;
        this.jwtUtil = jwtUtil;
        this.auditService = auditService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.publicIdResolutionService = publicIdResolutionService;
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
    public User getUserById(@PathVariable String id) {
        return publicIdResolutionService.requireUserByIdOrPublicId(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public User createUser(@Valid @RequestBody AdminUserCreateRequest request) {
        User user = new User();
        user.setUsername(request.username() != null ? request.username().trim() : null);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstname(trimToNull(request.firstname()));
        user.setLastname(trimToNull(request.lastname()));
        user.setPhoneNumber(trimToNull(request.phoneNumber()));

        UserRole role = UserRole.valueOf(request.role().trim().toUpperCase());
        user.setRole(role);
        if (role == UserRole.ADMIN) {
            user.setClinicAccessRole(null);
        }

        user.setPhoneVerified(false);
        user.setCreatedAt(LocalDateTime.now());
        user.setPlanStatus(UserPlanStatus.PENDING);
        user.setCanDeleteAdmin(false);

        return userService.save(user);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public User updateUser(@PathVariable String id, @Valid @RequestBody AdminUserUpdateRequest request) {
        User existing = publicIdResolutionService.requireUserByIdOrPublicId(id);

        if (request.username() != null) existing.setUsername(request.username().trim());
        if (request.password() != null && !request.password().isBlank()) {
            existing.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        if (request.firstname() != null) existing.setFirstname(trimToNull(request.firstname()));
        if (request.lastname() != null) existing.setLastname(trimToNull(request.lastname()));
        if (request.phoneNumber() != null) existing.setPhoneNumber(trimToNull(request.phoneNumber()));

        return userService.save(existing);
    }

    // ===============================
    // DELETE USER (ADMIN RESTRICTION)
    // ===============================
    @DeleteMapping("/admin/delete/{id}")
    public void deleteUser(@PathVariable String id,
                           @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails current) {

        User currentUser = userService.findByUsername(current.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));

        User targetUser = publicIdResolutionService.requireUserByIdOrPublicId(id);

        if (targetUser.getRole() == UserRole.ADMIN && !currentUser.isCanDeleteAdmin()) {
            auditService.logFailureAsUser(
                    currentUser,
                    AuditEventType.USER_DELETE,
                    "USER",
                    String.valueOf(targetUser.getId()),
                    "Suppression refusee: droits insuffisants"
            );
            throw new AccessDeniedException("Vous ne pouvez pas supprimer un autre compte admin");
        }

        userService.delete(targetUser.getId());
        auditService.logSuccessAsUser(currentUser, AuditEventType.USER_DELETE, "USER", String.valueOf(targetUser.getId()), "Suppression utilisateur reussie");
    }

    // ===============================
    // CURRENT USER
    // ===============================
    @GetMapping("/me")
    public User getCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        return userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    @GetMapping("/me/preferences")
    public UserPreferencesResponse getCurrentUserPreferences(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);
        return mapPreferences(owner);
    }

    @PutMapping("/me/preferences")
    public UserPreferencesResponse updateCurrentUserPreferences(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody UserPreferencesRequest request
    ) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);

        owner.setWorkingHoursMode(request.workingHoursMode());
        owner.setWorkingHoursStart(request.workingHoursStart());
        owner.setWorkingHoursEnd(request.workingHoursEnd());
        owner.setTimeFormat(request.timeFormat());
        owner.setDateFormat(request.dateFormat());
        owner.setMoneyFormat(request.moneyFormat());
        owner.setCurrencyLabel(request.currencyLabel());

        User saved = userService.save(owner);
        auditService.logSuccess(
                AuditEventType.SETTINGS_PREFERENCES_UPDATE,
                "USER",
                String.valueOf(saved.getId()),
                "Préférences mises à jour"
        );
        return mapPreferences(saved);
    }

    @GetMapping("/me/patient-management")
    public PatientManagementSettingsResponse getCurrentPatientManagementSettings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);
        return mapPatientManagement(owner);
    }

    @PutMapping("/me/patient-management")
    public PatientManagementSettingsResponse updateCurrentPatientManagementSettings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody PatientManagementSettingsRequest request
    ) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);

        Integer cancelledThreshold = request != null ? request.cancelledAppointmentsThreshold() : null;
        Double owedThreshold = request != null ? request.moneyOwedThreshold() : null;

        owner.setPatientCancelledAppointmentsThreshold(cancelledThreshold != null ? Math.max(0, cancelledThreshold) : 0);
        owner.setPatientMoneyOwedThreshold(owedThreshold != null ? Math.max(0.0, owedThreshold) : 0.0);

        User saved = userService.save(owner);
        auditService.logSuccess(
                AuditEventType.SETTINGS_PATIENT_MANAGEMENT_UPDATE,
                "USER",
                String.valueOf(saved.getId()),
                "Paramètres gestion patients mis à jour"
        );
        return mapPatientManagement(saved);
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
                                  @Valid @RequestBody CurrentUserUpdateRequest updates) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (updates.phoneNumber() != null && !updates.phoneNumber().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Le numero de telephone se modifie depuis la page Securite (verification SMS requise)."
            );
        }

        if (updates.firstname() != null) user.setFirstname(trimToNull(updates.firstname()));
        if (updates.lastname() != null) user.setLastname(trimToNull(updates.lastname()));
        if (updates.clinicName() != null) user.setClinicName(trimToNull(updates.clinicName()));
        if (updates.address() != null) user.setAddress(trimToNull(updates.address()));

        return userService.save(user);
    }

    // ===============================
    // PASSWORD
    // ===============================
    @PutMapping("/me/password")
    public User updatePassword(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                               @Valid @RequestBody PasswordChangeRequest request) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getRole() == UserRole.DENTIST && !userService.isOwnerDentist(user)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Les comptes employes ne peuvent pas modifier le mot de passe. Contactez le proprietaire du cabinet."
                    );
        }

        if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new BadRequestException(Map.of("oldPassword", "Ancien mot de passe incorrect"));
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        User saved = userService.save(user);
        if (request.logoutAllOrFalse()) {
            refreshTokenRepository.deleteAllByUser(saved);
        }
        auditService.logSuccessAsUser(saved, AuditEventType.USER_PASSWORD_CHANGE, "USER", String.valueOf(saved.getId()), "Mot de passe modifie");
        return saved;
    }

    @PostMapping("/me/verify-password")
    public Map<String, Object> verifyPassword(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody PasswordVerifyRequest payload) {

        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!passwordEncoder.matches(payload.password(), user.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }

        return Map.of("valid", true);
    }

    // ===============================
    // SESSIONS
    // ===============================
    @GetMapping("/me/sessions")
    public List<UserSessionResponse> getMySessions(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @CookieValue(name = "refresh_token", required = false) String refreshTokenCookie
    ) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        List<RefreshToken> sessions = refreshTokenRepository.findActiveSessions(user, LocalDateTime.now());
        return sessions.stream()
                .map(session -> new UserSessionResponse(
                        session.getId(),
                        session.getCreatedAt(),
                        session.getLastUsedAt(),
                        session.getExpiresAt(),
                        session.getUserAgent(),
                        session.getIpAddress(),
                        session.getLocation(),
                        session.getDeviceId(),
                        refreshTokenCookie != null && refreshTokenCookie.equals(session.getToken())
                ))
                .toList();
    }

    

    @DeleteMapping("/me/sessions/{sessionId}")
    public Map<String, Object> revokeSession(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @PathVariable Long sessionId,
            @CookieValue(name = "refresh_token", required = false) String refreshTokenCookie,
            HttpServletResponse response
    ) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        RefreshToken token = refreshTokenRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session introuvable"));

        if (token.getUser() == null || !token.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session introuvable");
        }

        token.setRevoked(true);
        refreshTokenRepository.save(token);

        boolean revokedCurrent = refreshTokenCookie != null && refreshTokenCookie.equals(token.getToken());
        if (revokedCurrent) {
            ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                    .httpOnly(true)
                    .secure(cookieSecure)
                    .sameSite(cookieSameSite)
                    .path("/")
                    .maxAge(0)
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }

        auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGOUT, "SESSION", String.valueOf(token.getId()), "Deconnexion d'une session");

        return Map.of("revokedCurrent", revokedCurrent);
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
                           @Valid @RequestBody PlanSelectRequest planData) {

        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getRole() == UserRole.DENTIST && !userService.isOwnerDentist(user)) {
            throw new AccessDeniedException("Les comptes employes heritent le plan du proprietaire");
        }

        Plan plan = planService.findById(planData.planId())
                .orElseThrow(() -> new BadRequestException(Map.of("planId", "Plan introuvable")));

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
            @Valid @RequestBody AdminCreateAdminRequest request,
            HttpServletResponse response) {

        User currentUser = userService.findByUsername(currentDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));

        boolean requestedSuperAdmin = request.canDeleteAdmin();

        // Seul le super-admin peut creer un autre super-admin
        if (requestedSuperAdmin && !currentUser.isCanDeleteAdmin()) {
            throw new AccessDeniedException("Seul le super-admin peut creer un autre super-admin");
        }

        User newAdmin = new User();
        newAdmin.setUsername(request.username() != null ? request.username().trim() : null);
        newAdmin.setPasswordHash(passwordEncoder.encode(request.password()));
        newAdmin.setFirstname(trimToNull(request.firstname()));
        newAdmin.setLastname(trimToNull(request.lastname()));
        newAdmin.setPhoneNumber(trimToNull(request.phoneNumber()));
        newAdmin.setCanDeleteAdmin(requestedSuperAdmin);

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
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
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

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isBlank() ? null : v;
    }

    private UserPreferencesResponse mapPreferences(User user) {
        return new UserPreferencesResponse(
                user.getWorkingHoursMode(),
                user.getWorkingHoursStart(),
                user.getWorkingHoursEnd(),
                user.getTimeFormat(),
                user.getDateFormat(),
                user.getMoneyFormat(),
                user.getCurrencyLabel()
        );
    }

    private PatientManagementSettingsResponse mapPatientManagement(User user) {
        Integer cancelled = user.getPatientCancelledAppointmentsThreshold();
        Double owed = user.getPatientMoneyOwedThreshold();
        return new PatientManagementSettingsResponse(
                cancelled != null ? Math.max(0, cancelled) : 0,
                owed != null ? Math.max(0.0, owed) : 0.0
        );
    }

    private boolean shouldLogoutAll(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean booleanValue) return booleanValue;
        return Boolean.parseBoolean(String.valueOf(value));
    }
}
