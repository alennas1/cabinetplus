package com.cabinetplus.backend.services;

import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import com.cabinetplus.backend.security.crypto.DecryptingFileResource;
import com.cabinetplus.backend.security.crypto.EncryptedFileIO;
import com.cabinetplus.backend.security.crypto.EncryptionKeyProvider;
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
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class ProthesisStlService {

    private static final long MAX_FILE_SIZE_BYTES = 25L * 1024L * 1024L;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("stl");

    private final ProthesisRepository prothesisRepository;
    private final PlanLimitService planLimitService;
    private final LaboratoryAccessService laboratoryAccessService;
    private final Path uploadRoot;

    public ProthesisStlService(
            ProthesisRepository prothesisRepository,
            PlanLimitService planLimitService,
            LaboratoryAccessService laboratoryAccessService,
            @Value("${app.protheses.stl-upload-dir:uploads/protheses/stl}") String uploadDir
    ) {
        this.prothesisRepository = prothesisRepository;
        this.planLimitService = planLimitService;
        this.laboratoryAccessService = laboratoryAccessService;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public Prothesis uploadForDentist(Long prothesisId, MultipartFile file, User ownerDentist, User actor) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        assertProthesisWritable(prothesis);
        return storeAndAttach(prothesis, file, ownerDentist, actor);
    }

    public Resource getResourceForDentist(Long prothesisId, User ownerDentist) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        return toResource(requireExistingStlPath(prothesis));
    }

    public MediaType getMediaTypeForDentist(Long prothesisId, User ownerDentist) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        return resolveMediaType(prothesis);
    }

    public String getFilenameForDentist(Long prothesisId, User ownerDentist) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        String filename = prothesis.getStlFilename();
        if (filename == null || filename.isBlank()) {
            throw new NotFoundException("Fichier STL introuvable");
        }
        return filename;
    }

    public Resource getResourceForLab(Long prothesisId, User labUser) {
        Prothesis prothesis = requireProthesisForLab(prothesisId, labUser);
        return toResource(requireExistingStlPath(prothesis));
    }

    public MediaType getMediaTypeForLab(Long prothesisId, User labUser) {
        Prothesis prothesis = requireProthesisForLab(prothesisId, labUser);
        return resolveMediaType(prothesis);
    }

    public String getFilenameForLab(Long prothesisId, User labUser) {
        Prothesis prothesis = requireProthesisForLab(prothesisId, labUser);
        String filename = prothesis.getStlFilename();
        if (filename == null || filename.isBlank()) {
            throw new NotFoundException("Fichier STL introuvable");
        }
        return filename;
    }

    private Prothesis storeAndAttach(Prothesis prothesis, MultipartFile file, User ownerDentist, User actor) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier obligatoire");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = extractExtension(originalFilename);
        validateExtension(extension);

        long fileSizeBytes = normalizeBytes(file.getSize());
        if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("La taille maximale par fichier est de 25 MB");
        }

        long estimatedStoredBytes = fileSizeBytes + 256;
        long currentStorageBytes = planLimitService.getCurrentStorageBytes(ownerDentist);
        long previousStoredBytes = normalizeBytes(prothesis.getStlFileSizeBytes());
        long nextTotalBytes = Math.max(0L, currentStorageBytes - previousStoredBytes) + estimatedStoredBytes;
        planLimitService.assertStorageWithinLimit(ownerDentist, nextTotalBytes);

        Path destination = null;
        String previousPath = prothesis.getStlPathOrUrl();
        try {
            Files.createDirectories(uploadRoot);

            String storedFilename = UUID.randomUUID() + ".stl";
            destination = uploadRoot.resolve(storedFilename).normalize();

            byte[] kek = EncryptionKeyProvider.getOrLoadKek();
            try (InputStream in = file.getInputStream(); OutputStream out = Files.newOutputStream(destination)) {
                EncryptedFileIO.encryptToStream(in, out, kek);
             }
             long storedBytes = Files.size(destination);

            String stlFilename = sanitizeFilename(originalFilename, storedFilename);
            String stlFileType = resolveFileType(file, extension);
            LocalDateTime stlUploadedAt = LocalDateTime.now();
            String stlPathOrUrl = destination.toString();
            User updater = actor != null ? actor : ownerDentist;

            int updated = prothesisRepository.updateStlAttachment(
                    prothesis.getId(),
                    stlFilename,
                    stlFileType,
                    storedBytes,
                    stlUploadedAt,
                    stlPathOrUrl,
                    actor,
                    updater,
                    LocalDateTime.now()
            );
            if (updated != 1) {
                deleteBestEffort(stlPathOrUrl);
                throw new NotFoundException("Prothese introuvable");
            }

            deleteBestEffort(previousPath);
            return requireProthesisOwnedBy(prothesis.getId(), ownerDentist);
         } catch (IOException ex) {
             deleteBestEffort(destination != null ? destination.toString() : null);
             throw new RuntimeException("Impossible d'enregistrer le fichier STL", ex);
         }
     }

    private Prothesis requireProthesisOwnedBy(Long id, User ownerDentist) {
        return prothesisRepository.findForResponseById(id)
                .filter(item -> ownerDentist.getRole() == UserRole.ADMIN
                        || (item.getPractitioner() != null
                            && item.getPractitioner().getId() != null
                            && ownerDentist.getId() != null
                            && item.getPractitioner().getId().equals(ownerDentist.getId())))
                .orElseThrow(() -> new NotFoundException("Prothese introuvable"));
    }

    private Prothesis requireProthesisForLab(Long id, User labUser) {
        if (labUser == null || labUser.getRole() != UserRole.LAB) {
            throw new NotFoundException("Prothese introuvable");
        }
        Laboratory myLab = laboratoryAccessService.requireMyLab(labUser);
        return prothesisRepository.findForResponseById(id)
                .filter(item -> item.getLaboratory() != null
                        && item.getLaboratory().getId() != null
                        && myLab.getId() != null
                        && item.getLaboratory().getId().equals(myLab.getId()))
                .orElseThrow(() -> new NotFoundException("Prothese introuvable"));
    }

    private void assertProthesisWritable(Prothesis prothesis) {
        if (prothesis == null) {
            throw new NotFoundException("Prothese introuvable");
        }
        if (prothesis.getRecordStatus() != null && prothesis.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new IllegalArgumentException("Prothese annulee : lecture seule.");
        }
    }

    private Path requireExistingStlPath(Prothesis prothesis) {
        String pathOrUrl = prothesis != null ? prothesis.getStlPathOrUrl() : null;
        if (pathOrUrl == null || pathOrUrl.isBlank()) {
            throw new NotFoundException("Fichier STL introuvable");
        }
        Path path = Paths.get(pathOrUrl).toAbsolutePath().normalize();
        if (!Files.exists(path)) {
            throw new NotFoundException("Fichier STL introuvable");
        }
        return path;
    }

    private Resource toResource(Path path) {
        return new DecryptingFileResource(path, EncryptionKeyProvider.getOrLoadKek());
    }

    private MediaType resolveMediaType(Prothesis prothesis) {
        String filename = prothesis != null ? prothesis.getStlFilename() : null;
        if (filename != null && !filename.isBlank()) {
            return MediaTypeFactory.getMediaType(filename).orElse(MediaType.APPLICATION_OCTET_STREAM);
        }
        String raw = prothesis != null ? prothesis.getStlFileType() : null;
        if (raw == null || raw.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(raw);
        } catch (Exception ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private void validateExtension(String extension) {
        if (extension.isBlank()) {
            throw new IllegalArgumentException("Extension de fichier invalide");
        }
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Seuls les fichiers STL (.stl) sont autorises");
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

    private String resolveFileType(MultipartFile file, String extension) {
        if (file.getContentType() != null && !file.getContentType().isBlank()) {
            return file.getContentType();
        }
        return MediaTypeFactory.getMediaType("file." + extension)
                .map(MediaType::toString)
                .orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE);
    }

    private long normalizeBytes(Long bytes) {
        if (bytes == null) return 0L;
        return Math.max(0L, bytes);
    }

    private void deleteBestEffort(String previousPathOrUrl) {
        if (previousPathOrUrl == null || previousPathOrUrl.isBlank()) {
            return;
        }
        try {
            Path previous = Paths.get(previousPathOrUrl).toAbsolutePath().normalize();
            if (Files.exists(previous)) {
                Files.delete(previous);
            }
        } catch (Exception ignored) {
            // best-effort cleanup
        }
    }
}
