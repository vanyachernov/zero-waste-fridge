package ua.zwf.api.support;

import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Мінімальний «браузер» для інтеграційних тестів: справжні HTTP-запити до запущеного сервера,
 * власний cookie jar (сесія {@code ZWF_SESSION}, {@code XSRF-TOKEN}) і автоматичний CSRF-заголовок —
 * так само, як це робить {@code packages/api-client/src/http.ts} у SPA.
 */
public final class ApiClient {

	public static final String SESSION_COOKIE = "ZWF_SESSION";
	public static final String CSRF_COOKIE = "XSRF-TOKEN";
	public static final String CSRF_HEADER = "X-XSRF-TOKEN";

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private final String baseUrl;
	private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
	private final HttpClient http;

	public ApiClient(int port) {
		this.baseUrl = "http://localhost:" + port;
		this.http = HttpClient.newBuilder()
			.cookieHandler(cookies)
			.followRedirects(HttpClient.Redirect.NEVER)
			.connectTimeout(Duration.ofSeconds(5))
			.build();
	}

	public Response get(String path) {
		return send(request(path).GET().header("Accept", "application/json"));
	}

	/** POST з JSON-тілом і CSRF-заголовком (cookie {@code XSRF-TOKEN} отримується автоматично). */
	public Response post(String path, Object body) {
		ensureCsrfCookie();
		return postRaw(path, body, csrfToken().orElseThrow());
	}

	/** Відкриває потік Server-Sent Events і читає його у фоні (B-54). */
	public SseStream stream(String path) {
		var queue = new java.util.concurrent.LinkedBlockingQueue<String>();
		var future = http.sendAsync(request(path).timeout(Duration.ofMinutes(5)).header("Accept", "text/event-stream").GET().build(),
				HttpResponse.BodyHandlers.ofLines());
		var body = new java.util.concurrent.atomic.AtomicReference<java.util.stream.Stream<String>>();
		future.thenAccept(response -> {
			queue.add("status:" + response.statusCode());
			body.set(response.body());
			try {
				response.body().forEach(queue::add);
			}
			catch (RuntimeException closed) {
				// потік закрили з тесту
			}
		});
		return new SseStream(queue, future, body);
	}

	/** Події SSE: {@code event: <name>} + {@code data: <json>}, розділені порожнім рядком. */
	public static final class SseStream implements AutoCloseable {

		public record Event(String name, String data) {
		}

		private final java.util.concurrent.BlockingQueue<String> lines;

		private final java.util.concurrent.CompletableFuture<?> future;

		private final java.util.concurrent.atomic.AtomicReference<java.util.stream.Stream<String>> body;

		SseStream(java.util.concurrent.BlockingQueue<String> lines, java.util.concurrent.CompletableFuture<?> future,
				java.util.concurrent.atomic.AtomicReference<java.util.stream.Stream<String>> body) {
			this.lines = lines;
			this.future = future;
			this.body = body;
		}

		/** Наступна подія з такою назвою (інші пропускаються); {@code null} — не прийшла за 5 с. */
		public Event next(String name) {
			long deadline = System.currentTimeMillis() + 5000;
			String event = null;
			StringBuilder data = new StringBuilder();
			try {
				while (System.currentTimeMillis() < deadline) {
					String line = lines.poll(deadline - System.currentTimeMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
					if (line == null) {
						return null;
					}
					if (line.startsWith("event:")) {
						event = line.substring(6).trim();
					}
					else if (line.startsWith("data:")) {
						data.append(line.substring(5).trim());
					}
					else if (line.isEmpty()) {
						if (name.equals(event)) {
							return new Event(event, data.toString());
						}
						event = null;
						data.setLength(0);
					}
				}
			}
			catch (InterruptedException ex) {
				Thread.currentThread().interrupt();
			}
			return null;
		}

		/** Код відповіді на запит потоку (200 — відкрито, 401 — без сесії). */
		public int status() {
			try {
				String first = lines.poll(5, java.util.concurrent.TimeUnit.SECONDS);
				return first != null && first.startsWith("status:") ? Integer.parseInt(first.substring(7)) : -1;
			}
			catch (InterruptedException ex) {
				Thread.currentThread().interrupt();
				return -1;
			}
		}

		/** Закриває тіло відповіді — а з ним і TCP-з'єднання, як закрита вкладка браузера. */
		@Override
		public void close() {
			var stream = body.get();
			if (stream != null) {
				stream.close();
			}
			future.cancel(true);
		}

	}

	/** PATCH з JSON-тілом і CSRF-заголовком. */
	public Response patch(String path, Object body) {
		ensureCsrfCookie();
		return send(request(path).header("Content-Type", "application/json")
			.header("Accept", "application/json")
			.header(CSRF_HEADER, csrfToken().orElseThrow())
			.method("PATCH", HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body))));
	}

	/** Довільний метод (PUT…) з JSON-тілом і CSRF-заголовком. */
	public Response send(String method, String path, Object body) {
		ensureCsrfCookie();
		return send(request(path).header("Content-Type", "application/json")
			.header("Accept", "application/json")
			.header(CSRF_HEADER, csrfToken().orElseThrow())
			.method(method, HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body))));
	}

	/** DELETE з CSRF-заголовком. */
	public Response delete(String path) {
		ensureCsrfCookie();
		return send(request(path).header("Accept", "application/json")
			.header(CSRF_HEADER, csrfToken().orElseThrow())
			.DELETE());
	}

	/** POST із сирим тілом (зламаний JSON тощо). */
	public Response postJson(String path, String rawJson) {
		ensureCsrfCookie();
		return send(request(path).header("Content-Type", "application/json")
			.header("Accept", "application/json")
			.header(CSRF_HEADER, csrfToken().orElseThrow())
			.POST(HttpRequest.BodyPublishers.ofString(rawJson)));
	}

	/** POST без CSRF-заголовка або з довільним значенням — для негативних сценаріїв. */
	public Response postRaw(String path, Object body, String csrfHeaderValue) {
		var builder = request(path)
			.header("Content-Type", "application/json")
			.header("Accept", "application/json")
			.POST(body == null ? HttpRequest.BodyPublishers.noBody()
					: HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
		if (csrfHeaderValue != null) {
			builder.header(CSRF_HEADER, csrfHeaderValue);
		}
		return send(builder);
	}

	public Optional<String> cookie(String name) {
		return cookies.getCookieStore()
			.getCookies()
			.stream()
			.filter(c -> c.getName().equals(name) && !c.hasExpired())
			.map(HttpCookie::getValue)
			.filter(v -> !v.isEmpty())
			.findFirst();
	}

	public Optional<String> csrfToken() {
		return cookie(CSRF_COOKIE);
	}

	/** Підкласти cookie вручну (напр., старий ідентифікатор сесії для перевірки захисту від фіксації). */
	public void setCookie(String name, String value) {
		var cookie = new HttpCookie(name, value);
		cookie.setPath("/");
		cookie.setVersion(0);
		cookies.getCookieStore().add(URI.create(baseUrl), cookie);
	}

	/** Імітує закриття браузера: лишаються тільки persistent cookie (з Max-Age). */
	public void dropSessionCookies(List<String> names) {
		var store = cookies.getCookieStore();
		store.getCookies().stream().filter(c -> names.contains(c.getName())).forEach(c -> store.remove(null, c));
	}

	private void ensureCsrfCookie() {
		if (csrfToken().isEmpty()) {
			get("/api/auth/csrf");
		}
	}

	private HttpRequest.Builder request(String path) {
		return HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(Duration.ofSeconds(15));
	}

	private Response send(HttpRequest.Builder builder) {
		try {
			HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
			return new Response(response.statusCode(), response.body(), response.headers());
		}
		catch (IOException ex) {
			throw new IllegalStateException(ex);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException(ex);
		}
	}

	public record Response(int status, String body, HttpHeaders headers) {

		@SuppressWarnings("unchecked")
		public Map<String, Object> json() {
			return JSON.readValue(body, Map.class);
		}

		public List<String> setCookies() {
			return headers.allValues("Set-Cookie");
		}

		/** Сирий заголовок Set-Cookie для cookie з даним ім'ям (щоб перевіряти HttpOnly / Max-Age / SameSite). */
		public Optional<String> setCookie(String name) {
			return setCookies().stream().filter(h -> h.startsWith(name + "=")).reduce((first, second) -> second);
		}

	}

}
