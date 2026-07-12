#!/usr/bin/env bash
set -e
chmod +x mvnw
./mvnw clean package -DskipTests
