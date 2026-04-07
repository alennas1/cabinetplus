package com.cabinetplus.backend.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.dto.EmployeeWorkingHoursDTO;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.EmployeeWorkingHoursRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.util.PhoneNumberUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final EmployeeWorkingHoursRepository workingHoursRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlanLimitService planLimitService;
    private final EmployeeSetupCodeService employeeSetupCodeService;

    // --- Create ---
    public EmployeeResponseDTO saveEmployee(EmployeeRequestDTO dto, User dentist) {
        String normalizedPhone = normalizePhone(dto.getPhone());
        assertDatesCoherent(dto.getHireDate(), dto.getEndDate());
        planLimitService.assertEmployeeLimitNotReached(dentist);
        assertPhoneUnique(normalizedPhone, null);
        User linkedUser = createLinkedUser(dentist, dto, normalizedPhone);

        Employee employee = Employee.builder()
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .gender(dto.getGender())
                .dateOfBirth(dto.getDateOfBirth())
                .nationalId(dto.getNationalId())
                .phone(normalizedPhone)
                .email(dto.getEmail())
                .address(dto.getAddress())
                .hireDate(dto.getHireDate())
                .endDate(dto.getEndDate())
                .status(dto.getStatus())
                .salary(dto.getSalary())
                .contractType(dto.getContractType())
                .dentist(dentist)
                .user(linkedUser)
                .setupCode(employeeSetupCodeService.nextSetupCode())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .recordStatus(RecordStatus.ACTIVE)
                .build();

        Employee saved = employeeRepository.save(employee);

        // Default working hours (08:00 - 16:00 for all 7 days)
        List<EmployeeWorkingHours> defaultHours = Arrays.stream(DayOfWeek.values())
                .map(day -> EmployeeWorkingHours.builder()
                        .employee(saved)
                        .dayOfWeek(day)
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(16, 0))
                        .build())
                .collect(Collectors.toList());

        workingHoursRepository.saveAll(defaultHours);

        List<EmployeeWorkingHoursDTO> schedules = defaultHours.stream()
                .map(h -> EmployeeWorkingHoursDTO.builder()
                        .id(h.getId())
                        .dayOfWeek(h.getDayOfWeek())
                        .startTime(h.getStartTime())
                        .endTime(h.getEndTime())
                        .build())
                .collect(Collectors.toList());

        return mapToResponse(saved, schedules);
    }

    // --- Update ---
    public EmployeeResponseDTO updateEmployee(Long id, EmployeeRequestDTO dto, User dentist) {
        Employee existing = employeeRepository.findByIdAndDentist(id, dentist)
                .orElseThrow(() -> new RuntimeException("Employe introuvable with id " + id));
        if (existing.getArchivedAt() != null || existing.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException(java.util.Map.of("_", "Employe archive : lecture seule."));
        }

        User linkedUser = existing.getUser();
        Long linkedUserId = linkedUser != null ? linkedUser.getId() : null;
        String normalizedPhone = normalizePhone(dto.getPhone());
        assertDatesCoherent(dto.getHireDate(), dto.getEndDate());

        // Phone number changes must go through Twilio verification (see /api/verify/phone-change/*).
        String storedPhone = linkedUser != null && hasText(linkedUser.getPhoneNumber())
                ? linkedUser.getPhoneNumber()
                : existing.getPhone();
        if (hasText(storedPhone)) {
            var storedCandidates = PhoneNumberUtil.algeriaStoredCandidates(storedPhone);
            if (!storedCandidates.isEmpty() && !storedCandidates.contains(normalizedPhone)) {
                throw new BadRequestException(java.util.Map.of(
                        "phone",
                        "Pour modifier le numero de telephone, utilisez la verification SMS."
                ));
            }
        }

        assertPhoneUnique(normalizedPhone, linkedUserId);

        if (linkedUser == null) {
            linkedUser = createLinkedUser(dentist, dto, normalizedPhone);
            existing.setUser(linkedUser);
        } else if (dto.getPermissions() != null) {
            Set<String> requested = dto.getPermissions().stream()
                    .filter(this::hasText)
                    .map(String::trim)
                    .collect(Collectors.toSet());
            linkedUser.setPermissions(sanitizeEmployeePermissions(requested));
        }

        existing.setFirstName(dto.getFirstName());
        existing.setLastName(dto.getLastName());
        existing.setGender(dto.getGender());
        existing.setDateOfBirth(dto.getDateOfBirth());
        existing.setNationalId(dto.getNationalId());
        existing.setPhone(normalizedPhone);
        existing.setEmail(dto.getEmail());
        existing.setAddress(dto.getAddress());
        existing.setHireDate(dto.getHireDate());
        existing.setEndDate(dto.getEndDate());
        existing.setStatus(dto.getStatus());
        existing.setSalary(dto.getSalary());
        existing.setContractType(dto.getContractType());
        existing.setUpdatedAt(LocalDateTime.now());

        if (linkedUser != null) {
            linkedUser.setFirstname(dto.getFirstName());
            linkedUser.setLastname(dto.getLastName());
            if (!normalizedPhone.equals(linkedUser.getPhoneNumber())) {
                linkedUser.setPhoneNumber(normalizedPhone);
                linkedUser.setPhoneVerified(false);
                linkedUser.setAccountSetupCompleted(false);
                linkedUser.setEmployeeGestionCabinetPinEnabled(false);
                linkedUser.setEmployeeGestionCabinetPinHash(null);
                linkedUser.setEmployeeGestionCabinetPinUpdatedAt(LocalDateTime.now());
            }
            userRepository.save(linkedUser);
        }

        Employee updated = employeeRepository.save(existing);

        List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(updated);
        List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                .map(h -> EmployeeWorkingHoursDTO.builder()
                        .id(h.getId())
                        .dayOfWeek(h.getDayOfWeek())
                        .startTime(h.getStartTime())
                        .endTime(h.getEndTime())
                        .build())
                .collect(Collectors.toList());

        return mapToResponse(updated, schedules);
    }

    // --- Get All ---
    public List<EmployeeResponseDTO> getAllEmployeesForDentist(User dentist) {
        return employeeRepository.findAllByDentistAndArchivedAtIsNullAndRecordStatus(dentist, RecordStatus.ACTIVE)
                .stream()
                .map(emp -> {
                    List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(emp);
                    List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                            .map(h -> EmployeeWorkingHoursDTO.builder()
                                    .id(h.getId())
                                    .dayOfWeek(h.getDayOfWeek())
                                    .startTime(h.getStartTime())
                                    .endTime(h.getEndTime())
                                    .build())
                            .collect(Collectors.toList());
                    return mapToResponse(emp, schedules);
                })
                .collect(Collectors.toList());
    }

    public List<EmployeeResponseDTO> getArchivedEmployeesForDentist(User dentist) {
        return employeeRepository.findArchivedByDentist(dentist)
                .stream()
                .map(emp -> {
                    List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(emp);
                    List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                            .map(h -> EmployeeWorkingHoursDTO.builder()
                                    .id(h.getId())
                                    .dayOfWeek(h.getDayOfWeek())
                                    .startTime(h.getStartTime())
                                    .endTime(h.getEndTime())
                                    .build())
                            .collect(Collectors.toList());
                    return mapToResponse(emp, schedules);
                })
                .collect(Collectors.toList());
    }

    // Lightweight mapping for list/table pages (no working hours payload)
    public EmployeeResponseDTO toListResponse(Employee employee) {
        return mapToResponse(employee, List.of());
    }

    public Page<Employee> searchEmployeesForDentist(User dentist, String q, Pageable pageable) {
        String safeQ = q != null ? q.trim().toLowerCase() : "";
        return employeeRepository.searchActiveByDentist(dentist, safeQ, pageable);
    }

    public Page<Employee> searchArchivedEmployeesForDentist(User dentist, String q, Pageable pageable) {
        String safeQ = q != null ? q.trim().toLowerCase() : "";
        return employeeRepository.searchArchivedByDentist(dentist, safeQ, pageable);
    }

    // --- Get by ID ---
    public Optional<EmployeeResponseDTO> getEmployeeByIdForDentist(Long id, User dentist) {
        return employeeRepository.findByIdAndDentist(id, dentist)
                .map(emp -> {
                    List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(emp);
                    List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                            .map(h -> EmployeeWorkingHoursDTO.builder()
                                    .id(h.getId())
                                    .dayOfWeek(h.getDayOfWeek())
                                    .startTime(h.getStartTime())
                                    .endTime(h.getEndTime())
                                    .build())
                            .collect(Collectors.toList());
                    return mapToResponse(emp, schedules);
                });
    }

    public Optional<EmployeeResponseDTO> getEmployeeByUser(User user) {
        if (user == null) return Optional.empty();

        return employeeRepository.findByUser(user)
                .map(emp -> {
                    List<EmployeeWorkingHours> hours = workingHoursRepository.findByEmployee(emp);
                    List<EmployeeWorkingHoursDTO> schedules = hours.stream()
                            .map(h -> EmployeeWorkingHoursDTO.builder()
                                    .id(h.getId())
                                    .dayOfWeek(h.getDayOfWeek())
                                    .startTime(h.getStartTime())
                                    .endTime(h.getEndTime())
                                    .build())
                            .collect(Collectors.toList());
                    return mapToResponse(emp, schedules);
                });
    }

    // --- Delete ---
    public void archiveEmployee(Long id, User dentist) {
        Employee existing = employeeRepository.findByIdAndDentist(id, dentist)
                .orElseThrow(() -> new RuntimeException("Employe introuvable with id " + id));

        // Strict no-delete policy: deletion becomes archiving.
        if (existing.getArchivedAt() == null || existing.getRecordStatus() == RecordStatus.ACTIVE) {
            existing.setRecordStatus(RecordStatus.ARCHIVED);
            existing.setArchivedAt(LocalDateTime.now());
            employeeRepository.save(existing);
        }
    }

    public void unarchiveEmployee(Long id, User dentist) {
        Employee existing = employeeRepository.findByIdAndDentist(id, dentist)
                .orElseThrow(() -> new RuntimeException("Employe introuvable with id " + id));

        if (existing.getArchivedAt() != null || existing.getRecordStatus() != RecordStatus.ACTIVE) {
            existing.setRecordStatus(RecordStatus.ACTIVE);
            existing.setArchivedAt(null);
            employeeRepository.save(existing);
        }
    }

    // Backward compatible alias (DELETE -> archive)
    public void deleteEmployee(Long id, User dentist) {
        archiveEmployee(id, dentist);
    }

    // --- Mapper ---
    private EmployeeResponseDTO mapToResponse(Employee employee, List<EmployeeWorkingHoursDTO> schedules) {
        String dentistName = employee.getDentist().getFirstname() + " " + employee.getDentist().getLastname();
        User user = employee.getUser();

        ensureSetupCode(employee, user);

        return EmployeeResponseDTO.builder()
                .id(employee.getId())
                .publicId(employee.getPublicId())
                .setupCode(employee.getSetupCode())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .gender(employee.getGender())
                .dateOfBirth(employee.getDateOfBirth())
                .nationalId(employee.getNationalId())
                .phone(employee.getPhone())
                .email(employee.getEmail())
                .address(employee.getAddress())
                .hireDate(employee.getHireDate())
                .endDate(employee.getEndDate())
                .status(employee.getStatus())
                .salary(employee.getSalary())
                .contractType(employee.getContractType())
                .dentistId(employee.getDentist().getId())
                .dentistName(dentistName.trim())
                .createdAt(employee.getCreatedAt())
                .updatedAt(employee.getUpdatedAt())
                .recordStatus(employee.getRecordStatus())
                .archivedAt(employee.getArchivedAt())
                .userId(user != null ? user.getId() : null)
                .accountSetupCompleted(user != null && user.isAccountSetupCompleted())
                .permissions(user != null && user.getPermissions() != null ? user.getPermissions().stream().sorted().toList() : List.of())
                .workingHours(schedules)
                .build();
    }

    private void ensureSetupCode(Employee employee, User linkedUser) {
        if (employee == null) return;
        if (hasText(employee.getSetupCode())) return;
        // Generate only when the linked user still needs to complete onboarding.
        if (linkedUser != null && linkedUser.isAccountSetupCompleted()) return;
        employee.setSetupCode(employeeSetupCodeService.nextSetupCode());
        employee.setUpdatedAt(LocalDateTime.now());
        employeeRepository.save(employee);
    }

    private User createLinkedUser(User ownerDentist, EmployeeRequestDTO dto, String normalizedPhone) {
        User user = new User();
        // Employee will set password during onboarding using the shared setup code.
        // Use a random password to keep the account non-guessable before setup.
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(UserRole.EMPLOYEE);
        user.setOwnerDentist(ownerDentist);
        user.setFirstname(dto.getFirstName());
        user.setLastname(dto.getLastName());
        user.setPhoneNumber(normalizedPhone);
        user.setPhoneVerified(false);
        user.setAccountSetupCompleted(false);
        user.setCreatedAt(LocalDateTime.now());
        user.setPlan(ownerDentist.getPlan());
        user.setPlanStatus(ownerDentist.getPlanStatus());
        user.setPlanStartDate(ownerDentist.getPlanStartDate());
        user.setExpirationDate(ownerDentist.getExpirationDate());

        Set<String> requested = dto.getPermissions() != null
                ? dto.getPermissions().stream().filter(this::hasText).map(String::trim).collect(Collectors.toSet())
                : Set.of();
        if (requested.isEmpty()) {
            user.setPermissions(new java.util.HashSet<>(sanitizeEmployeePermissions(java.util.Set.of("APPOINTMENTS", "PATIENTS"))));
        } else {
            user.setPermissions(new java.util.HashSet<>(sanitizeEmployeePermissions(requested)));
        }

        return userRepository.save(user);
    }

    private void assertPhoneUnique(String normalizedPhone, Long currentUserId) {
        if (!hasText(normalizedPhone)) {
            throw new BadRequestException(java.util.Map.of("phone", "Le numero de telephone est obligatoire"));
        }

        var candidates = PhoneNumberUtil.algeriaStoredCandidates(normalizedPhone);
        boolean alreadyUsed = currentUserId == null
                ? userRepository.existsByPhoneNumberIn(candidates)
                : userRepository.existsByPhoneNumberInAndIdNot(candidates, currentUserId);

        if (alreadyUsed) {
            throw new BadRequestException(java.util.Map.of("phone", "Ce numero de telephone est deja utilise"));
        }
    }

    private String normalizePhone(String phone) {
        return PhoneNumberUtil.canonicalAlgeriaForStorage(phone);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private Set<String> sanitizeEmployeePermissions(Set<String> requested) {
        // Employees/staff: support is always enabled and dashboard/gestion-cabinet are forbidden.
        java.util.Set<String> allowedModules = java.util.Set.of(
                "APPOINTMENTS",
                "PATIENTS",
                "DEVIS",
                "SUPPORT",
                "CATALOGUE",
                "PROSTHESES",
                "LABORATORIES",
                "FOURNISSEURS",
                "EXPENSES",
                "INVENTORY"
        );
        java.util.Set<String> allowedActions = java.util.Set.of(
                "CREATE",
                "UPDATE",
                "CANCEL",
                "STATUS",
                "ARCHIVE",
                "DELETE"
        );

        java.util.Set<String> next = new java.util.HashSet<>();
        if (requested != null) {
            for (String p : requested) {
                if (!hasText(p)) continue;
                String key = p.trim();
                if (allowedModules.contains(key)) {
                    next.add(key);
                    continue;
                }
                int idx = key.lastIndexOf('_');
                if (idx > 0 && idx < key.length() - 1) {
                    String module = key.substring(0, idx);
                    String action = key.substring(idx + 1);
                    if (allowedModules.contains(module) && allowedActions.contains(action)) {
                        next.add(key);
                        next.add(module); // keep module enabled when any action is selected
                    }
                }
            }
        }

        boolean hadAny = !next.isEmpty();
        next.add("SUPPORT");
        if (!hadAny) {
            next.add("APPOINTMENTS");
            next.add("PATIENTS");
            next.add("APPOINTMENTS_CREATE");
            next.add("APPOINTMENTS_UPDATE");
            next.add("APPOINTMENTS_CANCEL");
            next.add("PATIENTS_CREATE");
            next.add("PATIENTS_UPDATE");
        }
        return next;
    }

    private void assertDatesCoherent(LocalDate hireDate, LocalDate endDate) {
        if (hireDate != null && endDate != null && endDate.isBefore(hireDate)) {
            throw new BadRequestException(java.util.Map.of("endDate", "La date de fin doit etre apres la date d'embauche"));
        }
    }

}

