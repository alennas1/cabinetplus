package com.cabinetplus.backend.security.crypto;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.SecureRandom;

/**
 * Simple encrypted file format for stored documents.
 *
 * File layout:
 * - magic (6 bytes) "CPDOC1"
 * - version (1 byte) = 1
 * - ivLen (1 byte) = 12
 * - wrappedDekLen (2 bytes, unsigned big endian)
 * - iv bytes
 * - wrappedDek bytes
 * - ciphertext bytes (AES-256-GCM, tag appended at end)
 */
public final class EncryptedFileIO {

    private static final byte[] MAGIC = new byte[]{'C', 'P', 'D', 'O', 'C', '1'};
    private static final int VERSION = 1;
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;
    private static final int DEK_BYTES = 32;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private EncryptedFileIO() {
    }

    public static long encryptToStream(InputStream plaintext, OutputStream destination, byte[] kek) throws IOException {
        byte[] dek = new byte[DEK_BYTES];
        SECURE_RANDOM.nextBytes(dek);

        byte[] iv = new byte[IV_BYTES];
        SECURE_RANDOM.nextBytes(iv);

        byte[] wrappedDek = AesKeyWrap.wrap(kek, dek);

        try {
            writeHeader(destination, iv, wrappedDek);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(dek, "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));

            try (CipherOutputStream cipherOut = new CipherOutputStream(new BufferedOutputStream(destination), cipher)) {
                return plaintext.transferTo(cipherOut);
            }
        } catch (IOException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to encrypt document file", ex);
        }
    }

    public static InputStream openDecryptedStream(InputStream encryptedFile, byte[] kek) throws IOException {
        BufferedInputStream buffered = new BufferedInputStream(encryptedFile);
        buffered.mark(64);

        Header header;
        try {
            header = readHeader(buffered);
        } catch (NotEncryptedFileException ex) {
            buffered.reset();
            return buffered;
        }

        try {
            byte[] dek = AesKeyWrap.unwrap(kek, header.wrappedDek);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(dek, "AES"), new GCMParameterSpec(GCM_TAG_BITS, header.iv));
            return new CipherInputStream(buffered, cipher);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to decrypt document file", ex);
        }
    }

    public static boolean isEncryptedFile(InputStream input) throws IOException {
        BufferedInputStream buffered = new BufferedInputStream(input);
        buffered.mark(64);
        try {
            readHeader(buffered);
            return true;
        } catch (NotEncryptedFileException ex) {
            return false;
        } finally {
            buffered.reset();
        }
    }

    private static void writeHeader(OutputStream out, byte[] iv, byte[] wrappedDek) throws IOException {
        DataOutputStream dataOut = new DataOutputStream(out);
        dataOut.write(MAGIC);
        dataOut.writeByte(VERSION);
        dataOut.writeByte(iv.length);
        dataOut.writeShort(wrappedDek.length);
        dataOut.write(iv);
        dataOut.write(wrappedDek);
        dataOut.flush();
    }

    private static Header readHeader(BufferedInputStream in) throws IOException {
        DataInputStream dataIn = new DataInputStream(in);
        byte[] magic = new byte[MAGIC.length];
        try {
            dataIn.readFully(magic);
        } catch (EOFException ex) {
            throw new NotEncryptedFileException();
        }

        for (int i = 0; i < MAGIC.length; i++) {
            if (magic[i] != MAGIC[i]) {
                throw new NotEncryptedFileException();
            }
        }

        int version = dataIn.readUnsignedByte();
        if (version != VERSION) {
            throw new IllegalArgumentException("Unsupported encrypted file version: " + version);
        }

        int ivLen = dataIn.readUnsignedByte();
        if (ivLen < 8 || ivLen > 32) {
            throw new IllegalArgumentException("Invalid IV length in encrypted file: " + ivLen);
        }

        int wrappedDekLen = dataIn.readUnsignedShort();
        if (wrappedDekLen <= 0 || wrappedDekLen > 512) {
            throw new IllegalArgumentException("Invalid wrapped key length in encrypted file: " + wrappedDekLen);
        }

        byte[] iv = new byte[ivLen];
        dataIn.readFully(iv);

        byte[] wrappedDek = new byte[wrappedDekLen];
        dataIn.readFully(wrappedDek);

        return new Header(iv, wrappedDek);
    }

    private record Header(byte[] iv, byte[] wrappedDek) {
    }

    private static final class NotEncryptedFileException extends RuntimeException {
    }
}

