package ua.zwf.api.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class ResetTokensTest {

	@Test
	void tokenIs256BitUrlSafe() {
		var token = ResetTokens.generate();
		assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+");
	}

	@Test
	void tokensAreUnique() {
		var tokens = new HashSet<String>();
		IntStream.range(0, 1000).forEach(i -> tokens.add(ResetTokens.generate()));
		assertThat(tokens).hasSize(1000);
	}

	@Test
	void hashIsDeterministicSha256Hex() {
		assertThat(ResetTokens.hash("abc"))
			.isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
		assertThat(ResetTokens.hash("abc")).isEqualTo(ResetTokens.hash("abc")).isNotEqualTo(ResetTokens.hash("abd"));
	}

}
