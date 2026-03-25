package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/ransomware")
@CrossOrigin(origins = "*")
public class RansomwareController {

    @Autowired
    private RansomwareService ransomwareService;

    // Create a dummy file
    @PostMapping("/create-dummy-file")
    public ResponseEntity<Map<String, String>> createDummyFile(
            @RequestParam(defaultValue = "dummy_file.txt") String filename,
            @RequestParam(defaultValue = "This is a test file created for ransomware demonstration.") String content) {

        String filePath = ransomwareService.createDummyFile(filename, content);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Dummy file created successfully");
        response.put("filePath", filePath);
        return ResponseEntity.ok(response);
    }

    // Encrypt the file with AES-256 (in-place, keeps filename)
    @PostMapping("/lock-file")
    public ResponseEntity<Map<String, Object>> lockFile(@RequestParam String filepath) {
        Map<String, Object> result = ransomwareService.lockFile(filepath);
        return ResponseEntity.ok(result);
    }

    // Show ransomware message
    @GetMapping("/show-ransom-message")
    public ResponseEntity<Map<String, String>> showRansomMessage() {
        Map<String, String> response = new HashMap<>();
        response.put("ransomNote", ransomwareService.getRansomMessage());
        return ResponseEntity.ok(response);
    }

    // Delete the file (destructive action)
    @DeleteMapping("/delete-file")
    public ResponseEntity<Map<String, String>> deleteFile(@RequestParam String filepath) {
        boolean deleted = ransomwareService.deleteFile(filepath);
        Map<String, String> response = new HashMap<>();

        if (deleted) {
            response.put("message", "File has been PERMANENTLY DELETED!");
            response.put("status", "deleted");
        } else {
            response.put("message", "Failed to delete file. File may not exist.");
            response.put("status", "error");
        }

        return ResponseEntity.ok(response);
    }

    // List all affected files
    @GetMapping("/affected-files")
    public ResponseEntity<Map<String, Object>> getAffectedFiles() {
        Map<String, Object> response = new HashMap<>();
        response.put("affectedFiles", ransomwareService.getAffectedFiles());
        response.put("count", ransomwareService.getAffectedFiles().size());
        return ResponseEntity.ok(response);
    }

    // Decrypt the file using the provided key
    @PostMapping("/decrypt-file")
    public ResponseEntity<Map<String, Object>> decryptFile(
            @RequestParam String filepath,
            @RequestParam String encryptionKey) {
        Map<String, Object> result = ransomwareService.decryptFile(filepath, encryptionKey);
        return ResponseEntity.ok(result);
    }

    // Get encryption key for a file (if still in memory)
    @GetMapping("/get-key")
    public ResponseEntity<Map<String, String>> getEncryptionKey(@RequestParam String filepath) {
        String key = ransomwareService.getEncryptionKey(filepath);
        Map<String, String> response = new HashMap<>();
        if (key != null) {
            response.put("encryptionKey", key);
            response.put("message", "Key retrieved from memory (in real ransomware, this would not be available)");
        } else {
            response.put("message", "No key found for this file. It may not be encrypted or key was removed.");
        }
        return ResponseEntity.ok(response);
    }

    // Check file status
    @GetMapping("/file-status")
    public ResponseEntity<Map<String, Object>> getFileStatus(@RequestParam String filepath) {
        Map<String, Object> status = ransomwareService.getFileStatus(filepath);
        return ResponseEntity.ok(status);
    }
}
