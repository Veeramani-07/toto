#!/usr/bin/env bash
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
chmod +x mvnw
./mvnw clean package -DskipTests
