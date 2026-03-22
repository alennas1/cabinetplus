package com.cabinetplus.backend.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.env.Environment;

import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.dto.EmployeeWorkingHoursDTO;
import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.BadRequestException;
import com.cabinetplus.backend.exceptions.BadGatewayException;
import com.cabinetplus.backend.exceptions.InternalServerErrorException;
import com.cabinetplus.backend.exceptions.TooManyRequestsException;
import com.cabinetplus.backend.models.Employee;
import com.cabinetplus.backend.models.EmployeeWorkingHours;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.EmployeeRepository;
import com.cabinetplus.backend.repositories.EmployeeWorkingHoursRepository;
import com.cabinetplus.backend.repositories.UserRepository;
import com.cabinetplus.backend.services.PhoneVerificationService;
import com.cabinetplus.backend.util.PhoneNumberUtil;

import lombok.RequiredArgsConstructor;
import com.twilio.exception.ApiException;

@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final EmployeeWorkingHoursRepository workingHoursRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlanLimitService planLimitService;
    private final PhoneVerificationService phoneVerificationService;
    private final Environment environment;

    // --- Create ---
    public EmployeeResponseDTO saveEmployee(EmployeeRequestDTO dto, User dentist) {
        String normalizedPhone = normalizePhone(dto.getPhone());
        assertDatesCoherent(dto.getHireDate(), dto.getEndDate());
        planLimitService.assertEmployeeRoleAllowed(dentist, dto.getAccessRole());
        assertPhoneUnique(normalizedPhone, null);
        assertEmployeePhoneVerified(normalizedPhone, dto.getPhoneVerificationCode());
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
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
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

        User linkedUser = existing.getUser();
        ClinicAccessRole previousRole = linkedUser != null ? linkedUser.getClinicAccessRole() : null;
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
        ClinicAccessRole nextRole = dto.getAccessRole() != null ? dto.getAccessRole() : previousRole;
        if (roleCategoryChanged(previousRole, nextRole)) {
            planLimitService.assertEmployeeRoleAllowed(dentist, nextRole);
        }

        if (linkedUser == null && (hasText(dto.getPassword()) || dto.getAccessRole() != null)) {
            assertEmployeePhoneVerified(normalizedPhone, dto.getPhoneVerificationCode());
            linkedUser = createLinkedUser(dentist, dto, normalizedPhone);
            existing.setUser(linkedUser);
        } else if (linkedUser != null) {
            if (dto.getAccessRole() != null) {
                validateStaffRole(dto.getAccessRole());
                linkedUser.setClinicAccessRole(dto.getAccessRole());
            }

            if (hasText(dto.getPassword())) {
                linkedUser.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
            }
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
        return employeeRepository.findAllByDentist(dentist)
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

    // --- Delete ---
    public void deleteEmployee(Long id, User dentist) {
        Employee existing = employeeRepository.findByIdAndDentist(id, dentist)
                .orElseThrow(() -> new RuntimeException("Employe introuvable with id " + id));

        if (existing.getUser() != null) {
            userRepository.delete(existing.getUser());
        }
        employeeRepository.delete(existing);
    }

    // --- Mapper ---
    private EmployeeResponseDTO mapToResponse(Employee employee, List<EmployeeWorkingHoursDTO> schedules) {
        String dentistName = employee.getDentist().getFirstname() + " " + employee.getDentist().getLastname();

        return EmployeeResponseDTO.builder()
                .id(employee.getId())
                .publicId(employee.getPublicId())
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
                .userId(employee.getUser() != null ? employee.getUser().getId() : null)
                .accessRole(employee.getUser() != null ? employee.getUser().getClinicAccessRole() : null)
                .workingHours(schedules)
                .build();
    }

    private User createLinkedUser(User ownerDentist, EmployeeRequestDTO dto, String normalizedPhone) {
        if (!hasText(dto.getPassword())) {
            throw new BadRequestException(java.util.Map.of("password", "Mot de passe obligatoire"));
        }
        if (dto.getAccessRole() == null) {
            throw new BadRequestException(java.util.Map.of("accessRole", "Role d'acces obligatoire"));
        }

        validateStaffRole(dto.getAccessRole());

        User user = new User();
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setRole(UserRole.DENTIST);
        user.setClinicAccessRole(dto.getAccessRole());
        user.setOwnerDentist(ownerDentist);
        user.setFirstname(dto.getFirstName());
        user.setLastname(dto.getLastName());
        user.setPhoneNumber(normalizedPhone);
        user.setPhoneVerified(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setPlan(ownerDentist.getPlan());
        user.setPlanStatus(ownerDentist.getPlanStatus());
        user.setExpirationDate(ownerDentist.getExpirationDate());

        return userRepository.save(user);
    }

    private void assertEmployeePhoneVerified(String normalizedPhone, String code) {
        if (!hasText(code)) {
            throw new BadRequestException(java.util.Map.of("phoneVerificationCode", "Code SMS obligatoire"));
        }

        boolean dev = environment != null && Arrays.asList(environment.getActiveProfiles()).contains("dev");
        if (dev) {
            return;
        }

        try {
            boolean approved = phoneVerificationService.checkVerificationCode(normalizedPhone, code);
            if (!approved) {
                throw new BadRequestException(java.util.Map.of("phoneVerificationCode", "Code SMS invalide"));
            }
        } catch (IllegalStateException e) {
            throw new InternalServerErrorException(
                    "Service SMS indisponible",
                    java.util.Map.of("_", "Service SMS indisponible", "reason", "not_configured")
            );
        } catch (ApiException e) {
            int status = e.getStatusCode();
            if (status == 400) {
                throw new BadRequestException(java.util.Map.of("phoneVerificationCode", "Code SMS invalide"));
            }
            if (status == 429) {
                throw new TooManyRequestsException("Trop de demandes. Reessayez plus tard.");
            }
            throw new BadGatewayException("Service SMS indisponible");
        } catch (Exception e) {
            throw new InternalServerErrorException("Service SMS indisponible");
        }
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

    private void validateStaffRole(ClinicAccessRole role) {
        if (role == ClinicAccessRole.DENTIST) {
            throw new BadRequestException(java.util.Map.of("accessRole", "Le role DENTIST est reserve au proprietaire"));
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void assertDatesCoherent(LocalDate hireDate, LocalDate endDate) {
        if (hireDate != null && endDate != null && endDate.isBefore(hireDate)) {
            throw new BadRequestException(java.util.Map.of("endDate", "La date de fin doit etre apres la date d'embauche"));
        }
    }

    private boolean roleCategoryChanged(ClinicAccessRole previousRole, ClinicAccessRole nextRole) {
        return isDentistCategory(previousRole) != isDentistCategory(nextRole);
    }

    private boolean isDentistCategory(ClinicAccessRole role) {
        return role == ClinicAccessRole.PARTNER_DENTIST;
    }
}

