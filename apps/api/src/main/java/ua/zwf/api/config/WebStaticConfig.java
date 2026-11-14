package ua.zwf.api.config;

import java.io.IOException;
import java.time.Duration;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * D-02: роздача фронтенду з {@code classpath:/static/} (туди його кладе Gradle-таск {@code syncWebStatic}).
 *
 * <pre>
 * static/
 * ├── index.html, robots.txt, _next/…   ← apps/web-public/out  (Next.js static export, trailingSlash)
 * ├── error/404.html                    ← копія 404.html вітрини — Spring Boot віддає її на будь-який HTML-404
 * └── lms/index.html, lms/assets/…      ← apps/web-lms/dist    (SPA)
 * </pre>
 *
 * <ul>
 *   <li>{@code /lms/**}: існуючий файл → файл; шлях без розширення (клієнтський маршрут TanStack Router)
 *       → {@code lms/index.html}; відсутній файл з розширенням → 404, щоб биті асети не маскувались під HTML.</li>
 *   <li>Вітрина: {@code /about/} і {@code /about} → {@code about/index.html}.</li>
 *   <li>Хешовані асети ({@code /lms/assets/**}, {@code /_next/static/**}) кешуються на рік (immutable),
 *       HTML — {@code no-cache}, щоб новий деплой підхоплювався одразу.</li>
 * </ul>
 * {@code /api/**} сюди не потрапляє: контролери мають пріоритет над resource handlers.
 */
@Configuration
public class WebStaticConfig implements WebMvcConfigurer {

	private static final String STATIC = "classpath:/static/";

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		var immutable = CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();

		registry.addResourceHandler("/lms/assets/**")
			.addResourceLocations(STATIC + "lms/assets/")
			.setCacheControl(immutable);

		registry.addResourceHandler("/_next/static/**")
			.addResourceLocations(STATIC + "_next/static/")
			.setCacheControl(immutable);

		registry.addResourceHandler("/lms", "/lms/", "/lms/**")
			.addResourceLocations(STATIC + "lms/")
			.setCacheControl(CacheControl.noCache())
			.resourceChain(true)
			.addResolver(new SpaFallbackResolver());

		registry.addResourceHandler("/**")
			.addResourceLocations(STATIC)
			.setCacheControl(CacheControl.noCache())
			.resourceChain(true)
			.addResolver(new DirectoryIndexResolver());
	}

	/** Файл, якщо він є; інакше {@code index.html} SPA для «маршрутів» — шляхів без розширення. */
	static final class SpaFallbackResolver extends PathResourceResolver {

		@Override
		protected Resource getResource(String resourcePath, Resource location) throws IOException {
			Resource file = super.getResource(resourcePath, location);
			if (file != null) {
				return file;
			}
			return hasExtension(resourcePath) ? null : super.getResource("index.html", location);
		}

	}

	/** Next.js static export з {@code trailingSlash: true}: {@code /foo/} → {@code foo/index.html}. */
	static final class DirectoryIndexResolver extends PathResourceResolver {

		@Override
		protected Resource getResource(String resourcePath, Resource location) throws IOException {
			if (resourcePath.isEmpty() || resourcePath.endsWith("/")) {
				return super.getResource(resourcePath + "index.html", location);
			}
			Resource file = super.getResource(resourcePath, location);
			if (file != null || hasExtension(resourcePath)) {
				return file;
			}
			return super.getResource(resourcePath + "/index.html", location);
		}

	}

	static boolean hasExtension(String path) {
		int slash = path.lastIndexOf('/');
		return path.indexOf('.', slash + 1) > slash + 1;
	}

}
