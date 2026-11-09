package ua.zwf.api.shopping;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.zwf.api.common.ValidationException;
import ua.zwf.api.product.ProductCategory;

/** B-43: {@code GET / PUT /api/shopping-list/settings}. */
@Service
public class ShoppingSettingsService {

	/** Категорії — у порядку оголошення, щоб відповідь не залежала від порядку в запиті. */
	public record SettingsResponse(boolean autoRefill, List<ProductCategory> excludedCategories) {

		static SettingsResponse of(ShoppingSettings settings) {
			return new SettingsResponse(settings.isAutoRefill(), List.copyOf(settings.excluded()));
		}

	}

	public record SettingsRequest(Boolean autoRefill, List<ProductCategory> excludedCategories) {
	}

	private final ShoppingSettingsRepository settings;

	private final Clock clock;

	public ShoppingSettingsService(ShoppingSettingsRepository settings, Clock clock) {
		this.settings = settings;
		this.clock = clock;
	}

	/** Без збереженого рядка — значення за замовчуванням (нічого не пишемо в БД на GET). */
	@Transactional(readOnly = true)
	public ShoppingSettings of(UUID householdId) {
		return settings.findById(householdId).orElseGet(() -> new ShoppingSettings(householdId));
	}

	@Transactional(readOnly = true)
	public SettingsResponse get(UUID householdId) {
		return SettingsResponse.of(of(householdId));
	}

	@Transactional
	public SettingsResponse put(UUID householdId, SettingsRequest request) {
		if (request == null || request.autoRefill() == null) {
			throw new ValidationException(Map.of("autoRefill", "NotNull"));
		}
		if (request.excludedCategories() != null && request.excludedCategories().contains(null)) {
			throw new ValidationException(Map.of("excludedCategories", "INVALID"));
		}
		var excluded = request.excludedCategories() == null || request.excludedCategories().isEmpty()
				? EnumSet.noneOf(ProductCategory.class) : EnumSet.copyOf(request.excludedCategories());
		var current = of(householdId);
		current.update(request.autoRefill(), excluded, clock.instant());
		return SettingsResponse.of(settings.save(current));
	}

}
