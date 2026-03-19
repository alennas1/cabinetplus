package com.cabinetplus.backend.validation;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class UniqueIntegersValidator implements ConstraintValidator<UniqueIntegers, List<Integer>> {

    @Override
    public boolean isValid(List<Integer> value, ConstraintValidatorContext context) {
        if (value == null || value.isEmpty()) {
            return true;
        }
        Set<Integer> seen = new HashSet<>();
        for (Integer v : value) {
            if (v == null) {
                continue;
            }
            if (!seen.add(v)) {
                return false;
            }
        }
        return true;
    }
}

