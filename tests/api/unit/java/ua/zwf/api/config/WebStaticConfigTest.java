package ua.zwf.api.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

/** Unit-тести резолверів статики (D-02) на тимчасовій файловій системі — без Spring-контексту. */
class WebStaticConfigTest {

	@TempDir
	Path root;

	Resource lms;

	Resource site;

	@BeforeEach
	void setUp() throws IOException {
		Files.createDirectories(root.resolve("lms/assets"));
		Files.createDirectories(root.resolve("site/about"));
		Files.writeString(root.resolve("lms/index.html"), "LMS");
		Files.writeString(root.resolve("lms/assets/app-1.js"), "js");
		Files.writeString(root.resolve("site/index.html"), "HOME");
		Files.writeString(root.resolve("site/about/index.html"), "ABOUT");
		Files.writeString(root.resolve("site/robots.txt"), "robots");
		lms = new FileSystemResource(root.resolve("lms").toString() + "/");
		site = new FileSystemResource(root.resolve("site").toString() + "/");
	}

	@ParameterizedTest
	@CsvSource({ "app.js, true", "assets/app-1.js, true", "a/b.c/route, false", "recipes, false", "'', false",
			"lms/.hidden, false", "favicon.svg, true" })
	void hasExtensionLooksOnlyAtLastSegment(String path, boolean expected) {
		assertThat(WebStaticConfig.hasExtension(path)).isEqualTo(expected);
	}

	@Test
	void spaResolverServesExistingFile() throws IOException {
		var resolved = new WebStaticConfig.SpaFallbackResolver().getResource("assets/app-1.js", lms);
		assertThat(resolved).isNotNull();
		assertThat(resolved.getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).isEqualTo("js");
	}

	@Test
	void spaResolverFallsBackToIndexForClientRoutes() throws IOException {
		var resolver = new WebStaticConfig.SpaFallbackResolver();
		assertThat(resolver.getResource("recipes", lms).getFilename()).isEqualTo("index.html");
		assertThat(resolver.getResource("recipes/r1", lms).getFilename()).isEqualTo("index.html");
		assertThat(resolver.getResource("", lms).getFilename()).isEqualTo("index.html");
	}

	@Test
	void spaResolverReturnsNullForMissingAsset() throws IOException {
		assertThat(new WebStaticConfig.SpaFallbackResolver().getResource("assets/missing.js", lms)).isNull();
	}

	@Test
	void directoryResolverMapsTrailingSlashAndBarePathToIndex() throws IOException {
		var resolver = new WebStaticConfig.DirectoryIndexResolver();
		assertThat(resolver.getResource("", site).getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).isEqualTo("HOME");
		assertThat(resolver.getResource("about/", site).getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).isEqualTo("ABOUT");
		assertThat(resolver.getResource("about", site).getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).isEqualTo("ABOUT");
		assertThat(resolver.getResource("robots.txt", site)).isNotNull();
	}

	@Test
	void directoryResolverReturnsNullForUnknownPaths() throws IOException {
		var resolver = new WebStaticConfig.DirectoryIndexResolver();
		assertThat(resolver.getResource("nope/", site)).isNull();
		assertThat(resolver.getResource("nope", site)).isNull();
		assertThat(resolver.getResource("nope.css", site)).isNull();
	}

}
