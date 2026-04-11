package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.DocumentResponseDTO;
import com.cabinetplus.backend.dto.PageResponse;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.models.Document;
import com.cabinetplus.backend.models.Patient;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.DocumentRepository;
import com.cabinetplus.backend.repositories.PatientRepository;
import com.cabinetplus.backend.security.crypto.DecryptingFileResource;
import com.cabinetplus.backend.security.crypto.EncryptedFileIO;
import com.cabinetplus.backend.security.crypto.EncryptionKeyProvider;
import com.cabinetplus.backend.util.PaginationUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class DocumentService {

    private static final long MAX_FILE_SIZE_BYTES = 25L * 1024L * 1024L;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "jpg", "jpeg", "png", "dcm", "tiff", "doc", "docx"
    );

    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "exe", "js", "php", "sh", "bat", "msi"
    );

    private final DocumentRepository documentRepository;
    private final PatientRepository patientRepository;
    private final PlanLimitService planLimitService;
    private final ReferenceCodeGeneratorService referenceCodeGeneratorService;
    private final Path uploadRoot;

    public DocumentService(
            DocumentRepository documentRepository,
            PatientRepository patientRepository,
            PlanLimitService planLimitService,
            ReferenceCodeGeneratorService referenceCodeGeneratorService,
            @Value("${app.documents.upload-dir:uploads/documents}") String uploadDir
    ) {
        this.documentRepository = documentRepository;
        this.patientRepository = patientRepository;
        this.planLimitService = planLimitService;
        this.referenceCodeGeneratorService = referenceCodeGeneratorService;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public List<DocumentResponseDTO> findByPatientId(Long patientId, User ownerDentist) {
        Patient patient = patientRepository.findByIdAndCreatedBy(patientId, ownerDentist)
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));

        return documentRepository.findByPatientAndRecordStatusOrderByUploadedAtDesc(patient, RecordStatus.ACTIVE)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public PageResponse<DocumentResponseDTO> findByPatientIdPaged(
            Long patientId,
            User ownerDentist,
            boolean fromEnabled,
            LocalDateTime fromDateTime,
            boolean toEnabled,
            LocalDateTime toDateTimeExclusive,
            String qLike,
            String fieldKey,
            Pageable pageable
    ) {
        Patient patient = patientRepository.findByIdAndCreatedBy(patientId, ownerDentist)
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));

        Page<DocumentResponseDTO> page = documentRepository.searchPatientDocuments(
                        patient.getId(),
                        RecordStatus.ACTIVE,
                        fromEnabled,
                        fromDateTime,
                        toEnabled,
                        toDateTimeExclusive,
                        qLike,
                        fieldKey,
                        pageable
                )
                .map(this::toDto);

        return PaginationUtil.toPageResponse(page);
    }

    public DocumentResponseDTO store(
            Long patientId,
            String title,
            MultipartFile file,
            User ownerDentist,
            User uploadedBy
    ) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier obligatoire");
        }

        String cleanTitle = title == null ? "" : title.trim();
        if (cleanTitle.isBlank()) {
            throw new IllegalArgumentException("Titre obligatoire");
        }

        Patient patient = patientRepository.findByIdAndCreatedBy(patientId, ownerDentist)
                .orElseThrow(() -> new RuntimeException("Patient introuvable"));
        if (patient.getArchivedAt() != null) {
            throw new IllegalArgumentException("Patient archivé : lecture seule.");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = extractExtension(originalFilename);
        validateExtension(extension);

        long fileSizeBytes = normalizeBytes(file.getSize());
        if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("La taille maximale par fichier est de 25 MB");
        }

        // Encrypted storage adds a small header + GCM tag + wrapped DEK.
        long estimatedStoredBytes = fileSizeBytes + 256;
        long currentStorageBytes = planLimitService.getCurrentStorageBytes(ownerDentist);
        long nextTotalBytes = currentStorageBytes + estimatedStoredBytes;
        planLimitService.assertStorageWithinLimit(ownerDentist, nextTotalBytes);

        try {
            Files.createDirectories(uploadRoot);

            String storedFilename = UUID.randomUUID() + "." + extension;
            Path destination = uploadRoot.resolve(storedFilename).normalize();

            byte[] kek = EncryptionKeyProvider.getOrLoadKek();
            try (InputStream in = file.getInputStream(); OutputStream out = Files.newOutputStream(destination)) {
                EncryptedFileIO.encryptToStream(in, out, kek);
            }
            long storedBytes = Files.size(destination);

            Document document = new Document();
            document.setTitle(cleanTitle);
            document.setFilename(sanitizeFilename(originalFilename, storedFilename));
            document.setFileType(resolveFileType(file, extension));
            document.setFileSizeBytes(storedBytes);
            LocalDateTime uploadedAt = LocalDateTime.now();
            document.setUploadedAt(uploadedAt);
            document.setPathOrUrl(destination.toString());
            document.setPatient(patient);
            document.setUploadedBy(uploadedBy);

            long count = documentRepository.countByPatientCreatedByAndUploadedAtGreaterThanEqualAndUploadedAtLessThan(
                    ownerDentist,
                    referenceCodeGeneratorService.dayStart(uploadedAt),
                    referenceCodeGeneratorService.nextDayStart(uploadedAt)
            );
            document.setCode(referenceCodeGeneratorService.generate("PJ", uploadedAt, count));

            return toDto(documentRepository.save(document));
        } catch (IOException ex) {
            throw new RuntimeException("Impossible d'enregistrer la piece jointe", ex);
        }
    }

    public Resource getDocumentResource(Long documentId, User ownerDentist) {
        Document document = getOwnedDocument(documentId, ownerDentist);
        Path path = resolveExistingPath(document);
        return new DecryptingFileResource(path, EncryptionKeyProvider.getOrLoadKek());
    }

    public DocumentResponseDTO getDocumentMetadata(Long documentId, User ownerDentist) {
        return toDto(getOwnedDocument(documentId, ownerDentist));
    }

    public Long getDocumentPatientId(Long documentId, User ownerDentist) {
        Document document = getOwnedDocument(documentId, ownerDentist);
        return document.getPatient() != null ? document.getPatient().getId() : null;
    }

    public MediaType resolveMediaType(Long documentId, User ownerDentist) {
        Document document = getOwnedDocument(documentId, ownerDentist);
        Path path = resolveExistingPath(document);
        return MediaTypeFactory.getMediaType(path.getFileName().toString())
                .orElseGet(() -> {
                    if (document.getFileType() == null || document.getFileType().isBlank()) {
                        return MediaType.APPLICATION_OCTET_STREAM;
                    }
                    try {
                        return MediaType.parseMediaType(document.getFileType());
                    } catch (Exception ignored) {
                        return MediaType.APPLICATION_OCTET_STREAM;
                    }
                });
    }

    public void delete(Long documentId, User ownerDentist) {
        Document document = getOwnedDocument(documentId, ownerDentist);
        if (document.getPatient() != null && document.getPatient().getArchivedAt() != null) {
            throw new IllegalArgumentException("Patient archivé : lecture seule.");
        }
        if (document.getRecordStatus() != RecordStatus.CANCELLED) {
            document.setRecordStatus(RecordStatus.CANCELLED);
            document.setCancelledAt(LocalDateTime.now());
            documentRepository.save(document);
        }
    }

    private Document getOwnedDocument(Long documentId, User ownerDentist) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document introuvable"));

        Long ownerId = document.getPatient() != null && document.getPatient().getCreatedBy() != null
                ? document.getPatient().getCreatedBy().getId()
                : null;

        if (ownerId == null || !ownerId.equals(ownerDentist.getId())) {
            throw new RuntimeException("Document introuvable");
        }

        return document;
    }

    private Path resolveExistingPath(Document document) {
        Path path = resolvePath(document.getPathOrUrl());
        if (path == null || !Files.exists(path)) {
            throw new RuntimeException("Fichier introuvable");
        }
        return path;
    }

    private Path resolvePath(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.isBlank()) {
            return null;
        }
        return Paths.get(pathOrUrl).toAbsolutePath().normalize();
    }

    private String resolveFileType(MultipartFile file, String extension) {
        if (file.getContentType() != null && !file.getContentType().isBlank()) {
            return file.getContentType();
        }
        return MediaTypeFactory.getMediaType("file." + extension)
                .map(MediaType::toString)
                .orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE);
    }

    private void validateExtension(String extension) {
        if (extension.isBlank()) {
            throw new IllegalArgumentException("Extension de fichier invalide");
        }
        if (BLOCKED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Ce type de fichier est interdit");
        }
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Type de fichier non autorise");
        }
    }

    private String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDot + 1).toLowerCase(Locale.ROOT);
    }

    private String sanitizeFilename(String originalFilename, String fallback) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return fallback;
        }
        return Paths.get(originalFilename).getFileName().toString();
    }

    private long normalizeBytes(Long bytes) {
        if (bytes == null) return 0L;
        return Math.max(0L, bytes);
    }

    private DocumentResponseDTO toDto(Document document) {
        return new DocumentResponseDTO(
                document.getId(),
                document.getCode(),
                document.getTitle(),
                document.getFilename(),
                document.getFileType(),
                document.getFileSizeBytes(),
                document.getUploadedAt()
        );
    }
}
