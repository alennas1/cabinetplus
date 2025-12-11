package com.cabinetplus.backend.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.enums.UserPlanStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // ===============================
    // BASIC CRUD
    // ===============================
    public User save(User user) {
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }
        if (user.getPlanStatus() == null) {
            user.setPlanStatus(UserPlanStatus.PENDING);
        }
        if (user.isCanDeleteAdmin() == false) {
            user.setCanDeleteAdmin(false);
        }
        return userRepository.save(user);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    public List<User> findByPlanStatus(UserPlanStatus status) {
        return userRepository.findByPlanStatus(status);
    }

    public List<User> getAllDentists() {
        return userRepository.findByRole(UserRole.DENTIST);
    }

    // ===============================
    // ADMIN METHODS
    // ===============================

    // Normal admin sees only regular admins; super-admin sees all admins
    public List<User> getAllAdmins(User currentUser) {
        if (currentUser.isCanDeleteAdmin()) {
            return userRepository.findByRole(UserRole.ADMIN);
        } else {
            return userRepository.findByRole(UserRole.ADMIN)
                    .stream()
                    .filter(u -> !u.isCanDeleteAdmin()) // hide super-admins
                    .collect(Collectors.toList());
        }
    }

    // Only super-admin can delete another admin
    public void deleteUser(User currentUser, User targetUser) {
        if (targetUser.getRole() == UserRole.ADMIN && !currentUser.isCanDeleteAdmin()) {
            throw new RuntimeException("You cannot delete an admin account");
        }
        userRepository.delete(targetUser);
    }

    // Create admin: only super-admin can create another super-admin
    public User createAdmin(User currentUser, User newAdmin) {
        if (newAdmin.isCanDeleteAdmin() && !currentUser.isCanDeleteAdmin()) {
            throw new RuntimeException("Only super-admin can create another super-admin");
        }

        newAdmin.setRole(UserRole.ADMIN);
        if (newAdmin.getCreatedAt() == null) newAdmin.setCreatedAt(LocalDateTime.now());
        if (newAdmin.getPlanStatus() == null) newAdmin.setPlanStatus(UserPlanStatus.PENDING);
        if (!newAdmin.isCanDeleteAdmin()) newAdmin.setCanDeleteAdmin(false);
        if (newAdmin.getEmail() == null) newAdmin.setEmail("");
        if (newAdmin.getFirstname() == null) newAdmin.setFirstname("");
        if (newAdmin.getLastname() == null) newAdmin.setLastname("");
        newAdmin.setEmailVerified(false);
        newAdmin.setPhoneVerified(false);

        return userRepository.save(newAdmin);
    }

    // ===============================
    // PLAN METHODS
    // ===============================
    public List<User> getUsersExpiringInDays(int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime targetDateStart = now.plusDays(days).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime targetDateEnd = targetDateStart.plusDays(1); // full day
        return userRepository.findUsersWithExpiringPlans(targetDateStart, targetDateEnd);
    }
}
