package com.example.todo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Profile("prod")
public class DataSourceConfig {

    @Value("${DATABASE_URL}")
    private String databaseUrl;

    @Bean
    public DataSource dataSource() throws Exception {
        // Render provides: postgres://user:password@host:port/dbname
        // Convert to a proper JDBC URL and extract credentials
        String cleanUrl = databaseUrl
                .replace("postgres://", "postgresql://")
                .replace("jdbc:postgresql://", "postgresql://");

        URI uri = new URI(cleanUrl);

        String host = uri.getHost();
        int port = uri.getPort() == -1 ? 5432 : uri.getPort();
        String path = uri.getPath().replaceFirst("/", "");
        String userInfo = uri.getUserInfo();
        String username = userInfo.split(":")[0];
        String password = userInfo.split(":")[1];

        String jdbcUrl = String.format(
                "jdbc:postgresql://%s:%d/%s?sslmode=require", host, port, path);

        return DataSourceBuilder.create()
                .url(jdbcUrl)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }
}
