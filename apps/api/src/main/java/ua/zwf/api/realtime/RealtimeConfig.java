package ua.zwf.api.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import ua.zwf.api.notification.NotificationsCreated;

@Configuration(proxyBeanMethods = false)
class RealtimeConfig implements WebMvcConfigurer {

	private final ChangeBroadcaster broadcaster;

	private final RealtimeHub hub;

	RealtimeConfig(ChangeBroadcaster broadcaster, RealtimeHub hub) {
		this.broadcaster = broadcaster;
		this.hub = hub;
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(broadcaster).addPathPatterns("/api/**");
	}

	/** Кожні 25 с — менше за типові 30–60 с бездіяльності, після яких проксі рвуть з'єднання. */
	@Scheduled(fixedDelayString = "${zwf.realtime.heartbeat:25s}")
	void heartbeat() {
		hub.heartbeat();
	}

	/** B-31 → дзвіночок оновлюється без перезавантаження. */
	@TransactionalEventListener
	void onNotifications(NotificationsCreated event) {
		event.userIds().forEach(hub::notifications);
	}

}
