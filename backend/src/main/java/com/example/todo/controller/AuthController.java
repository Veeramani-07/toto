package com.example.todo.controller;

import com.example.todo.model.User;
import com.example.todo.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Username cannot be empty");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Password cannot be empty");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        if (user.getPassword().length() < 6) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Password must be at least 6 characters long");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Username already exists");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully");
        response.put("username", savedUser.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest, HttpServletRequest request) {
        return userRepository.findByUsername(loginRequest.getUsername())
                .map(user -> {
                    if (passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                        // Create authentication token
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                user.getUsername(), null, Collections.emptyList());
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        // Bind USER_ID in session
                        request.getSession().setAttribute("USER_ID", user.getId());

                        Map<String, Object> response = new HashMap<>();
                        response.put("username", user.getUsername());
                        response.put("id", user.getId());
                        return ResponseEntity.ok(response);
                    } else {
                        Map<String, String> response = new HashMap<>();
                        response.put("error", "Invalid username or password");
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
                    }
                })
                .orElseGet(() -> {
                    Map<String, String> response = new HashMap<>();
                    response.put("error", "Invalid username or password");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
                });
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        request.getSession().invalidate();
        SecurityContextHolder.clearContext();
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        Long userId = (Long) request.getSession().getAttribute("USER_ID");
        if (userId == null) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        return userRepository.findById(userId)
                .map(user -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("username", user.getUsername());
                    response.put("id", user.getId());
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }
}
