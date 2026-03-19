package com.cabinetplus.backend.security.crypto;

import org.springframework.core.io.AbstractResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public final class DecryptingFileResource extends AbstractResource {

    private final Path path;
    private final byte[] kek;

    public DecryptingFileResource(Path path, byte[] kek) {
        this.path = path;
        this.kek = kek.clone();
    }

    @Override
    public String getDescription() {
        return "Decrypting resource for " + path;
    }

    @Override
    public String getFilename() {
        return path.getFileName() != null ? path.getFileName().toString() : null;
    }

    @Override
    public InputStream getInputStream() throws IOException {
        InputStream encrypted = Files.newInputStream(path);
        try {
            return EncryptedFileIO.openDecryptedStream(encrypted, kek);
        } catch (RuntimeException ex) {
            try {
                encrypted.close();
            } catch (IOException ignored) {
            }
            throw ex;
        }
    }
}

