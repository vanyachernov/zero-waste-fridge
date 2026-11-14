package ua.zwf.api.push;

import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class PushConfig {

	/** Без ключів VAPID — «тихий» відправник: повідомлення лише логуються. */
	@Bean
	PushSender pushSender(PushProperties properties) {
		if (properties.enabled()) {
			return new WebPushSender(properties);
		}
		var log = LoggerFactory.getLogger(PushSender.class);
		log.info("Web Push is disabled: set zwf.push.public-key and zwf.push.private-key to enable it");
		return (subscription, payload) -> {
			log.debug("Push (disabled) to {}: {}", subscription.getId(), payload);
			return PushSender.Result.FAILED;
		};
	}

}
