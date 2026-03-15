package com.cabinetplus.backend.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final Pattern TABLE_NAME_PATTERN = Pattern.compile("on table \"([^\"]+)\"");
    private static final Pattern CONSTRAINT_NAME_PATTERN = Pattern.compile("constraint \"([^\"]+)\"");

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );

        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Certaines informations sont invalides");
        body.put("path", request.getRequestURI());
        body.put("fieldErrors", errors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : null;
        String normalized = message == null ? "" : message.toLowerCase(Locale.ROOT);

        if (isForeignKeyViolation(normalized)) {
            return buildError(HttpStatus.CONFLICT, buildForeignKeyDeleteMessage(message), request.getRequestURI());
        }

        if (normalized.contains("username")) {
            return buildError(HttpStatus.BAD_REQUEST, "Ce nom d'utilisateur est deja utilise", request.getRequestURI());
        }
        if (normalized.contains("email")) {
            return buildError(HttpStatus.BAD_REQUEST, "Cet email est deja utilise", request.getRequestURI());
        }

        return buildError(
                HttpStatus.BAD_REQUEST,
                "Operation impossible: cet element est lie a d'autres donnees",
                request.getRequestURI()
        );
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(
            ResponseStatusException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String reason = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();
        return buildError(status, reason, request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request
    ) {
        String name = ex.getName() != null ? ex.getName() : "parametre";
        return buildError(HttpStatus.BAD_REQUEST, "Paramètre invalide: " + name, request.getRequestURI());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(
            MaxUploadSizeExceededException ex,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.BAD_REQUEST, "La taille maximale par fichier est de 25 MB", request.getRequestURI());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(HttpServletRequest request) {
        return buildError(HttpStatus.FORBIDDEN, "Acces refuse", request.getRequestURI());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex, HttpServletRequest request) {
        logger.error("Runtime exception on {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        HttpStatus status = resolveRuntimeStatus(ex.getMessage());
        return buildError(status, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnhandled(Exception ex, HttpServletRequest request) {
        logger.error("Unhandled exception on {}", request.getRequestURI(), ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur interne est survenue", request.getRequestURI());
    }

    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String message, String path) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("error", normalizeUserMessage(status, message));
        body.put("path", path);
        return ResponseEntity.status(status).body(body);
    }

    private HttpStatus resolveRuntimeStatus(String message) {
        if (message == null || message.isBlank()) {
            return HttpStatus.BAD_REQUEST;
        }

        String m = message.toLowerCase();

        if (m.contains("not found") || m.contains("introuvable")) return HttpStatus.NOT_FOUND;
        if (m.contains("already processed") || m.contains("already exists") || m.contains("overlap")) {
            return HttpStatus.CONFLICT;
        }
        if (m.contains("unauthorized") || m.contains("not authorized") || m.contains("incorrect")
                || m.contains("acces refuse")) {
            return HttpStatus.FORBIDDEN;
        }
        if (m.contains("required") || m.contains("invalid")) {
            return HttpStatus.BAD_REQUEST;
        }

        return HttpStatus.BAD_REQUEST;
    }

    private boolean isForeignKeyViolation(String normalizedMessage) {
        return normalizedMessage.contains("foreign key")
                || normalizedMessage.contains("cle etrangere")
                || normalizedMessage.contains("is still referenced");
    }

    private String buildForeignKeyDeleteMessage(String rawMessage) {
        String table = extractLastTableName(rawMessage);
        if (table != null) {
            return "Suppression impossible: cet element est utilise dans " + mapTableToDomain(table)
                    + ". Supprimez d'abord les donnees liees.";
        }

        String constraint = extractConstraintName(rawMessage);
        if (constraint != null) {
            return "Suppression impossible: donnees liees detectees (" + constraint + ").";
        }

        return "Suppression impossible: cet element est reference par d'autres donnees.";
    }

    private String extractLastTableName(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return null;
        }
        Matcher matcher = TABLE_NAME_PATTERN.matcher(rawMessage);
        String last = null;
        while (matcher.find()) {
            last = matcher.group(1);
        }
        return last;
    }

    private String extractConstraintName(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return null;
        }
        Matcher matcher = CONSTRAINT_NAME_PATTERN.matcher(rawMessage);
        return matcher.find() ? matcher.group(1) : null;
    }

    private String mapTableToDomain(String tableName) {
        String normalized = tableName.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "prothesis_catalog" -> "le catalogue des protheses";
            case "prothesis" -> "les protheses";
            case "devise_item", "devise_items" -> "les lignes de devis";
            case "payments" -> "les paiements";
            case "appointments" -> "les rendez-vous";
            default -> "d'autres enregistrements";
        };
    }

    private String normalizeUserMessage(HttpStatus status, String message) {
        if (message == null || message.isBlank()) {
            return defaultMessageForStatus(status);
        }

        String m = message.trim();
        String n = m.toLowerCase(Locale.ROOT);

        if (n.equals("validation failed")) return "Certaines informations sont invalides";
        if (n.equals("data integrity violation")) return "Operation impossible: donnees invalides ou deja utilisees";
        if (n.equals("access denied")) return "Acces refuse";
        if (n.equals("internal server error")) return "Une erreur interne est survenue";

        if (n.contains("user not found") || n.contains("current user not found")) return "Utilisateur introuvable";
        if (n.contains("patient not found")) return "Patient introuvable";
        if (n.contains("plan not found")) return "Plan introuvable";
        if (n.contains("payment not found")) return "Paiement introuvable";
        if (n.contains("template not found")) return "Modele introuvable";
        if (n.contains("laboratory not found")) return "Laboratoire introuvable";
        if (n.contains("employee not found")) return "Employe introuvable";
        if (n.contains("appointment overlaps with existing appointments")) {
            return "Ce rendez-vous chevauche un autre rendez-vous";
        }
        if (n.contains("payment is already processed")) return "Ce paiement est deja traite";
        if (n.contains("username already exists")) return "Ce nom d'utilisateur est deja utilise";
        if (n.contains("email already exists")) return "Cet email est deja utilise";
        if (n.contains("limite de patients atteinte")) return "Limite de patients atteinte pour votre plan";
        if (n.contains("limite de dentistes atteinte")) return "Limite de dentistes atteinte pour votre plan";
        if (n.contains("limite d'employes atteinte")) return "Limite d'employes atteinte pour votre plan";
        if (n.contains("limite de stockage atteinte")) return "Limite de stockage atteinte pour votre plan";
        if (n.contains("aucun plan attribue")) return "Aucun plan attribue au cabinet";
        if (n.contains("plan du cabinet est inactif")) return "Le plan du cabinet est inactif";
        if (n.contains("data integrity violation")) {
            return "Operation impossible: cet element est lie a d'autres donnees";
        }

        return m;
    }

    private String defaultMessageForStatus(HttpStatus status) {
        if (status == HttpStatus.NOT_FOUND) return "Ressource introuvable";
        if (status == HttpStatus.FORBIDDEN) return "Acces refuse";
        if (status == HttpStatus.CONFLICT) return "Operation en conflit avec des donnees existantes";
        if (status == HttpStatus.BAD_REQUEST) return "Requete invalide";
        if (status == HttpStatus.INTERNAL_SERVER_ERROR) return "Une erreur interne est survenue";
        return "Une erreur est survenue";
    }
}
