package com.cabinetplus.backend.exceptions;

import java.util.Map;

import org.springframework.http.HttpStatus;

public class TooManyRequestsException extends ApiException {

    public TooManyRequestsException(String message) {
        super(HttpStatus.TOO_MANY_REQUESTS, message);
    }

    public TooManyRequestsException(String message, Map<String, String> fieldErrors) {
        super(HttpStatus.TOO_MANY_REQUESTS, message, fieldErrors);
    }
}

