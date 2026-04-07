package com.cabinetplus.backend.services;

import java.security.SecureRandom;

import org.springframework.stereotype.Service;

import com.cabinetplus.backend.repositories.EmployeeRepository;

@Service
public class EmployeeSetupCodeService {

    private static final SecureRandom random = new SecureRandom();

    private final EmployeeRepository employeeRepository;

    public EmployeeSetupCodeService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    public String nextSetupCode() {
        for (int attempt = 0; attempt < 25; attempt++) {
            String code = randomDigits(9);
            if (!employeeRepository.existsBySetupCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Unable to generate a unique employee setup code");
    }

    private static String randomDigits(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append((char) ('0' + random.nextInt(10)));
        }
        if (sb.length() > 0 && sb.charAt(0) == '0') {
            sb.setCharAt(0, (char) ('1' + random.nextInt(9)));
        }
        return sb.toString();
    }
}

