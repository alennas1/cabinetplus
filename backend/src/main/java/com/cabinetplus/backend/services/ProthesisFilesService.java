package com.cabinetplus.backend.services;

import com.cabinetplus.backend.dto.ProthesisFileItemResponse;
import com.cabinetplus.backend.enums.RecordStatus;
import com.cabinetplus.backend.enums.UserRole;
import com.cabinetplus.backend.exceptions.NotFoundException;
import com.cabinetplus.backend.models.Laboratory;
import com.cabinetplus.backend.models.Prothesis;
import com.cabinetplus.backend.models.ProthesisFile;
import com.cabinetplus.backend.models.User;
import com.cabinetplus.backend.repositories.ProthesisFileRepository;
import com.cabinetplus.backend.repositories.ProthesisRepository;
import com.cabinetplus.backend.security.crypto.EncryptedFileIO;
import com.cabinetplus.backend.security.crypto.EncryptionKeyProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ProthesisFilesService {

    private static final long MAX_FILE_SIZE_BYTES = 200L * 1024L * 1024L; // 200 MB per file
    private static final int MAX_FILES_PER_UPLOAD = 2000;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "stl", "obj", "ply", "dcm", "dicom", "zip"
    );

    private final ProthesisRepository prothesisRepository;
    private final ProthesisFileRepository prothesisFileRepository;
    private final PlanLimitService planLimitService;
    private final LaboratoryAccessService laboratoryAccessService;
    private final Path uploadRoot;

    public ProthesisFilesService(
            ProthesisRepository prothesisRepository,
            ProthesisFileRepository prothesisFileRepository,
            PlanLimitService planLimitService,
            LaboratoryAccessService laboratoryAccessService,
            @Value("${app.protheses.files-upload-dir:uploads/protheses/files}") String uploadDir
    ) {
        this.prothesisRepository = prothesisRepository;
        this.prothesisFileRepository = prothesisFileRepository;
        this.planLimitService = planLimitService;
        this.laboratoryAccessService = laboratoryAccessService;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public int countForDentist(Long prothesisId, User ownerDentist) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        return safeCount(prothesis);
    }

    public List<ProthesisFileItemResponse> listForDentist(Long prothesisId, User ownerDentist) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        return prothesisFileRepository.findByProthesisIdOrderByUploadedAtDesc(prothesis.getId())
                .stream()
                .map(this::toItemResponse)
                .toList();
    }

    public void deleteFileForDentist(Long prothesisId, Long fileId, User ownerDentist, User actor) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        if (fileId == null) {
            throw new IllegalArgumentException("Fichier introuvable");
        }
        ProthesisFile file = prothesisFileRepository.findByIdAndProthesisId(fileId, prothesis.getId())
                .orElseThrow(() -> new NotFoundException("Fichier introuvable"));

        deleteAttachments(List.of(file));
        User updater = actor != null ? actor : ownerDentist;
        prothesisRepository.touchUpdatedBy(prothesis.getId(), updater, LocalDateTime.now());
    }

    public ProthesisFileItemResponse uploadItemForDentist(
            Long prothesisId,
            MultipartFile file,
            String relativePath,
            User ownerDentist,
            User actor
    ) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        assertProthesisWritable(prothesis);

        List<MultipartFile> safeFiles = normalizeFiles(new MultipartFile[]{file});
        if (safeFiles.isEmpty()) {
            throw new IllegalArgumentException("Fichier obligatoire");
        }
        MultipartFile safeFile = safeFiles.get(0);

        long estimatedStoredBytes = normalizeBytes(safeFile.getSize()) + 256;
        if (estimatedStoredBytes > (MAX_FILE_SIZE_BYTES + 256)) {
            throw new IllegalArgumentException("La taille maximale par fichier est de 200 MB");
        }

        String originalFilename = safeFile.getOriginalFilename();
        String extension = extractExtension(originalFilename);
        validateExtension(extension);

        long currentStorageBytes = planLimitService.getCurrentStorageBytes(ownerDentist);
        planLimitService.assertStorageWithinLimit(ownerDentist, currentStorageBytes + estimatedStoredBytes);

        try {
            Path prothesisDir = uploadRoot.resolve("prothesis-" + prothesis.getId()).normalize();
            Files.createDirectories(prothesisDir);

            byte[] kek = EncryptionKeyProvider.getOrLoadKek();
            LocalDateTime now = LocalDateTime.now();

            List<ProthesisFile> existing = prothesisFileRepository.findByProthesisIdOrderByUploadedAtDesc(prothesis.getId());
            Set<String> usedNames = new HashSet<>();
            for (ProthesisFile pf : existing) {
                String entryName = sanitizeRelativePath(pf.getRelativePath());
                if (entryName == null || entryName.isBlank()) entryName = pf.getFilename();
                if (entryName == null || entryName.isBlank()) continue;
                usedNames.add(entryName);
            }

            String entryName = sanitizeRelativePath(relativePath);
            if (entryName == null || entryName.isBlank()) {
                entryName = sanitizeFilename(originalFilename, "file-" + System.nanoTime() + "." + extension);
            }
            entryName = ensureUniqueEntryName(entryName, usedNames);

            String storedFilename = UUID.randomUUID() + "." + extension;
            Path destination = prothesisDir.resolve(storedFilename).normalize();

            try (InputStream in = safeFile.getInputStream(); OutputStream out = Files.newOutputStream(destination)) {
                EncryptedFileIO.encryptToStream(in, out, kek);
            }

            long storedBytes = Files.size(destination);

            ProthesisFile pf = new ProthesisFile();
            pf.setProthesis(prothesis);
            pf.setFilename(sanitizeFilename(originalFilename, Paths.get(entryName).getFileName().toString()));
            pf.setRelativePath(entryName);
            pf.setFileType(resolveFileType(safeFile, extension));
            pf.setFileSizeBytes(storedBytes);
            pf.setUploadedAt(now);
            pf.setPathOrUrl(destination.toString());
            pf.setUploadedBy(actor);
            ProthesisFile saved = prothesisFileRepository.save(pf);

            User updater = actor != null ? actor : ownerDentist;
            prothesisRepository.touchUpdatedBy(prothesis.getId(), updater, LocalDateTime.now());
            return toItemResponse(saved);
        } catch (IOException ex) {
            throw new RuntimeException("Impossible d'enregistrer le fichier", ex);
        }
    }

    public Prothesis uploadForDentist(
            Long prothesisId,
            MultipartFile[] files,
            List<String> relativePaths,
            User ownerDentist,
            User actor
    ) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        assertProthesisWritable(prothesis);
        List<MultipartFile> safeFiles = normalizeFiles(files);
        if (safeFiles.isEmpty()) {
            throw new IllegalArgumentException("Fichier obligatoire");
        }
        if (safeFiles.size() > MAX_FILES_PER_UPLOAD) {
            throw new IllegalArgumentException("Trop de fichiers (max " + MAX_FILES_PER_UPLOAD + ")");
        }

        long estimatedStoredBytes = 0L;
        for (MultipartFile f : safeFiles) {
            long bytes = normalizeBytes(f.getSize());
            if (bytes > MAX_FILE_SIZE_BYTES) {
                throw new IllegalArgumentException("La taille maximale par fichier est de 200 MB");
            }
            String extension = extractExtension(f.getOriginalFilename());
            validateExtension(extension);
            estimatedStoredBytes += bytes + 256;
        }
        long currentStorageBytes = planLimitService.getCurrentStorageBytes(ownerDentist);
        planLimitService.assertStorageWithinLimit(ownerDentist, currentStorageBytes + estimatedStoredBytes);

        try {
            Path prothesisDir = uploadRoot.resolve("prothesis-" + prothesis.getId()).normalize();
            Files.createDirectories(prothesisDir);

            byte[] kek = EncryptionKeyProvider.getOrLoadKek();
            List<ProthesisFile> existing = prothesisFileRepository.findByProthesisIdOrderByUploadedAtDesc(prothesis.getId());
            Set<String> usedNames = new HashSet<>();
            for (ProthesisFile pf : existing) {
                String entryName = sanitizeRelativePath(pf.getRelativePath());
                if (entryName == null || entryName.isBlank()) entryName = pf.getFilename();
                if (entryName == null || entryName.isBlank()) continue;
                usedNames.add(entryName);
            }

            LocalDateTime now = LocalDateTime.now();
            for (int i = 0; i < safeFiles.size(); i++) {
                MultipartFile f = safeFiles.get(i);
                String originalFilename = f != null ? f.getOriginalFilename() : null;
                String extension = extractExtension(originalFilename);
                validateExtension(extension);

                String entryName = sanitizeRelativePath(safeGet(relativePaths, i));
                if (entryName == null || entryName.isBlank()) {
                    entryName = sanitizeFilename(originalFilename, "file-" + (i + 1) + "." + extension);
                }
                entryName = ensureUniqueEntryName(entryName, usedNames);

                String storedFilename = UUID.randomUUID() + "." + extension;
                Path destination = prothesisDir.resolve(storedFilename).normalize();

                try (InputStream in = f.getInputStream(); OutputStream out = Files.newOutputStream(destination)) {
                    EncryptedFileIO.encryptToStream(in, out, kek);
                }

                long storedBytes = Files.size(destination);

                ProthesisFile pf = new ProthesisFile();
                pf.setProthesis(prothesis);
                pf.setFilename(sanitizeFilename(originalFilename, Paths.get(entryName).getFileName().toString()));
                pf.setRelativePath(entryName);
                pf.setFileType(resolveFileType(f, extension));
                pf.setFileSizeBytes(storedBytes);
                pf.setUploadedAt(now);
                pf.setPathOrUrl(destination.toString());
                pf.setUploadedBy(actor);
                prothesisFileRepository.save(pf);
            }

            User updater = actor != null ? actor : ownerDentist;
            prothesisRepository.touchUpdatedBy(prothesis.getId(), updater, LocalDateTime.now());
            return requireProthesisOwnedBy(prothesisId, ownerDentist);
        } catch (IOException ex) {
            throw new RuntimeException("Impossible d'enregistrer les fichiers", ex);
        }
    }

    public ZipBundleSource findZipBundleForDentist(Long prothesisId, User ownerDentist) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        return findZipBundle(prothesis);
    }

    public ZipBundleSource findZipBundleForLab(Long prothesisId, User labUser) {
        Prothesis prothesis = requireProthesisForLab(prothesisId, labUser);
        return findZipBundle(prothesis);
    }

    private ZipBundleSource findZipBundle(Prothesis prothesis) {
        if (prothesis == null || prothesis.getId() == null) return null;
        for (ProthesisFile pf : prothesisFileRepository.findByProthesisIdOrderByUploadedAtDesc(prothesis.getId())) {
            if (!isZipBundle(pf)) continue;
            Path path = resolveExistingPath(pf.getPathOrUrl());
            String filename = pf.getFilename() != null && !pf.getFilename().isBlank()
                    ? pf.getFilename()
                    : buildZipFilename(prothesis.getId());
            return new ZipBundleSource(filename, path);
        }
        return null;
    }

    private boolean isZipBundle(ProthesisFile pf) {
        if (pf == null) return false;
        String filename = pf.getFilename() != null ? pf.getFilename().trim().toLowerCase(Locale.ROOT) : "";
        if (filename.endsWith(".zip")) return true;
        String fileType = pf.getFileType() != null ? pf.getFileType().trim().toLowerCase(Locale.ROOT) : "";
        return fileType.contains("zip");
    }

    private ProthesisFileItemResponse toItemResponse(ProthesisFile pf) {
        if (pf == null) {
            return new ProthesisFileItemResponse(null, null, null, null, null, null);
        }
        return new ProthesisFileItemResponse(
                pf.getId(),
                pf.getFilename(),
                pf.getRelativePath(),
                pf.getFileType(),
                pf.getFileSizeBytes(),
                pf.getUploadedAt()
        );
    }

    private void cleanupPreviousAttachments(List<ProthesisFile> previous, Path excludePath) {
        if (previous == null || previous.isEmpty()) return;
        Path exclude = excludePath != null ? excludePath.toAbsolutePath().normalize() : null;

        List<ProthesisFile> deletable = new ArrayList<>();
        for (ProthesisFile pf : previous) {
            try {
                Path path = resolvePath(pf != null ? pf.getPathOrUrl() : null);
                if (path == null) continue;
                path = path.toAbsolutePath().normalize();
                if (exclude != null && path.equals(exclude)) continue;
                if (!path.startsWith(uploadRoot)) continue;
                deletable.add(pf);
                Files.deleteIfExists(path);
            } catch (Exception ignored) {
                // best-effort cleanup
            }
        }
        if (!deletable.isEmpty()) {
            prothesisFileRepository.deleteAll(deletable);
        }
    }

    private void deleteAttachments(List<ProthesisFile> attachments) {
        if (attachments == null || attachments.isEmpty()) return;
        List<ProthesisFile> deletable = new ArrayList<>();
        for (ProthesisFile pf : attachments) {
            try {
                Path path = resolvePath(pf != null ? pf.getPathOrUrl() : null);
                if (path == null) continue;
                path = path.toAbsolutePath().normalize();
                if (!path.startsWith(uploadRoot)) continue;
                deletable.add(pf);
                Files.deleteIfExists(path);
            } catch (Exception ignored) {
                // best-effort cleanup
            }
        }
        if (!deletable.isEmpty()) {
            prothesisFileRepository.deleteAll(deletable);
        }
    }

    private void writeEncryptedZipBundle(
            Path destination,
            List<MultipartFile> safeFiles,
            List<String> relativePaths,
            byte[] kek
    ) throws IOException {
        if (destination == null) throw new IOException("Destination introuvable");
        if (safeFiles == null || safeFiles.isEmpty()) throw new IOException("Aucun fichier");

        try (OutputStream encryptedOut = Files.newOutputStream(destination)) {
            PipedOutputStream pipedOut = new PipedOutputStream();
            PipedInputStream pipedIn = new PipedInputStream(pipedOut, 64 * 1024);
            AtomicReference<Throwable> zipError = new AtomicReference<>();

            Thread zipThread = new Thread(() -> {
                try (ZipOutputStream zipOut = new ZipOutputStream(new BufferedOutputStream(pipedOut), StandardCharsets.UTF_8)) {
                    HashSet<String> usedNames = new HashSet<>();
                    for (int i = 0; i < safeFiles.size(); i++) {
                        MultipartFile file = safeFiles.get(i);
                        String originalFilename = file != null ? file.getOriginalFilename() : null;
                        String extension = extractExtension(originalFilename);
                        validateExtension(extension);

                        String entryName = sanitizeRelativePath(safeGet(relativePaths, i));
                        if (entryName == null || entryName.isBlank()) {
                            entryName = sanitizeFilename(originalFilename, "file-" + (i + 1) + "." + extension);
                        }
                        entryName = ensureUniqueEntryName(entryName, usedNames);

                        ZipEntry entry = new ZipEntry(entryName);
                        zipOut.putNextEntry(entry);
                        try (InputStream in = file.getInputStream()) {
                            in.transferTo(zipOut);
                        }
                        zipOut.closeEntry();
                    }
                    zipOut.finish();
                } catch (Throwable ex) {
                    zipError.set(ex);
                } finally {
                    try {
                        pipedOut.close();
                    } catch (IOException ignored) {
                    }
                }
            }, "prothesis-files-zip-" + UUID.randomUUID());

            zipThread.setDaemon(true);
            zipThread.start();

            EncryptedFileIO.encryptToStream(pipedIn, encryptedOut, kek);

            try {
                zipThread.join();
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new IOException("Interrupted while zipping files", ex);
            }

            if (zipError.get() != null) {
                throw new IOException("Impossible de compresser les fichiers", zipError.get());
            }
        }
    }

    private String ensureUniqueEntryName(String entryName, Set<String> usedNames) {
        String base = entryName != null ? entryName : "file";
        String candidate = base;
        int i = 2;
        while (usedNames.contains(candidate)) {
            int dot = base.lastIndexOf('.');
            if (dot > 0) {
                candidate = base.substring(0, dot) + " (" + i + ")" + base.substring(dot);
            } else {
                candidate = base + " (" + i + ")";
            }
            i += 1;
        }
        usedNames.add(candidate);
        return candidate;
    }

    public List<ZipEntrySource> buildZipSourcesForDentist(Long prothesisId, User ownerDentist) {
        Prothesis prothesis = requireProthesisOwnedBy(prothesisId, ownerDentist);
        return buildZipSources(prothesis);
    }

    public List<ZipEntrySource> buildZipSourcesForLab(Long prothesisId, User labUser) {
        Prothesis prothesis = requireProthesisForLab(prothesisId, labUser);
        return buildZipSources(prothesis);
    }

    private List<ZipEntrySource> buildZipSources(Prothesis prothesis) {
        List<ZipEntrySource> sources = new ArrayList<>();

        for (ProthesisFile pf : prothesisFileRepository.findByProthesisIdOrderByUploadedAtDesc(prothesis.getId())) {
            Path path = resolveExistingPath(pf.getPathOrUrl());
            String entryName = sanitizeRelativePath(pf.getRelativePath());
            if (entryName == null || entryName.isBlank()) {
                entryName = pf.getFilename();
            }
            sources.add(new ZipEntrySource(entryName, path));
        }

        if (prothesis.getStlPathOrUrl() != null && !prothesis.getStlPathOrUrl().isBlank()) {
            Path path = resolveExistingPath(prothesis.getStlPathOrUrl());
            String entryName = prothesis.getStlFilename() != null && !prothesis.getStlFilename().isBlank()
                    ? prothesis.getStlFilename()
                    : ("prothese_" + prothesis.getId() + ".stl");
            sources.add(new ZipEntrySource(entryName, path));
        }

        return sources;
    }

    public String buildZipFilename(Long prothesisId) {
        return "prothese_" + prothesisId + "_fichiers.zip";
    }

    public InputStream openDecryptedStream(Path encryptedFile) throws IOException {
        byte[] kek = EncryptionKeyProvider.getOrLoadKek();
        return EncryptedFileIO.openDecryptedStream(Files.newInputStream(encryptedFile), kek);
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
        if (prothesis.getRecordStatus() != null && prothesis.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new IllegalArgumentException("Prothese annulee : lecture seule.");
        }
    }

    private Path resolveExistingPath(String pathOrUrl) {
        Path path = resolvePath(pathOrUrl);
        if (path == null || !Files.exists(path)) {
            throw new NotFoundException("Fichier introuvable");
        }
        return path;
    }

    private Path resolvePath(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.isBlank()) {
            return null;
        }
        return Paths.get(pathOrUrl).toAbsolutePath().normalize();
    }

    private void validateExtension(String extension) {
        if (extension == null || extension.isBlank()) {
            throw new IllegalArgumentException("Extension de fichier invalide");
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

    private String sanitizeRelativePath(String value) {
        if (value == null) return null;
        String raw = value.replace('\\', '/').trim();
        if (raw.isBlank()) return null;
        while (raw.startsWith("/")) raw = raw.substring(1);
        while (raw.startsWith("./")) raw = raw.substring(2);
        if (raw.contains("..")) {
            return null;
        }
        return raw;
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

    private static String safeGet(List<String> items, int index) {
        if (items == null || index < 0 || index >= items.size()) return null;
        return items.get(index);
    }

    private static List<MultipartFile> normalizeFiles(MultipartFile[] files) {
        if (files == null || files.length == 0) {
            return List.of();
        }
        List<MultipartFile> list = new ArrayList<>();
        for (MultipartFile f : files) {
            if (f != null && !f.isEmpty()) {
                list.add(f);
            }
        }
        return list;
    }

    private int safeCount(Prothesis prothesis) {
        if (prothesis == null || prothesis.getId() == null) return 0;
        long n = prothesisFileRepository.countByProthesisId(prothesis.getId());
        if (prothesis.getStlPathOrUrl() != null && !prothesis.getStlPathOrUrl().isBlank()) {
            n += 1;
        }
        if (n > Integer.MAX_VALUE) return Integer.MAX_VALUE;
        return (int) n;
    }

    public record ZipEntrySource(String entryName, Path encryptedPath) {}

    public record ZipBundleSource(String filename, Path encryptedPath) {}
}
