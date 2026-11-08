package ua.zwf.api.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class ZwfPropertiesTest {

	@Test
	void sensibleDefaults() {
		var props = new ZwfProperties(null, null, null);

		assertThat(props.publicUrl()).isEqualTo("http://localhost:8080");
		assertThat(props.mail().from()).contains("no-reply@");
		assertThat(props.mail().logContent()).isFalse();
		assertThat(props.auth().passwordResetTtl()).isEqualTo(Duration.ofHours(1));
		assertThat(props.auth().passwordResetCooldown()).isEqualTo(Duration.ofMinutes(1));
	}

	@Test
	void stripsTrailingSlashFromPublicUrl() {
		assertThat(new ZwfProperties("https://zwf.app/", null, null).publicUrl()).isEqualTo("https://zwf.app");
	}

}
