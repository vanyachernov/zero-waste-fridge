package ua.zwf.api.household;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class JoinCodesTest {

	@Test
	void generatedCodesMatchFormatWithoutLookAlikes() {
		var seen = new HashSet<String>();
		for (int i = 0; i < 500; i++) {
			String code = JoinCodes.generate();
			assertThat(code).matches("ZWF-[A-Z2-9]{4}-[A-Z2-9]{2}").doesNotContain("O", "I", "L", "0", "1");
			seen.add(code);
		}
		assertThat(seen).hasSizeGreaterThan(495);
	}

	@ParameterizedTest(name = "{0} → {1}")
	@CsvSource({ "ZWF-4821-KR, ZWF-4821-KR", "zwf 4821 kr, ZWF-4821-KR", "4821kr, ZWF-4821-KR",
			"' zwf-48 21-kr ', ZWF-4821-KR" })
	void normalizesUserInput(String input, String expected) {
		assertThat(JoinCodes.normalize(input)).contains(expected);
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "ZWF-4821", "ZWF-4821-KRX", "hello world!" })
	void rejectsMalformed(String input) {
		assertThat(JoinCodes.normalize(input)).isEmpty();
		assertThat(JoinCodes.normalize(null)).isEmpty();
	}

	@Test
	void inviteLinkAndRoleLabel() {
		assertThat(InviteService.link("https://zwf.app", "t_k-1")).isEqualTo("https://zwf.app/lms/join?invite=t_k-1");
		assertThat(InviteService.roleLabel(HouseholdRole.MEMBER)).isEqualTo("Член сім'ї");
		assertThat(InviteService.roleLabel(HouseholdRole.OWNER)).isEqualTo("Власник");
	}

}
