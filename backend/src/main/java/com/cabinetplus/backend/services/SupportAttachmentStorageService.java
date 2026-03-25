package com.cabinetplus.backend.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cabinetplus.backend.exceptions.BadRequestException;

@Service
public class SupportAttachmentStorageService {

    private static final long MAX_IMAGE_BYTES = 5L * 1024L * 1024L;

    public record StoredAttachment(
            String path,
            String contentType,
            String originalName,
            long size
    ) {}

    public StoredAttachment storeThreadImage(Long threadId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException(java.util.Map.of("file", "Image obligatoire"));
        }

        long size = file.getSize();
        if (size <= 0) {
            throw new BadRequestException(java.util.Map.of("file", "Image invalide"));
        }
        if (size > MAX_IMAGE_BYTES) {
            throw new BadRequestException(java.util.Map.of("file", "Image trop grande (max 5MB)"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new BadRequestException(java.util.Map.of("file", "Seules les images sont acceptées"));
        }

        String originalName = safeOriginalName(file.getOriginalFilename());
        String extension = inferExtension(originalName, contentType);
        String fileName = UUID.randomUUID() + extension;

        Path baseDir = Paths.get(System.getProperty("user.dir"), "uploads", "support", "thread-" + threadId);
        try {
            Files.createDirectories(baseDir);
            Path target = baseDir.resolve(fileName);
            file.transferTo(target);
        } catch (IOException ex) {
            throw new BadRequestException(java.util.Map.of("_", "Erreur lors de l'enregistrement de l'image"));
        }

        return new StoredAttachment(
                Paths.get("uploads", "support", "thread-" + threadId, fileName).toString().replace("\\", "/"),
                contentType,
                originalName,
                size
        );
    }

    public byte[] loadBytes(String storedPath) throws IOException {
        if (storedPath == null || storedPath.isBlank()) return null;
        Path relative = Paths.get(storedPath);
        if (relative.isAbsolute()) {
            throw new IOException("Invalid path");
        }

        Path base = Paths.get(System.getProperty("user.dir"), "uploads", "support").normalize();
        Path p = Paths.get(System.getProperty("user.dir")).resolve(relative).normalize();
        if (!p.startsWith(base)) {
            throw new IOException("Invalid path");
        }
        return Files.readAllBytes(p);
    }

    private String safeOriginalName(String name) {
        if (name == null) return null;
        String n = name.replace("\\", "/");
        int idx = n.lastIndexOf("/");
        if (idx >= 0) n = n.substring(idx + 1);
        n = n.trim();
        if (n.isBlank()) return null;
        if (n.length() > 200) return n.substring(n.length() - 200);
        return n;
    }

    private String inferExtension(String originalName, String contentType) {
        if (originalName != null) {
            String n = originalName.toLowerCase(Locale.ROOT);
            int dot = n.lastIndexOf(".");
            if (dot >= 0 && dot < n.length() - 1) {
                String ext = n.substring(dot);
                if (ext.length() <= 8 && ext.matches("\\.[a-z0-9]+")) {
                    return ext;
                }
            }
        }

        String ct = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";
        if (ct.contains("png")) return ".png";
        if (ct.contains("jpeg") || ct.contains("jpg")) return ".jpg";
        if (ct.contains("webp")) return ".webp";
        if (ct.contains("gif")) return ".gif";
        return ".img";
    }
}
