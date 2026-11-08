plugins {
	java
	id("org.springframework.boot") version "4.1.2"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "ua.zwf"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(25)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-session-jdbc")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.0")
	developmentOnly("org.springframework.boot:spring-boot-docker-compose")
	runtimeOnly("org.postgresql:postgresql")

	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-session-jdbc-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// ---------------------------------------------------------------------------
// Тести живуть у корені монорепо: /tests/api/{unit,integration}
//   test             — unit: чиста Java + Mockito, без Spring-контексту і Docker (секунди)
//   integrationTest  — Spring Boot на випадковому порту + PostgreSQL у Testcontainers
// `./gradlew check` запускає обидва.
// ---------------------------------------------------------------------------
val testsRoot = layout.projectDirectory.dir("../../tests/api")

sourceSets {
	test {
		java.setSrcDirs(listOf(testsRoot.dir("unit/java")))
		resources.setSrcDirs(listOf(testsRoot.dir("unit/resources")))
	}
	create("integrationTest") {
		java.setSrcDirs(listOf(testsRoot.dir("integration/java")))
		resources.setSrcDirs(listOf(testsRoot.dir("integration/resources")))
		compileClasspath += sourceSets.main.get().output
		runtimeClasspath += sourceSets.main.get().output
	}
}

configurations["integrationTestImplementation"].extendsFrom(configurations.testImplementation.get())
configurations["integrationTestRuntimeOnly"].extendsFrom(configurations.testRuntimeOnly.get())

val integrationTest = tasks.register<Test>("integrationTest") {
	description = "Runs integration tests (Spring Boot + Testcontainers) from /tests/api/integration."
	group = LifecycleBasePlugin.VERIFICATION_GROUP
	testClassesDirs = sourceSets["integrationTest"].output.classesDirs
	classpath = sourceSets["integrationTest"].runtimeClasspath
	shouldRunAfter(tasks.test)
}

tasks.check {
	dependsOn(integrationTest)
}

tasks.withType<Test>().configureEach {
	useJUnitPlatform()
	testLogging {
		events("failed", "skipped")
		exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
	}
}

// ---------------------------------------------------------------------------
// D-02: вбудовуємо зібраний фронтенд у jar → classpath:/static/
//   apps/web-public/out  → static/            (+ 404.html → static/error/404.html)
//   apps/web-lms/dist    → static/lms/
// Фронт збирається окремо (`pnpm build:web`); Turborepo робить це автоматично перед `@zwf/api#build`.
// -PrequireWeb — падати, якщо бандлів немає (CI / реліз). Без нього — лише попередження (локальна розробка API).
// ---------------------------------------------------------------------------
val webPublicOut = layout.projectDirectory.dir("../web-public/out")
val webLmsDist = layout.projectDirectory.dir("../web-lms/dist")
val requireWeb = providers.gradleProperty("requireWeb").isPresent

val syncWebStatic = tasks.register<Sync>("syncWebStatic") {
	description = "Copies built frontend bundles into generated static resources."
	val publicDir = webPublicOut.asFile
	val lmsDir = webLmsDist.asFile
	val strict = requireWeb
	inputs.property("requireWeb", strict)

	into(layout.buildDirectory.dir("generated/web/static"))
	from(webPublicOut)
	from(webPublicOut) {
		include("404.html")
		into("error")
	}
	from(webLmsDist) {
		into("lms")
	}

	doFirst {
		val missing = listOf(publicDir, lmsDir).filterNot { it.resolve("index.html").exists() }
		if (missing.isNotEmpty()) {
			val message = "Frontend bundles not found: ${missing.joinToString()} — run `pnpm build:web` first."
			if (strict) throw GradleException(message) else logger.warn("WARNING: $message")
		}
	}
}

sourceSets {
	main {
		resources.srcDir(syncWebStatic.map { layout.buildDirectory.dir("generated/web").get() })
	}
}

// Фіксоване ім'я артефакту — зручніше для Docker / CI
tasks.bootJar {
	archiveFileName = "zwf-api.jar"
}

tasks.jar {
	enabled = false
}
