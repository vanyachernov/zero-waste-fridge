package ua.zwf.api.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigInteger;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import ua.zwf.api.notification.Notification;
import ua.zwf.api.notification.NotificationType;

class PushPayloadTest {

	@Test
	void payloadIsDataForTheServiceWorker() {
		var product = UUID.randomUUID();
		var n = new Notification(UUID.randomUUID(), UUID.randomUUID(), NotificationType.EXPIRY_REMINDER, product, "Йогурт",
				0, Instant.EPOCH);

		assertThat(PushService.payload(n)).contains("\"type\":\"EXPIRY_REMINDER\"")
			.contains("\"productId\":\"" + product + "\"")
			.contains("\"productName\":\"Йогурт\"")
			.contains("\"daysLeft\":0");
	}

	@Test
	void vapidKeysAreOptionalButMustBeValid() {
		assertThat(new PushProperties(null, null, null).enabled()).isFalse();
		assertThat(new PushProperties("pub", " ", null).enabled()).isFalse();
		assertThat(new PushProperties(null, null, " ").subject()).isEqualTo("mailto:no-reply@zerowastefridge.app");
		assertThatThrownBy(() -> new WebPushSender(new PushProperties("not-a-key", "nope", null)))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("VAPID");
	}

	/** Ключі у форматі `web-push generate-vapid-keys`: публічний — 65 байт (0x04‖X‖Y), приватний — 32 байти D. */
	@Test
	void acceptsRealVapidKeys() throws Exception {
		var generator = KeyPairGenerator.getInstance("EC");
		generator.initialize(new ECGenParameterSpec("secp256r1"));
		var pair = generator.generateKeyPair();
		var w = ((ECPublicKey) pair.getPublic()).getW();
		byte[] pub = new byte[65];
		pub[0] = 4;
		System.arraycopy(fixed(w.getAffineX()), 0, pub, 1, 32);
		System.arraycopy(fixed(w.getAffineY()), 0, pub, 33, 32);
		byte[] priv = fixed(((ECPrivateKey) pair.getPrivate()).getS());
		var b64 = Base64.getUrlEncoder().withoutPadding();

		var properties = new PushProperties(b64.encodeToString(pub), b64.encodeToString(priv), "mailto:test@example.test");

		assertThat(properties.enabled()).isTrue();
		assertThat(new WebPushSender(properties)).isNotNull();
	}

	private static byte[] fixed(BigInteger value) {
		byte[] raw = value.toByteArray();
		byte[] out = new byte[32];
		int copy = Math.min(raw.length, 32);
		System.arraycopy(raw, raw.length - copy, out, 32 - copy, copy);
		return Arrays.copyOf(out, 32);
	}

}
