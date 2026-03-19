package com.cabinetplus.backend.exceptions;

import java.util.Map;

import org.springframework.http.HttpStatus;

public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }

    public BadRequestException(Map<String, String> fieldErrors) {
        super(HttpStatus.BAD_REQUEST, "Certaines informations sont invalides", fieldErrors);
    }

    public BadRequestException(String message, Map<String, String> fieldErrors) {
        super(HttpStatus.BAD_REQUEST, message, fieldErrors);
    }
}

