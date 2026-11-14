package ua.zwf.api.household;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import ua.zwf.api.support.Accounts;
import ua.zwf.api.support.ApiClient;
import ua.zwf.api.support.Family;
import ua.zwf.api.support.IntegrationTest;
import ua.zwf.api.support.Products;
import ua.zwf.api.support.RecordingMailer;
import ua.zwf.api.support.TestData;

/** B-52: запрошення листом, код сім'ї та вступ. */
class InvitesIT extends IntegrationTest {

	@Autowired
	RecordingMailer mailer;

	@Autowired
	JdbcTemplate jdbc;

	static final Pattern TOKEN = Pattern.compile("/lms/join\\?invite=([A-Za-z0-9_-]+)");

	String tokenFromMail(String email) {
		var mails = mailer.sentTo(email);
		assertThat(mails).isNotEmpty();
		var matcher = TOKEN.matcher(mails.getLast().text());
		assertThat(matcher.find()).as(mails.getLast().text()).isTrue();
		return matcher.group(1);
	}

	@Test
	void inviteByEmailAndJoinWithTheLink() {
		var olena = Accounts.signUp(client(), "Олена Кравченко");
		String email = TestData.uniqueEmail();

		var created = olena.post("/api/household/invites", Map.of("email", " " + email.toUpperCase() + " "));
		assertThat(created.status()).as(created.body()).isEqualTo(201);
		assertThat(created.json()).containsEntry("email", email).containsEntry("role", "MEMBER")
			.containsEntry("invitedBy", "Олена Кравченко").containsEntry("emailSent", true);
		var mail = mailer.sentTo(email).getLast();
		assertThat(mail.subject()).contains("Сім'я Кравченко");
		assertThat(mail.text()).contains("Олена Кравченко запрошує вас");

		assertThat(olena.get("/api/household/invites").body()).contains(email);

		var maksym = Accounts.signUp(client(), "Максим Кравченко", email);
		Products.create(maksym, Products.product("Мій сир", "dairy", 5));
		var joined = maksym.post("/api/household/join", Map.of("invite", tokenFromMail(email)));

		assertThat(joined.status()).as(joined.body()).isEqualTo(200);
		assertThat(joined.json()).containsEntry("householdName", "Сім'я Кравченко").containsEntry("role", "MEMBER");
		assertThat(olena.get("/api/household").json()).containsEntry("memberCount", 2);
		// Продукти з «одиночного» холодильника переїхали в спільний
		assertThat(ProductsNames.of(olena)).containsExactly("Мій сир");
		assertThat(olena.get("/api/household/invites").body()).isEqualTo("[]");

		// Посилання одноразове
		assertThat(maksym.post("/api/household/join", Map.of("invite", tokenFromMail(email))).json())
			.containsEntry("code", "INVALID_INVITE");
	}

	@Test
	void inviteIsPersonal() {
		var olena = Accounts.signUp(client(), "Олена");
		String email = TestData.uniqueEmail();
		olena.post("/api/household/invites", Map.of("email", email, "role", "OWNER"));

		var stranger = Accounts.signUp(client(), "Хтось інший");
		var response = stranger.post("/api/household/join", Map.of("invite", tokenFromMail(email)));

		assertThat(response.status()).isEqualTo(403);
		assertThat(response.json()).containsEntry("code", "INVITE_EMAIL_MISMATCH");
	}

	@Test
	void ownerRoleInviteAndDuplicates() {
		var olena = Accounts.signUp(client(), "Олена");
		String email = TestData.uniqueEmail();
		olena.post("/api/household/invites", Map.of("email", email, "role", "OWNER"));

		var duplicate = olena.post("/api/household/invites", Map.of("email", email));
		assertThat(duplicate.status()).isEqualTo(409);
		assertThat(duplicate.json()).containsEntry("code", "INVITE_EXISTS");

		var maksym = Accounts.signUp(client(), "Максим", email);
		assertThat(maksym.post("/api/household/join", Map.of("invite", tokenFromMail(email))).json())
			.containsEntry("role", "OWNER");

		var again = olena.post("/api/household/invites", Map.of("email", email));
		assertThat(again.status()).isEqualTo(409);
		assertThat(again.json()).containsEntry("code", "ALREADY_MEMBER");
	}

	@Test
	void validationAndPermissions() {
		var olena = Accounts.signUp(client(), "Олена");
		var member = Accounts.signUp(client(), "Максим");
		Family.join(jdbc, olena, member, "MEMBER");

		assertThat(olena.post("/api/household/invites", Map.of("email", "not-an-email")).json())
			.containsEntry("errors", Map.of("email", "Email"));
		assertThat(member.post("/api/household/invites", Map.of("email", TestData.uniqueEmail())).status())
			.isEqualTo(403);
		assertThat(member.post("/api/household/invites/code", null).status()).isEqualTo(403);
		assertThat(member.get("/api/household/invites").status()).isEqualTo(200);
	}

	@Test
	void cancelInvite() {
		var olena = Accounts.signUp(client(), "Олена");
		String email = TestData.uniqueEmail();
		var id = olena.post("/api/household/invites", Map.of("email", email)).json().get("id");

		assertThat(olena.delete("/api/household/invites/" + id).status()).isEqualTo(204);
		assertThat(olena.get("/api/household/invites").body()).isEqualTo("[]");

		var maksym = Accounts.signUp(client(), "Максим", email);
		assertThat(maksym.post("/api/household/join", Map.of("invite", tokenFromMail(email))).json())
			.containsEntry("code", "INVALID_INVITE");
		assertThat(Accounts.signUp(client(), "Сусід").delete("/api/household/invites/" + id).status()).isEqualTo(404);
	}

	@Test
	void familyCodeJoinRegenerateAndExpiry() {
		var olena = Accounts.signUp(client(), "Олена Кравченко");
		assertThat(olena.get("/api/household/invites/code").json()).containsEntry("code", null);

		var first = (String) olena.post("/api/household/invites/code", null).json().get("code");
		assertThat(first).matches("ZWF-[A-Z2-9]{4}-[A-Z2-9]{2}");
		assertThat(olena.get("/api/household/invites/code").json()).containsEntry("code", first);
		var second = (String) olena.post("/api/household/invites/code", null).json().get("code");
		assertThat(second).isNotEqualTo(first);

		var maksym = Accounts.signUp(client(), "Максим");
		assertThat(maksym.post("/api/household/join", Map.of("code", first)).json()).containsEntry("code",
				"INVALID_INVITE");
		var joined = maksym.post("/api/household/join", Map.of("code", " " + second.toLowerCase().replace("-", " ")));
		assertThat(joined.status()).as(joined.body()).isEqualTo(200);
		assertThat(joined.json()).containsEntry("householdName", "Сім'я Кравченко").containsEntry("role", "MEMBER");

		assertThat(maksym.post("/api/household/join", Map.of("code", second)).json()).containsEntry("code",
				"ALREADY_MEMBER");

		jdbc.update("update household_join_code set expires_at = now() - interval '1 minute' where code = ?", second);
		var late = Accounts.signUp(client(), "Ірина");
		assertThat(late.post("/api/household/join", Map.of("code", second)).json()).containsEntry("code",
				"INVALID_INVITE");
		assertThat(olena.get("/api/household/invites/code").json()).containsEntry("code", null);
	}

	@Test
	void joinRules() {
		var olena = Accounts.signUp(client(), "Олена");
		var code = (String) olena.post("/api/household/invites/code", null).json().get("code");
		var neighbour = Accounts.signUp(client(), "Сусід");
		var neighbourMember = Accounts.signUp(client(), "Сусідка");
		Family.join(jdbc, neighbour, neighbourMember, "MEMBER");

		assertThat(neighbour.post("/api/household/join", Map.of()).json()).containsEntry("errors",
				Map.of("code", "NotBlank"));
		assertThat(neighbour.post("/api/household/join", Map.of("code", code, "invite", "x")).json())
			.containsEntry("errors", Map.of("invite", "EXCLUSIVE"));
		// Єдиний власник сім'ї з іншими учасниками не може піти
		assertThat(neighbour.post("/api/household/join", Map.of("code", code)).json()).containsEntry("code",
				"LAST_OWNER");
		// Член чужої сім'ї переходить, а та сім'я лишається з власником і даними
		Products.create(neighbourMember, Products.product("Спільне молоко", "dairy", 2));
		assertThat(neighbourMember.post("/api/household/join", Map.of("code", code)).status()).isEqualTo(200);
		assertThat(ProductsNames.of(neighbour)).containsExactly("Спільне молоко");
		assertThat(ProductsNames.of(olena)).isEmpty();
	}

	static final class ProductsNames {

		@SuppressWarnings("unchecked")
		static List<Object> of(ApiClient client) {
			var items = (List<Map<String, Object>>) client.get("/api/products").json().get("items");
			return items.stream().map(i -> i.get("name")).toList();
		}

	}

}
