package com.example.todo;

import com.example.todo.model.Habit;
import com.example.todo.model.HabitCompletion;
import com.example.todo.model.User;
import com.example.todo.repository.HabitRepository;
import com.example.todo.repository.HabitCompletionRepository;
import com.example.todo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
public class HabitSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(HabitSeeder.class);

    private final HabitRepository habitRepository;
    private final HabitCompletionRepository habitCompletionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public HabitSeeder(HabitRepository habitRepository, 
                       HabitCompletionRepository habitCompletionRepository,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.habitRepository = habitRepository;
        this.habitCompletionRepository = habitCompletionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            // Create demo user
            User demoUser = new User("demo", passwordEncoder.encode("password123"));
            User savedUser = userRepository.save(demoUser);
            Long userId = savedUser.getId();

            LocalDate startOfCurrentMonth = LocalDate.now().withDayOfMonth(1);
            LocalDate today = LocalDate.now();

            // 1. Seed Habits linked to user
            List<Habit> habits = new ArrayList<>();
            habits.add(new Habit("Daily Exercise", "Health", startOfCurrentMonth, userId));
            habits.add(new Habit("Bed Before 11pm", "Health", startOfCurrentMonth, userId));
            habits.add(new Habit("Drink Protein", "Health", startOfCurrentMonth, userId));
            habits.add(new Habit("Eat Vegetables", "Health", startOfCurrentMonth, userId));
            habits.add(new Habit("Call Grandparents", "Personal", startOfCurrentMonth, userId));
            habits.add(new Habit("No Snacks", "Health", startOfCurrentMonth, userId));
            habits.add(new Habit("Do Homework", "Work", startOfCurrentMonth, userId));
            habits.add(new Habit("Water Plants", "Personal", startOfCurrentMonth, userId));
            habits.add(new Habit("Read 10+ Pages", "Personal", startOfCurrentMonth, userId));
            habits.add(new Habit("Make Bed", "Personal", startOfCurrentMonth, userId));

            List<Habit> savedHabits = habitRepository.saveAll(habits);

            // 2. Seed completions from startOfCurrentMonth up to today
            List<HabitCompletion> completions = new ArrayList<>();

            for (LocalDate date = startOfCurrentMonth; !date.isAfter(today); date = date.plusDays(1)) {
                int day = date.getDayOfMonth();
                DayOfWeek dow = date.getDayOfWeek();

                for (Habit habit : savedHabits) {
                    boolean completed = false;

                    switch (habit.getName()) {
                        case "Daily Exercise":
                            completed = (day % 7 != 0); // rest day on every 7th day
                            break;
                        case "Bed Before 11pm":
                            completed = (day % 3 != 0);
                            break;
                        case "Drink Protein":
                            completed = (day % 4 != 0);
                            break;
                        case "Eat Vegetables":
                            completed = (day % 5 != 0);
                            break;
                        case "Call Grandparents":
                            completed = (dow == DayOfWeek.SUNDAY || dow == DayOfWeek.WEDNESDAY);
                            break;
                        case "No Snacks":
                            completed = (day % 2 == 0);
                            break;
                        case "Do Homework":
                            completed = (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY); // weekdays only
                            break;
                        case "Water Plants":
                            completed = (dow == DayOfWeek.TUESDAY || dow == DayOfWeek.THURSDAY || dow == DayOfWeek.SATURDAY);
                            break;
                        case "Read 10+ Pages":
                            completed = (day % 6 == 0);
                            break;
                        case "Make Bed":
                            completed = (day % 15 != 0); // missed only occasionally
                            break;
                    }

                    completions.add(new HabitCompletion(habit.getId(), date, completed));
                }
            }

            habitCompletionRepository.saveAll(completions);
            log.info("Habit tracker database seeded with 10 habits linked to user 'demo'!");
        }
    }
}
