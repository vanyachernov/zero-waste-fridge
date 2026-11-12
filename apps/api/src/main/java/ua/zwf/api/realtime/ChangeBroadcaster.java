package ua.zwf.api.realtime;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Set;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import ua.zwf.api.auth.AppUserPrincipal;
import ua.zwf.api.household.MembershipRepository;

/**
 * Після кожного успішного запиту, що змінює дані сім'ї, повідомляє всіх її учасників: одна точка замість
 * виклику з кожного сервісу. Транзакції сервісів на цей момент уже закомічені, тож перечитаний клієнтом
 * стан — актуальний. Теми з урахуванням побічних ефектів: списання додає в список покупок, «перенести в
 * холодильник» створює продукти.
 */
@Component
class ChangeBroadcaster implements HandlerInterceptor {

	private static final Set<String> UNSAFE = Set.of("POST", "PUT", "PATCH", "DELETE");

	private final RealtimeHub hub;

	private final MembershipRepository memberships;

	ChangeBroadcaster(RealtimeHub hub, MembershipRepository memberships) {
		this.hub = hub;
		this.memberships = memberships;
	}

	static List<String> topics(String path) {
		if (path.startsWith("/api/products")) {
			return path.endsWith("/write-off") ? List.of("products", "shopping-list") : List.of("products");
		}
		if (path.startsWith("/api/shopping-list")) {
			return path.endsWith("/move-to-fridge") ? List.of("shopping-list", "products") : List.of("shopping-list");
		}
		// B-23: «Приготувати і списати» змінює холодильник
		if (path.startsWith("/api/recipes/") && path.endsWith("/cook")) {
			return List.of("products");
		}
		if (path.startsWith("/api/household") && !path.startsWith("/api/household/presence")) {
			return List.of("household");
		}
		return List.of();
	}

	@Override
	public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
		if (ex != null || !UNSAFE.contains(request.getMethod()) || response.getStatus() >= 300) {
			return;
		}
		var topics = topics(request.getRequestURI());
		if (topics.isEmpty()) {
			return;
		}
		var auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal user)) {
			return;
		}
		// Після вступу / виходу / видалення — уже нове домогосподарство користувача
		memberships.findHouseholdIdByUserId(user.id())
			.ifPresent(household -> topics.forEach(topic -> hub.changed(household, topic, user.id(), user.name())));
	}

}
