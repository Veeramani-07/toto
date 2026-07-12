package com.example.todo.repository;

import com.example.todo.model.HabitCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, Long> {
    List<HabitCompletion> findByDateBetween(LocalDate start, LocalDate end);
    List<HabitCompletion> findByHabitIdInAndDateBetween(List<Long> habitIds, LocalDate start, LocalDate end);
    Optional<HabitCompletion> findByHabitIdAndDate(Long habitId, LocalDate date);

    @Transactional
    void deleteByHabitId(Long habitId);
}
