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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import com.cabinetplus.backend.dto.SubscriptionSummaryDto;
import com.cabinetplus.backend.enums.BillingCycle;
import com.cabinetplus.backend.enums.AuditEventType;
import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Plan;
import com.cabinetplus.backend.models.RefreshToken;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.RefreshTokenRepository;
import com.cabinetplus.backend.security.RefreshTokenHash;
import com.cabinetplus.backend.services.PlanService;
import com.cabinetplus.backend.services.PlanLimitService;
import com.cabinetplus.backend.services.SubscriptionService;
import com.cabinetplus.backend.services.AuditService;
import com.cabinetplus.backend.services.PublicIdResolutionService;
import com.cabinetplus.backend.services.UserService;
import com.cabinetplus.backend.util.PaginationUtil;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final PlanService planService;
    private final PlanLimitService planLimitService;
    private final SubscriptionService subscriptionService;
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
            SubscriptionService subscriptionService,
            AuditService auditService,
            RefreshTokenRepository refreshTokenRepository,
            PublicIdResolutionService publicIdResolutionService
    ) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.planService = planService;
        this.planLimitService = planLimitService;
        this.subscriptionService = subscriptionService;
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
        auditService.logSuccess(AuditEventType.USER_READ, "USER", null, "Liste utilisateurs consultee");
        return userService.findAll();
    }

    @GetMapping("/dentists")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllDentists() {
        auditService.logSuccess(AuditEventType.USER_READ, "USER", null, "Liste dentistes consultee");
        return userService.getAllDentists();
    }

    @GetMapping("/dentists/paged")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<User> getDentistsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status
    ) {
        final UserPlanStatus statusFilter = parsePlanStatusFilter(status);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(
                        Sort.Order.by("lastname").ignoreCase().nullsLast(),
                        Sort.Order.by("firstname").ignoreCase().nullsLast(),
                        Sort.Order.asc("id")
                )
        );

        var paged = userService.searchDentistsPaged(q, statusFilter, pageable);

        auditService.logSuccess(AuditEventType.USER_READ, "USER", null, "Liste dentistes consultee (page)");
        return PaginationUtil.toPageResponse(paged);
    }

    @GetMapping("/admins")
    public List<User> getAllAdmins(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails current) {
        User currentUser = userService.findByPhoneNumber(current.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));
        auditService.logSuccessAsUser(currentUser, AuditEventType.USER_READ, "USER", null, "Liste admins consultee");
        return userService.getAllAdmins(currentUser);
    }

    @GetMapping("/admins/paged")
    public PageResponse<User> getAllAdminsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails current
    ) {
        User currentUser = userService.findByPhoneNumber(current.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(
                        Sort.Order.by("lastname").ignoreCase().nullsLast(),
                        Sort.Order.by("firstname").ignoreCase().nullsLast(),
                        Sort.Order.asc("id")
                )
        );

        var paged = userService.searchAdminsPaged(currentUser, q, pageable);

        auditService.logSuccessAsUser(currentUser, AuditEventType.USER_READ, "USER", null, "Liste admins consultee (page)");
        return PaginationUtil.toPageResponse(paged);
    }

    @GetMapping("/expiring-in/{days}")
    public List<User> getUsersExpiringIn(@PathVariable int days) {
        auditService.logSuccess(AuditEventType.USER_READ, "USER", null, "Utilisateurs expirant bientot consultes");
        return userService.getUsersExpiringInDays(days);
    }

    @GetMapping("/expiring-in/{days}/paged")
    public PageResponse<User> getUsersExpiringInPaged(
            @PathVariable int days,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status
    ) {
        final UserPlanStatus statusFilter = parsePlanStatusFilter(status);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(
                        Sort.Order.asc("dentistSubscription.expirationDate").nullsLast(),
                        Sort.Order.asc("id")
                )
        );

        var paged = userService.getUsersExpiringInDaysPaged(days, q, statusFilter, pageable);

        auditService.logSuccess(AuditEventType.USER_READ, "USER", null, "Utilisateurs expirant bientot consultes (page)");
        return PaginationUtil.toPageResponse(paged);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public User getUserById(@PathVariable String id) {
        User user = publicIdResolutionService.requireUserByIdOrPublicId(id);
        auditService.logSuccess(AuditEventType.USER_READ, "USER", user != null && user.getId() != null ? String.valueOf(user.getId()) : null, "Utilisateur consulte");
        return user;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public User createUser(@Valid @RequestBody AdminUserCreateRequest request) {
        User user = new User();
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstname(trimToNull(request.firstname()));
        user.setLastname(trimToNull(request.lastname()));
        user.setPhoneNumber(trimToNull(request.phoneNumber()));

        UserRole role = UserRole.valueOf(request.role().trim().toUpperCase());
        user.setRole(role);

        user.setPhoneVerified(false);
        user.setCreatedAt(LocalDateTime.now());
        user.setPlanStatus(UserPlanStatus.PENDING);
        user.setCanDeleteAdmin(false);

        User saved = userService.save(user);
        auditService.logSuccess(AuditEventType.USER_CREATE, "USER", saved != null && saved.getId() != null ? String.valueOf(saved.getId()) : null, "Utilisateur cree");
        if (saved != null && saved.getRole() == UserRole.ADMIN) {
            auditService.logSuccess(AuditEventType.USER_ADMIN_CREATE, "USER", String.valueOf(saved.getId()), "Creation admin");
        }
        return saved;
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public User updateUser(@PathVariable String id, @Valid @RequestBody AdminUserUpdateRequest request) {
        User existing = publicIdResolutionService.requireUserByIdOrPublicId(id);

        if (request.password() != null && !request.password().isBlank()) {
            existing.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        if (request.firstname() != null) existing.setFirstname(trimToNull(request.firstname()));
        if (request.lastname() != null) existing.setLastname(trimToNull(request.lastname()));
        if (request.phoneNumber() != null) existing.setPhoneNumber(trimToNull(request.phoneNumber()));

        User saved = userService.save(existing);
        auditService.logSuccess(AuditEventType.USER_UPDATE, "USER", saved != null && saved.getId() != null ? String.valueOf(saved.getId()) : null, "Utilisateur modifie");
        return saved;
    }

    // ===============================
    // DELETE USER (ADMIN RESTRICTION)
    // ===============================
    @DeleteMapping("/admin/delete/{id}")
    public void deleteUser(@PathVariable String id,
                           @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails current) {

        User currentUser = userService.findByPhoneNumber(current.getUsername())
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
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        // Keeps scheduled plan changes and expiration status up-to-date on read.
        User owner = userService.resolveClinicOwner(user);
        subscriptionService.refreshSubscription(owner);

        auditService.logSuccessAsUser(user, AuditEventType.USER_READ, "USER", String.valueOf(user.getId()), "Profil consulte");
        return user;
    }

    @GetMapping("/me/preferences")
    public UserPreferencesResponse getCurrentUserPreferences(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);
        auditService.logSuccessAsUser(user, AuditEventType.USER_READ, "USER", String.valueOf(owner.getId()), "Preferences consultees");
        return mapPreferences(owner);
    }

    @PutMapping("/me/preferences")
    public UserPreferencesResponse updateCurrentUserPreferences(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody UserPreferencesRequest request
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
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
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);
        auditService.logSuccessAsUser(user, AuditEventType.USER_READ, "USER", String.valueOf(owner.getId()), "Parametres gestion patients consultes");
        return mapPatientManagement(owner);
    }

    @PutMapping("/me/patient-management")
    public PatientManagementSettingsResponse updateCurrentPatientManagementSettings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody PatientManagementSettingsRequest request
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
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
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);
        auditService.logSuccessAsUser(user, AuditEventType.USER_READ, "USER", String.valueOf(owner.getId()), "Usage plan consulte");
        return planLimitService.getUsage(owner);
    }

    @GetMapping("/me/subscription-summary")
    public SubscriptionSummaryDto getCurrentSubscriptionSummary(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        User owner = userService.resolveClinicOwner(user);

        subscriptionService.refreshSubscription(owner);

        auditService.logSuccessAsUser(user, AuditEventType.USER_READ, "USER", String.valueOf(owner.getId()), "Abonnement consulte");

        return new SubscriptionSummaryDto(
                owner.getPlan() != null,
                owner.getPlanStatus() != null ? owner.getPlanStatus().name() : null,
                owner.getPlan() != null ? owner.getPlan().getName() : null,
                owner.getExpirationDate(),
                owner.getNextPlan() != null,
                owner.getNextPlan() != null ? owner.getNextPlan().getName() : null,
                owner.getNextPlanStartDate(),
                owner.getNextPlanExpirationDate()
        );
    }

    @PostMapping("/me/activate-next-plan-now")
    public User activateNextPlanNow(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!userService.isOwnerDentist(user)) {
            throw new AccessDeniedException("Seul le proprietaire du cabinet peut activer un abonnement");
        }

        User owner = userService.resolveClinicOwner(user);
        subscriptionService.refreshSubscription(owner);

        if (owner.getNextPlan() == null) {
            throw new BadRequestException(Map.of("_", "Aucun abonnement prochain a activer."));
        }

        // Re-check limits at activation time (usage may have changed since scheduling).
        planLimitService.assertUsageFitsPlan(owner, owner.getNextPlan());

        LocalDateTime now = LocalDateTime.now();
        BillingCycle cycle = owner.getNextPlanBillingCycle() != null ? owner.getNextPlanBillingCycle() : BillingCycle.MONTHLY;

        owner.setPlan(owner.getNextPlan());
        owner.setPlanBillingCycle(cycle);
        owner.setPlanStartDate(now);
        owner.setExpirationDate(computeExpiration(now, owner.getPlan(), cycle));

        owner.setNextPlan(null);
        owner.setNextPlanBillingCycle(null);
        owner.setNextPlanStartDate(null);
        owner.setNextPlanExpirationDate(null);

        owner.setPlanStatus(UserPlanStatus.ACTIVE);

        User saved = userService.save(owner);
        auditService.logSuccessAsUser(
                saved,
                AuditEventType.USER_PLAN_SELECT,
                "USER",
                String.valueOf(saved.getId()),
                "Abonnement prochain active immediatement"
        );
        return saved;
    }

    private static LocalDateTime computeExpiration(LocalDateTime startDate, Plan plan, BillingCycle cycle) {
        if (startDate == null || plan == null) return null;
        Integer monthlyPrice = plan.getMonthlyPrice();
        boolean isFree = monthlyPrice != null && monthlyPrice == 0;
        if (isFree) {
            return startDate.plusDays(7);
        }
        return (cycle == BillingCycle.YEARLY) ? startDate.plusYears(1) : startDate.plusMonths(1);
    }

    @PutMapping("/me")
    public User updateCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                                  @Valid @RequestBody CurrentUserUpdateRequest updates) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (updates.phoneNumber() != null && !updates.phoneNumber().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Le numero de telephone se modifie depuis la page Securite (verification SMS requise)."
            );
        }

        boolean updatingSensitiveProfile =
                updates.firstname() != null
                        || updates.lastname() != null
                        || updates.clinicName() != null
                        || updates.address() != null;

        if (updatingSensitiveProfile) {
            String password = updates.password();
            if (password == null || password.isBlank()) {
                throw new BadRequestException(Map.of("password", "Mot de passe requis"));
            }
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
            }
        }

        if (updates.firstname() != null) user.setFirstname(trimToNull(updates.firstname()));
        if (updates.lastname() != null) user.setLastname(trimToNull(updates.lastname()));
        if (updates.clinicName() != null) user.setClinicName(trimToNull(updates.clinicName()));
        if (updates.address() != null) user.setAddress(trimToNull(updates.address()));

        User saved = userService.save(user);
        auditService.logSuccessAsUser(
                saved,
                AuditEventType.USER_PROFILE_UPDATE,
                "USER",
                String.valueOf(saved.getId()),
                "Profil mis à jour"
        );
        return saved;
    }

    // ===============================
    // PASSWORD
    // ===============================
    @PutMapping("/me/password")
    public User updatePassword(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                               @Valid @RequestBody PasswordChangeRequest request) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
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

        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!passwordEncoder.matches(payload.password(), user.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }
        auditService.logSuccessAsUser(user, AuditEventType.USER_READ, "USER", String.valueOf(user.getId()), "Mot de passe verifie");

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
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        final String refreshTokenHash = refreshTokenCookie == null ? null : RefreshTokenHash.hash(refreshTokenCookie);

        List<RefreshToken> sessions = refreshTokenRepository.findActiveSessions(user, LocalDateTime.now());
        auditService.logSuccessAsUser(user, AuditEventType.USER_READ, "SESSION", String.valueOf(user.getId()), "Sessions consultees");
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
                        refreshTokenCookie != null && (refreshTokenCookie.equals(session.getToken()) || (refreshTokenHash != null && refreshTokenHash.equals(session.getToken())))
                ))
                .toList();
    }

    

    @DeleteMapping("/me/sessions/{sessionId}")
    public Map<String, Object> revokeSession(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @PathVariable Long sessionId,
            @CookieValue(name = "refresh_token", required = false) String refreshTokenCookie,
            @Valid @RequestBody PasswordVerifyRequest payload,
            HttpServletResponse response
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!passwordEncoder.matches(payload.password(), user.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }

        RefreshToken token = refreshTokenRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session introuvable"));

        if (token.getUser() == null || !token.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session introuvable");
        }

        token.setRevoked(true);
        refreshTokenRepository.save(token);

        String refreshTokenHash = refreshTokenCookie == null ? null : RefreshTokenHash.hash(refreshTokenCookie);
        boolean revokedCurrent = refreshTokenCookie != null && (refreshTokenCookie.equals(token.getToken()) || (refreshTokenHash != null && refreshTokenHash.equals(token.getToken())));
        if (revokedCurrent) {
            clearRefreshCookie(response);
        }

        auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGOUT, "SESSION", String.valueOf(token.getId()), "Deconnexion d'une session");

        return Map.of("revokedCurrent", revokedCurrent);
    }

    @PostMapping("/me/sessions/revoke-all")
    public Map<String, Object> revokeAllSessions(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
            @Valid @RequestBody PasswordVerifyRequest payload,
            HttpServletResponse response
    ) {
        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!passwordEncoder.matches(payload.password(), user.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }

        refreshTokenRepository.deleteAllByUser(user);

        clearRefreshCookie(response);

        auditService.logSuccessAsUser(user, AuditEventType.AUTH_LOGOUT_ALL, "USER", String.valueOf(user.getId()), "Deconnexion de tous les appareils");
        return Map.of("revoked", true);
    }

    // ===============================
    // EMAIL + PHONE VERIFICATION
    // ===============================
 

    @PutMapping("/me/verify-phone")
public User verifyPhone(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
    User user = userService.findByPhoneNumber(userDetails.getUsername())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

    if (user.getRole() == UserRole.DENTIST && !userService.isOwnerDentist(user)) {
        throw new AccessDeniedException("Les comptes employes heritent la verification du proprietaire");
    }

    user.setPhoneVerified(true); // <--- Sets the phone verification status
    User saved = userService.save(user);
    auditService.logSuccessAsUser(
            saved,
            AuditEventType.USER_PROFILE_UPDATE,
            "USER",
            String.valueOf(saved.getId()),
            "Téléphone vérifié"
    );
    return saved;
}

    // ===============================
    // USER SELECTS A PLAN
    // ===============================
    @PutMapping("/me/plan")
    public User selectPlan(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails,
                           @Valid @RequestBody PlanSelectRequest planData) {

        User user = userService.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!userService.isOwnerDentist(user)) {
            throw new AccessDeniedException("Les comptes employes heritent le plan du proprietaire");
        }

        if (!passwordEncoder.matches(planData.password(), user.getPasswordHash())) {
            throw new BadRequestException(Map.of("password", "Mot de passe incorrect"));
        }

        Plan plan = planService.findById(planData.planId())
                .orElseThrow(() -> new BadRequestException(Map.of("planId", "Plan introuvable")));

        User owner = userService.resolveClinicOwner(user);
        planLimitService.assertUsageFitsPlan(owner, plan);

        user.setPlan(plan);
        user.setPlanStatus(UserPlanStatus.WAITING);
        user.setPlanStartDate(null);
        user.setExpirationDate(null);

        User saved = userService.save(user);
        auditService.logSuccessAsUser(
                saved,
                AuditEventType.USER_PLAN_SELECT,
                "PLAN",
                plan.getId() != null ? String.valueOf(plan.getId()) : null,
                "Plan sélectionné"
        );
        return saved;
    }

    // ===============================
    // ADMIN ENDPOINTS: MANAGE PLANS
    // ===============================
    @GetMapping("/admin/waiting-plans")
    public List<User> getWaitingPlans() {
        auditService.logSuccess(AuditEventType.USER_READ, "USER", null, "Plans en attente consultes");
        return userService.findByPlanStatus(UserPlanStatus.WAITING);
    }

    @PutMapping("/admin/activate-plan/{userId}")
    public User activatePlan(@PathVariable Long userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (user.getPlan() == null) {
            throw new IllegalArgumentException("Cet utilisateur n'a pas choisi de plan");
        }

        planLimitService.assertUsageFitsPlan(user, user.getPlan());

        user.setPlanStatus(UserPlanStatus.ACTIVE);
        int durationDays = user.getPlan().getDurationDays() != null ? user.getPlan().getDurationDays() : 30;
        user.setPlanStartDate(LocalDateTime.now());
        user.setExpirationDate(LocalDateTime.now().plusDays(durationDays));

        User saved = userService.save(user);
        auditService.logSuccess(
                AuditEventType.USER_PLAN_ADMIN_ACTIVATE,
                "USER",
                String.valueOf(saved.getId()),
                "Plan activé"
        );
        return saved;
    }

    @PutMapping("/admin/deactivate-plan/{userId}")
    public User deactivatePlan(@PathVariable Long userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        user.setPlanStatus(UserPlanStatus.INACTIVE);
        user.setPlanStartDate(null);
        user.setExpirationDate(null);
        User saved = userService.save(user);
        auditService.logSuccess(
                AuditEventType.USER_PLAN_ADMIN_DEACTIVATE,
                "USER",
                String.valueOf(saved.getId()),
                "Plan désactivé"
        );
        return saved;
    }

    // ===============================
    // ADMIN MANAGEMENT: CREATE ADMIN
    // ===============================
    @PostMapping("/admin/create")
    public Map<String, Object> createAdmin(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails currentDetails,
            @Valid @RequestBody AdminCreateAdminRequest request,
            HttpServletResponse response) {

        User currentUser = userService.findByPhoneNumber(currentDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur courant introuvable"));

        boolean requestedSuperAdmin = request.canDeleteAdmin();

        // Seul le super-admin peut creer un autre super-admin
        if (requestedSuperAdmin && !currentUser.isCanDeleteAdmin()) {
            throw new AccessDeniedException("Seul le super-admin peut creer un autre super-admin");
        }

        User newAdmin = new User();
        newAdmin.setPasswordHash(passwordEncoder.encode(request.password()));
        newAdmin.setFirstname(trimToNull(request.firstname()));
        newAdmin.setLastname(trimToNull(request.lastname()));
        newAdmin.setPhoneNumber(trimToNull(request.phoneNumber()));
        newAdmin.setCanDeleteAdmin(requestedSuperAdmin);

        newAdmin.setRole(UserRole.ADMIN);
        newAdmin.setCreatedAt(LocalDateTime.now());
        newAdmin.setPlanStatus(UserPlanStatus.PENDING);
        newAdmin.setPhoneVerified(false);

        User saved = userService.createAdmin(currentUser, newAdmin);
        auditService.logSuccessAsUser(currentUser, AuditEventType.USER_ADMIN_CREATE, "USER", String.valueOf(saved.getId()), "Creation d'un compte admin");

        // Return user DTO (no automatic session switch)
        UserDto dto = new UserDto(
                saved.getId(),
                saved.getFirstname(),
                saved.getLastname(),
                saved.getPhoneNumber(),
                saved.getRole().name()
        );

        return Map.of(
                "user", dto
        );
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        // Refresh cookie is scoped to /auth in AuthController; also clear legacy / cookies if present.
        ResponseCookie authScoped = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, authScoped.toString());

        ResponseCookie legacyRootScoped = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, legacyRootScoped.toString());
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

    private static UserPlanStatus parsePlanStatusFilter(String status) {
        if (status == null) return null;
        String v = status.trim();
        if (v.isBlank() || "ALL".equalsIgnoreCase(v)) return null;
        try {
            return UserPlanStatus.valueOf(v.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(Map.of("status", "Statut invalide"));
        }
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
