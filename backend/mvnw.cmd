@echo off
set "MAVEN_CMD="

if exist "C:\Users\Welcome\.m2\wrapper\dists\apache-maven-3.9.12-bin\5nmfsn99br87k5d4ajlekdq10k\apache-maven-3.9.12\bin\mvn.cmd" (
    set "MAVEN_CMD=C:\Users\Welcome\.m2\wrapper\dists\apache-maven-3.9.12-bin\5nmfsn99br87k5d4ajlekdq10k\apache-maven-3.9.12\bin\mvn.cmd"
) else if exist "C:\Users\Welcome\.m2\wrapper\dists\apache-maven-3.9.11-bin\6mqf5t809d9geo83kj4ttckcbc\apache-maven-3.9.11\bin\mvn.cmd" (
    set "MAVEN_CMD=C:\Users\Welcome\.m2\wrapper\dists\apache-maven-3.9.11-bin\6mqf5t809d9geo83kj4ttckcbc\apache-maven-3.9.11\bin\mvn.cmd"
) else if exist "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2025.2.3\plugins\maven\lib\maven3\bin\mvn.cmd" (
    set "MAVEN_CMD=C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2025.2.3\plugins\maven\lib\maven3\bin\mvn.cmd"
)

if "%MAVEN_CMD%" == "" (
    echo Maven was not found on this system.
    exit /b 1
)

"%MAVEN_CMD%" %*
