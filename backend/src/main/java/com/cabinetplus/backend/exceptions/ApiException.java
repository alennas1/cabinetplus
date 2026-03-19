package com.cabinetplus.backend.exceptions;

import java.util.Collections;
import java.util.Map;

import org.springframework.http.HttpStatus;

public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final Map<String, String> fieldErrors;

    protected ApiException(HttpStatus status, String message) {
        this(status, message, Collections.emptyMap());
    }

    protected ApiException(HttpStatus status, String message, Map<String, String> fieldErrors) {
        super(message);
        this.status = status;
        this.fieldErrors = fieldErrors == null ? Collections.emptyMap() : Map.copyOf(fieldErrors);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}

