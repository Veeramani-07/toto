package com.example.todo.controller;

import com.example.todo.model.Habit;
import com.example.todo.model.HabitCompletion;
import com.example.todo.repository.HabitRepository;
import com.example.todo.repository.HabitCompletionRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/habits")
@CrossOrigin(origins = "*")
public class HabitController {

    private final HabitRepository habitRepository;
    private final HabitCompletionRepository habitCompletionRepository;

    @Autowired
    public HabitController(HabitRepository habitRepository, HabitCompletionRepository habitCompletionRepository) {
        this.habitRepository = habitRepository;
        this.habitCompletionRepository = habitCompletionRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAllHabits(HttpServletRequest request) {
        Long userId = (Long) request.getSession().getAttribute("USER_ID");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "Unauthorized"));
        }
        return ResponseEntity.ok(habitRepository.findByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<?> createHabit(@RequestBody Habit habit, HttpServletRequest request) {
        Long userId = (Long) request.getSession().getAttribute("USER_ID");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "Unauthorized"));
        }

        if (habit.getName() == null || habit.getName().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", "Habit name cannot be empty"));
        }

        habit.setUserId(userId);
        if (habit.getStartDate() == null) {
            habit.setStartDate(LocalDate.now());
        }
        return ResponseEntity.ok(habitRepository.save(habit));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHabit(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getSession().getAttribute("USER_ID");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "Unauthorized"));
        }

        return habitRepository.findById(id)
                .map(habit -> {
                    if (!habit.getUserId().equals(userId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Collections.singletonMap("error", "Forbidden"));
                    }
                    habitCompletionRepository.deleteByHabitId(id);
                    habitRepository.delete(habit);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/completions")
    public ResponseEntity<?> getCompletions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            HttpServletRequest request) {
        Long userId = (Long) request.getSession().getAttribute("USER_ID");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "Unauthorized"));
        }

        List<Habit> userHabits = habitRepository.findByUserId(userId);
        if (userHabits.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Long> habitIds = userHabits.stream().map(Habit::getId).collect(Collectors.toList());
        return ResponseEntity.ok(habitCompletionRepository.findByHabitIdInAndDateBetween(habitIds, start, end));
    }

    @PostMapping("/toggle")
    public ResponseEntity<?> toggleCompletion(@RequestBody ToggleRequest request, HttpServletRequest servletRequest) {
        Long userId = (Long) servletRequest.getSession().getAttribute("USER_ID");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "Unauthorized"));
        }

        return habitRepository.findById(request.getHabitId())
                .map(habit -> {
                    if (!habit.getUserId().equals(userId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Collections.singletonMap("error", "Forbidden"));
                    }

                    HabitCompletion result = habitCompletionRepository.findByHabitIdAndDate(request.getHabitId(), request.getDate())
                            .map(completion -> {
                                completion.setCompleted(request.isCompleted());
                                return habitCompletionRepository.save(completion);
                            })
                            .orElseGet(() -> {
                                HabitCompletion newCompletion = new HabitCompletion(
                                        request.getHabitId(),
                                        request.getDate(),
                                        request.isCompleted()
                                );
                                return habitCompletionRepository.save(newCompletion);
                            });
                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Request payload structure for toggling
    public static class ToggleRequest {
        private Long habitId;
        private LocalDate date;
        private boolean completed;

        public ToggleRequest() {}

        public Long getHabitId() {
            return habitId;
        }

        public void setHabitId(Long habitId) {
            this.habitId = habitId;
        }

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate date) {
            this.date = date;
        }

        public boolean isCompleted() {
            return completed;
        }

        public void setCompleted(boolean completed) {
            this.completed = completed;
        }
    }
}
