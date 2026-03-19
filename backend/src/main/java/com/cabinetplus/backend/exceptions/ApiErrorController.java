package com.cabinetplus.backend.exceptions;

import java.util.Map;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class ApiErrorController implements ErrorController {

    @RequestMapping("${server.error.path:/error}")
    public ResponseEntity<Map<String, Object>> handleError(HttpServletRequest request) {
        Object statusCodeAttr = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        Integer statusCode = null;
        if (statusCodeAttr instanceof Integer i) {
            statusCode = i;
        } else if (statusCodeAttr instanceof String s) {
            try {
                statusCode = Integer.valueOf(s);
            } catch (NumberFormatException ignored) {
                statusCode = null;
            }
        }

        HttpStatus status = statusCode != null ? HttpStatus.resolve(statusCode) : null;
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        String message = defaultMessage(status);
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "fieldErrors", Map.of("_", message)
        ));
    }

    private String defaultMessage(HttpStatus status) {
        return switch (status) {
            case NOT_FOUND -> "Route introuvable";
            case METHOD_NOT_ALLOWED -> "Methode non autorisee";
            case UNSUPPORTED_MEDIA_TYPE -> "Type de contenu non supporte";
            case NOT_ACCEPTABLE -> "Format de reponse non supporte";
            case UNAUTHORIZED -> "Non authentifie";
            case FORBIDDEN -> "Acces refuse";
            case BAD_REQUEST -> "Requete invalide";
            default -> status.is5xxServerError() ? "Une erreur interne est survenue" : "Erreur";
        };
    }
}
