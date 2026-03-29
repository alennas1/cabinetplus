package com.cabinetplus.backend.exceptions;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.ConstraintViolationException;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final Pattern TABLE_NAME_PATTERN = Pattern.compile("on table \"([^\"]+)\"");
    private static final Pattern CONSTRAINT_NAME_PATTERN = Pattern.compile("constraint \"([^\"]+)\"");
    private static final Pattern CONSTRAINT_NAME_PATTERN_NO_QUOTES = Pattern.compile("constraint\\s+([a-zA-Z0-9_]+)");
    private static final Pattern CHECK_CONSTRAINT_PATTERN_NO_QUOTES = Pattern.compile("check constraint\\s+([a-zA-Z0-9_]+)");
    private static final Pattern COLUMN_NAME_PATTERN = Pattern.compile("column \"([^\"]+)\"");
    private static final Pattern COLUMN_NAME_PATTERN_NO_QUOTES = Pattern.compile("column\\s+([a-zA-Z0-9_]+)");
    private static final Pattern MYSQL_COLUMN_PATTERN = Pattern.compile("Column '([^']+)'", Pattern.CASE_INSENSITIVE);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );

        ex.getBindingResult().getGlobalErrors().forEach(error ->
                errors.putIfAbsent("_", error.getDefaultMessage())
        );

        return ResponseEntity.badRequest().body(Map.of(
                "status", HttpStatus.BAD_REQUEST.value(),
                "fieldErrors", errors
        ));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(
            ApiException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = ex.getStatus();

        if (!ex.getFieldErrors().isEmpty()) {
            return ResponseEntity.status(status).body(Map.of(
                    "status", status.value(),
                    "fieldErrors", ex.getFieldErrors()
            ));
        }

        return buildError(status, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleNotReadable(
            HttpMessageNotReadableException ex,
            HttpServletRequest request
    ) {
        Map<String, String> fieldErrors = mapNotReadableToFieldErrors(ex);
        if (fieldErrors != null && !fieldErrors.isEmpty()) {
            return badRequestFieldErrors(fieldErrors);
        }

        return ResponseEntity.badRequest().body(Map.of(
                "status", HttpStatus.BAD_REQUEST.value(),
                "fieldErrors", Map.of("_", "Corps de requete invalide")
        ));
    }

    private Map<String, String> mapNotReadableToFieldErrors(HttpMessageNotReadableException ex) {
        Throwable root = ex != null ? ex.getMostSpecificCause() : null;
        if (root == null) {
            root = ex != null ? ex.getCause() : null;
        }

        if (root instanceof UnrecognizedPropertyException u) {
            String field = u.getPropertyName();
            if (field == null || field.isBlank()) field = "_";
            return Map.of(field, "Champ non supporte");
        }

        if (root instanceof InvalidFormatException i) {
            String field = lastJsonPathField(i);
            return Map.of(field, "Valeur invalide");
        }

        if (root instanceof MismatchedInputException m) {
            String field = lastJsonPathField(m);
            return Map.of(field, "Valeur invalide");
        }

        return Map.of();
    }

    private String lastJsonPathField(JsonMappingException ex) {
        if (ex == null) return "_";
        List<JsonMappingException.Reference> path = ex.getPath();
        if (path == null || path.isEmpty()) return "_";

        JsonMappingException.Reference last = path.get(path.size() - 1);
        if (last == null) return "_";

        String field = last.getFieldName();
        if (field == null || field.isBlank()) return "_";
        return field;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : null;
        String normalized = message == null ? "" : message.toLowerCase(Locale.ROOT);

        logger.error("Data integrity violation on {}: {}", request.getRequestURI(), message, ex);

        if (normalized.contains("value too long for type character varying")
                || normalized.contains("data too long")
                || normalized.contains("data truncation")) {
            return badRequestFieldErrors(Map.of("_", "Base de donnees non a jour: champs trop longs (migration requise)"));
        }

        if (isForeignKeyViolation(normalized)) {
            boolean looksLikeDeleteConflict = normalized.contains("update or delete on table")
                    || "DELETE".equalsIgnoreCase(request.getMethod());
            if (looksLikeDeleteConflict) {
                return buildError(HttpStatus.CONFLICT, buildForeignKeyDeleteMessage(message), request.getRequestURI());
            }
            return badRequestFieldErrors(Map.of("_", "Reference invalide"));
        }

        if (normalized.contains("email")) {
            return badRequestFieldErrors(Map.of("email", "Cet email est deja utilise"));
        }

        String constraint = extractConstraintName(message);
        if (constraint != null) {
            Map<String, String> mapped = mapConstraintToFieldErrors(constraint);
            if (!mapped.isEmpty()) {
                return badRequestFieldErrors(mapped);
            }
        }

        String column = extractColumnName(message);
        if (column != null) {
            String field = toCamelCase(column);
            if (!field.isBlank()) {
                return badRequestFieldErrors(Map.of(field, "Valeur invalide"));
            }
        }

        return badRequestFieldErrors(Map.of("_", "Donnees invalides"));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(v -> {
            String path = v.getPropertyPath() != null ? v.getPropertyPath().toString() : "_";
            String key = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
            if (key.isBlank()) key = "_";
            errors.put(key, v.getMessage());
        });
        if (errors.isEmpty()) {
            errors.put("_", "Donnees invalides");
        }
        return badRequestFieldErrors(errors);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(
            ResponseStatusException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String reason = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();
        if (status == HttpStatus.BAD_REQUEST) {
            return badRequestFieldErrors(Map.of("_", normalizeUserMessage(status, reason)));
        }
        return buildError(status, reason, request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {
        String message = ex.getMessage() != null && !ex.getMessage().isBlank() ? ex.getMessage() : "Donnees invalides";
        return badRequestFieldErrors(Map.of("_", normalizeUserMessage(HttpStatus.BAD_REQUEST, message)));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request
    ) {
        String name = ex.getName() != null ? ex.getName() : "parametre";
        return badRequestFieldErrors(Map.of(name, "Parametre invalide"));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingRequestParam(
            MissingServletRequestParameterException ex,
            HttpServletRequest request
    ) {
        String name = ex.getParameterName() != null ? ex.getParameterName() : "parametre";
        return badRequestFieldErrors(Map.of(name, "Parametre obligatoire"));
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

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoHandlerFound(
            NoHandlerFoundException ex,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.NOT_FOUND, "Route introuvable", request.getRequestURI());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(
            NoResourceFoundException ex,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.NOT_FOUND, "Route introuvable", request.getRequestURI());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.METHOD_NOT_ALLOWED, "Methode non autorisee", request.getRequestURI());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Type de contenu non supporte", request.getRequestURI());
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<Map<String, Object>> handleMediaTypeNotAcceptable(
            HttpMediaTypeNotAcceptableException ex,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.NOT_ACCEPTABLE, "Format de reponse non supporte", request.getRequestURI());
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
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "fieldErrors", Map.of("_", normalizeUserMessage(status, message))
        ));
    }

    private ResponseEntity<Map<String, Object>> badRequestFieldErrors(Map<String, String> fieldErrors) {
        return ResponseEntity.badRequest().body(Map.of(
                "status", HttpStatus.BAD_REQUEST.value(),
                "fieldErrors", fieldErrors
        ));
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
        if (matcher.find()) return matcher.group(1);

        matcher = CHECK_CONSTRAINT_PATTERN_NO_QUOTES.matcher(rawMessage);
        if (matcher.find()) return matcher.group(1);

        matcher = CONSTRAINT_NAME_PATTERN_NO_QUOTES.matcher(rawMessage);
        return matcher.find() ? matcher.group(1) : null;
    }

    private String extractColumnName(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return null;
        }
        Matcher matcher = COLUMN_NAME_PATTERN.matcher(rawMessage);
        if (matcher.find()) return matcher.group(1);

        matcher = MYSQL_COLUMN_PATTERN.matcher(rawMessage);
        if (matcher.find()) return matcher.group(1);

        matcher = COLUMN_NAME_PATTERN_NO_QUOTES.matcher(rawMessage);
        return matcher.find() ? matcher.group(1) : null;
    }

    private Map<String, String> mapConstraintToFieldErrors(String constraintName) {
        String c = constraintName != null ? constraintName.toLowerCase(Locale.ROOT) : "";
        if (c.isBlank()) {
            return Map.of();
        }

        if (c.contains("patients_firstname")) return Map.of("firstname", "Le prenom est obligatoire");
        if (c.contains("patients_lastname")) return Map.of("lastname", "Le nom est obligatoire");
        if (c.contains("patients_phone")) return Map.of("phone", "Le numero de telephone est obligatoire");
        if (c.contains("patients_sex")) return Map.of("sex", "Le sexe est obligatoire");
        if (c.contains("patients_age")) return Map.of("age", "Age invalide");
        if (c.contains("patients_created_at")) return Map.of("_", "Patient incomplet: date de creation manquante");
        if (c.contains("patients_created_by")) return Map.of("_", "Utilisateur invalide");

        if (c.contains("users_phone_number")) return Map.of("phoneNumber", "Ce numero de telephone est deja utilise");

        if (c.contains("appointments_end_after_start")) {
            return Map.of("dateTimeEnd", "La date de fin doit etre apres la date de debut");
        }
        if (c.contains("expenses_amount")) return Map.of("amount", "Le montant doit etre superieur a 0");
        if (c.contains("expenses_title")) return Map.of("title", "Le titre est obligatoire");
        if (c.contains("expenses_employee")) return Map.of("employeeId", "Employe invalide");

        if (c.contains("treatments_patient")) return Map.of("patientId", "Patient obligatoire");
        if (c.contains("treatments_catalog")) return Map.of("treatmentCatalogId", "Traitement obligatoire");
        if (c.contains("treatments_date")) return Map.of("date", "Date obligatoire");
        if (c.contains("treatments_price")) return Map.of("price", "Prix invalide");
        if (c.contains("treatments_status")) return Map.of("status", "Statut invalide");
        if (c.contains("treatment_teeth_tooth_number_range")) return Map.of("teeth", "Dents invalides");
        if (c.contains("ux_treatment_teeth_treatment_tooth")) return Map.of("teeth", "Les dents doivent etre uniques");

        if (c.contains("treatment_catalog_name")) return Map.of("name", "Le nom est obligatoire");
        if (c.contains("treatment_catalog_default_price")) {
            return Map.of("defaultPrice", "Le prix par defaut doit etre superieur a 0");
        }

        if (c.contains("prothesis_catalog_name")) return Map.of("name", "Le nom est obligatoire");
        if (c.contains("prothesis_catalog_default_price")) return Map.of("defaultPrice", "Prix invalide");
        if (c.contains("prothesis_catalog_default_lab_cost")) return Map.of("defaultLabCost", "Cout labo invalide");

        if (c.contains("item_defaults_name")) return Map.of("name", "Le nom est obligatoire");
        if (c.contains("chk_item_defaults_default_price")) return Map.of("defaultPrice", "Prix invalide");
        if (c.contains("items_quantity")) return Map.of("quantity", "La quantite doit etre superieure a 0");
        if (c.contains("items_unit_price")) return Map.of("unitPrice", "Le prix unitaire doit etre superieur a 0");
        if (c.contains("items_price")) return Map.of("price", "Prix invalide");
        if (c.contains("items_created_at")) return Map.of("createdAt", "Date obligatoire");

        if (c.contains("protheses_patient")) return Map.of("patientId", "Patient obligatoire");
        if (c.contains("protheses_catalog")) return Map.of("catalogId", "Prothese obligatoire");
        if (c.contains("protheses_final_price_gte_lab_cost")) {
            return Map.of("finalPrice", "Le prix doit etre superieur ou egal au cout labo");
        }
        if (c.contains("protheses_final_price")) return Map.of("finalPrice", "Prix invalide");
        if (c.contains("protheses_lab_cost")) return Map.of("labCost", "Cout labo invalide");
        if (c.contains("protheses_status")) return Map.of("status", "Statut invalide");
        if (c.contains("prothesis_teeth_tooth_number_range")) return Map.of("teeth", "Dents invalides");
        if (c.contains("ux_prothesis_teeth_prothesis_tooth")) return Map.of("teeth", "Les dents doivent etre uniques");

        if (c.contains("appointments_no_overlap_per_practitioner")) {
            return Map.of("_", "Ce rendez-vous chevauche un autre rendez-vous");
        }

        if (c.contains("ux_materials_created_by_name_ci")) return Map.of("name", "Ce materiau existe deja");
        if (c.contains("ux_laboratories_created_by_name_ci")) return Map.of("name", "Ce laboratoire existe deja");
        if (c.contains("ux_item_defaults_created_by_name_ci")) return Map.of("name", "Cet article existe deja");
        if (c.contains("ux_treatment_catalog_created_by_name_ci")) return Map.of("name", "Ce traitement existe deja");
        if (c.contains("ux_prothesis_catalog_created_by_name_ci")) return Map.of("name", "Cette prothese existe deja");
        if (c.contains("ux_medications_created_by_name_strength_ci")) return Map.of("name", "Ce medicament existe deja");
        if (c.contains("ux_disease_catalog_created_by_name_ci")) return Map.of("name", "Cette maladie existe deja");
        if (c.contains("ux_allergy_catalog_created_by_name_ci")) return Map.of("name", "Cette allergie existe deja");

        return Map.of("_", "Donnees invalides");
    }


    private String toCamelCase(String snake) {
        if (snake == null) return "";
        String s = snake.trim();
        if (s.isEmpty()) return "";
        StringBuilder out = new StringBuilder();
        boolean upper = false;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '_') {
                upper = true;
                continue;
            }
            if (upper) {
                out.append(Character.toUpperCase(ch));
                upper = false;
            } else {
                out.append(ch);
            }
        }
        return out.toString();
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

        if (n.equals("bad request")) return "Requete invalide";
        if (n.equals("unauthorized")) return "Non authentifie";
        if (n.equals("forbidden")) return "Acces refuse";
        if (n.equals("not found")) return "Ressource introuvable";
        if (n.equals("method not allowed")) return "Methode non autorisee";
        if (n.equals("unsupported media type")) return "Type de contenu non supporte";
        if (n.equals("not acceptable")) return "Format de reponse non supporte";
        if (n.equals("conflict")) return "Conflit";

        if (n.equals("invalid input")) return "Donnees invalides";
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
        if (n.contains("email already exists")) return "Cet email est deja utilise";
        if (n.contains("limite de patients actifs atteinte") || n.contains("limite de patients atteinte")) {
            return "Limite de patients actifs atteinte pour votre plan";
        }
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
