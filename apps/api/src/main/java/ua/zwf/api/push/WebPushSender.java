package ua.zwf.api.push;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Web Push через VAPID (бібліотека web-push: шифрування корисного навантаження aes128gcm). */
public class WebPushSender implements PushSender {

	private static final Logger log = LoggerFactory.getLogger(WebPushSender.class);

	private final PushService service;

	public WebPushSender(PushProperties properties) {
		if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
			Security.addProvider(new BouncyCastleProvider());
		}
		try {
			this.service = new PushService(properties.publicKey(), properties.privateKey(), properties.subject());
		}
		catch (Exception ex) {
			throw new IllegalStateException("Invalid VAPID keys in zwf.push.*", ex);
		}
	}

	@Override
	public Result send(PushSubscription subscription, String payload) {
		try {
			var notification = new Notification(subscription.getEndpoint(), subscription.getP256dh(), subscription.getAuth(),
					payload.getBytes(StandardCharsets.UTF_8));
			int status = service.send(notification).getStatusLine().getStatusCode();
			if (status == 404 || status == 410) {
				return Result.GONE;
			}
			if (status >= 200 && status < 300) {
				return Result.DELIVERED;
			}
			log.warn("Push to {} answered {}", subscription.getId(), status);
			return Result.FAILED;
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			return Result.FAILED;
		}
		catch (Exception ex) {
			log.warn("Push to {} failed: {}", subscription.getId(), ex.toString());
			return Result.FAILED;
		}
	}

}
