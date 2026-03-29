package com.cabinetplus.backend.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.env.Environment;

import com.cabinetplus.backend.dto.EmployeeRequestDTO;
import com.cabinetplus.backend.dto.EmployeeResponseDTO;
import com.cabinetplus.backend.dto.EmployeeWorkingHoursDTO;
import com.cabinetplus.backend.enums.ClinicAccessRole;
import com.cabinetplus.backend.enums.RecordStatus;
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
        List<Employee> all = employeeRepository.findAllByDentistAndArchivedAtIsNullAndRecordStatus(dentist, RecordStatus.ACTIVE);
        Comparator<Employee> sortComparator = buildEmployeeSortComparator(pageable);
        List<Employee> filtered = (all == null ? List.<Employee>of() : all).stream()
                .filter(e -> {
                    if (safeQ.isBlank()) return true;
                    String first = safeLower(e.getFirstName());
                    String last = safeLower(e.getLastName());
                    String phone = safeLower(e.getPhone());
                    return first.contains(safeQ) || last.contains(safeQ) || phone.contains(safeQ);
                })
                .sorted(sortComparator)
                .toList();

        int offset = (int) Math.min(Math.max(pageable.getOffset(), 0), Integer.MAX_VALUE);
        int fromIndex = Math.min(offset, filtered.size());
        int toIndex = Math.min(fromIndex + pageable.getPageSize(), filtered.size());
        List<Employee> pageItems = filtered.subList(fromIndex, toIndex);
        return new PageImpl<>(pageItems, pageable, filtered.size());
    }

    public Page<Employee> searchArchivedEmployeesForDentist(User dentist, String q, Pageable pageable) {
        String safeQ = q != null ? q.trim().toLowerCase() : "";
        List<Employee> all = employeeRepository.findArchivedByDentist(dentist);
        Comparator<Employee> sortComparator = buildEmployeeSortComparator(pageable);
        List<Employee> filtered = (all == null ? List.<Employee>of() : all).stream()
                .filter(e -> {
                    if (safeQ.isBlank()) return true;
                    String first = safeLower(e.getFirstName());
                    String last = safeLower(e.getLastName());
                    String phone = safeLower(e.getPhone());
                    return first.contains(safeQ) || last.contains(safeQ) || phone.contains(safeQ);
                })
                .sorted(sortComparator)
                .toList();

        int offset = (int) Math.min(Math.max(pageable.getOffset(), 0), Integer.MAX_VALUE);
        int fromIndex = Math.min(offset, filtered.size());
        int toIndex = Math.min(fromIndex + pageable.getPageSize(), filtered.size());
        List<Employee> pageItems = filtered.subList(fromIndex, toIndex);
        return new PageImpl<>(pageItems, pageable, filtered.size());
    }

    private static String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private static Comparator<Employee> buildEmployeeSortComparator(Pageable pageable) {
        Sort.Order order = null;
        if (pageable != null) {
            Sort sort = pageable.getSort();
            if (sort != null) {
                for (Sort.Order candidate : sort) {
                    order = candidate;
                    break;
                }
            }
        }

        String property = order != null ? String.valueOf(order.getProperty() || "").trim() : "";
        boolean desc = order != null && order.getDirection() != null && order.getDirection().isDescending();

        Comparator<Employee> primary = switch (property) {
            case "firstName" -> Comparator.comparing(e -> safeLower(e == null ? null : e.getFirstName()), stringComparator(desc));
            case "lastName" -> Comparator.comparing(e -> safeLower(e == null ? null : e.getLastName()), stringComparator(desc));
            case "phone" -> Comparator.comparing(e -> safeLower(e == null ? null : e.getPhone()), stringComparator(desc));
            case "status" -> Comparator.comparing(e -> safeEnumName(e == null ? null : e.getStatus()), stringComparator(desc));
            case "accessRole" -> Comparator.comparing(EmployeeService::getClinicAccessRoleName, stringComparator(desc));
            case "createdAt" -> Comparator.comparing(e -> e == null ? null : e.getCreatedAt(), dateTimeComparator(desc));
            default -> Comparator.comparing((Employee e) -> e == null ? null : e.getCreatedAt(), dateTimeComparator(true));
        };

        return primary
                .thenComparing(e -> e == null ? null : e.getCreatedAt(), dateTimeComparator(true))
                .thenComparing(e -> e == null ? null : e.getId(), Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private static Comparator<String> stringComparator(boolean desc) {
        Comparator<String> base = String.CASE_INSENSITIVE_ORDER;
        if (desc) base = base.reversed();
        return Comparator.nullsLast(base);
    }

    private static Comparator<LocalDateTime> dateTimeComparator(boolean desc) {
        Comparator<LocalDateTime> base = Comparator.naturalOrder();
        if (desc) base = base.reversed();
        return Comparator.nullsLast(base);
    }

    private static String safeEnumName(Enum<?> value) {
        return value == null ? "" : value.name();
    }

    private static String getClinicAccessRoleName(Employee employee) {
        if (employee == null) return "";
        User user = employee.getUser();
        ClinicAccessRole role = user != null ? user.getClinicAccessRole() : null;
        return role == null ? "" : role.name();
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
                .recordStatus(employee.getRecordStatus())
                .archivedAt(employee.getArchivedAt())
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
        user.setPlanStartDate(ownerDentist.getPlanStartDate());
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

