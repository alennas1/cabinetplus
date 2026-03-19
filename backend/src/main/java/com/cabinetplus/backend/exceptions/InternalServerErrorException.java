package com.cabinetplus.backend.exceptions;

import java.util.Map;

import org.springframework.http.HttpStatus;

public class InternalServerErrorException extends ApiException {

    public InternalServerErrorException(String message) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message);
    }

    public InternalServerErrorException(String message, Map<String, String> fieldErrors) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, fieldErrors);
    }
}

