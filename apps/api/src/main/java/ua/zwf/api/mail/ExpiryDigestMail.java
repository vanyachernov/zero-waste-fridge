package ua.zwf.api.mail;

import java.util.List;
import java.util.Map;

/** Лист щоденного дайджесту «3 продукти зіпсуються завтра» (шаблон B-30, розсилка — B-33). */
public final class ExpiryDigestMail {

	/** Рядок дайджесту; {@code label} — «прострочено», «сьогодні», «завтра», «через 2 дні». */
	public record Line(String name, long daysLeft, String label) {

		public static Line of(String name, long daysLeft) {
			return new Line(name, daysLeft, ExpiryDigestMail.label(daysLeft));
		}

	}

	private ExpiryDigestMail() {
	}

	public static OutgoingMail create(MailTemplates templates, String to, String name, String household,
			List<Line> products, String link) {
		String subject = "Zero Waste Fridge — " + subjectCount(products.size());
		return templates.render(to, subject, "expiry-digest",
				Map.of("name", name, "household", household, "products", products, "link", link));
	}

	static String label(long daysLeft) {
		if (daysLeft < 0) {
			return "прострочено";
		}
		if (daysLeft == 0) {
			return "сьогодні";
		}
		if (daysLeft == 1) {
			return "завтра";
		}
		return "через " + daysLeft + " " + Plural.uk(daysLeft, "день", "дні", "днів");
	}

	/** «1 продукт потребує уваги», «3 продукти…», «5 продуктів…». */
	static String subjectCount(int count) {
		return count + " " + Plural.uk(count, "продукт потребує", "продукти потребують", "продуктів потребують")
				+ " уваги";
	}

}
