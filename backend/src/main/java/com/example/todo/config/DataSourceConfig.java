package com.example.todo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration
@Profile("prod")
public class DataSourceConfig {

    @Value("${DATABASE_URL}")
    private String databaseUrl;

    @Bean
    public DataSource dataSource() {
        String jdbcUrl;
        if (databaseUrl.startsWith("jdbc:postgresql://")) {
            jdbcUrl = databaseUrl;
        } else if (databaseUrl.startsWith("jdbc:postgres://")) {
            jdbcUrl = databaseUrl.replace("jdbc:postgres://", "jdbc:postgresql://");
        } else if (databaseUrl.startsWith("postgres://")) {
            jdbcUrl = databaseUrl.replace("postgres://", "jdbc:postgresql://");
        } else {
            jdbcUrl = "jdbc:postgresql://" + databaseUrl;
        }
        return DataSourceBuilder.create()
                .url(jdbcUrl)
                .driverClassName("org.postgresql.Driver")
                .build();
    }
}
