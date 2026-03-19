package com.cabinetplus.backend.exceptions;

import java.util.Map;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }

    public UnauthorizedException(String message, Map<String, String> fieldErrors) {
        super(HttpStatus.UNAUTHORIZED, message, fieldErrors);
    }
}

