package ua.zwf.api.mail;

/** Українські форми множини: 1 день, 2 дні, 5 днів, 11 днів, 21 день. */
public final class Plural {

	private Plural() {
	}

	public static String uk(long n, String one, String few, String many) {
		long abs = Math.abs(n);
		long mod100 = abs % 100;
		long mod10 = abs % 10;
		if (mod100 >= 11 && mod100 <= 14) {
			return many;
		}
		if (mod10 == 1) {
			return one;
		}
		if (mod10 >= 2 && mod10 <= 4) {
			return few;
		}
		return many;
	}

}
