package com.cabinetplus.backend.exceptions;

import java.util.Map;

import org.springframework.http.HttpStatus;

public class BadGatewayException extends ApiException {

    public BadGatewayException(String message) {
        super(HttpStatus.BAD_GATEWAY, message);
    }

    public BadGatewayException(String message, Map<String, String> fieldErrors) {
        super(HttpStatus.BAD_GATEWAY, message, fieldErrors);
    }
}

