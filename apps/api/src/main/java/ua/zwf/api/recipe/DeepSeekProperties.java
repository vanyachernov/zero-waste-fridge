package ua.zwf.api.recipe;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * B-22: генерація рецептів через DeepSeek ({@code zwf.ai.deepseek.*}). Без ключа генерація підбирає рецепт із
 * каталогу.
 *
 * @param apiKey {@code DEEPSEEK_API_KEY}
 * @param baseUrl OpenAI-сумісна адреса, за замовчуванням {@code https://api.deepseek.com}
 * @param model {@code deepseek-flash} — швидка й дешева модель (thinking вимкнено)
 * @param timeout скільки чекати відповідь
 */
@ConfigurationProperties("zwf.ai.deepseek")
public record DeepSeekProperties(String apiKey, String baseUrl, String model, Duration timeout) {

	public DeepSeekProperties {
		baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.deepseek.com" : baseUrl.replaceAll("/+$", "");
		model = model == null || model.isBlank() ? "deepseek-flash" : model;
		timeout = timeout == null ? Duration.ofSeconds(45) : timeout;
	}

	public boolean enabled() {
		return apiKey != null && !apiKey.isBlank();
	}

}
