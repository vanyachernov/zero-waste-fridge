import { notificationText } from "@lms/lib/notifications";
import { urlBase64ToUint8Array } from "@lms/lib/push";
import { createTranslator } from "@zwf/i18n";
import { describe, expect, it } from "vitest";

const i18n = createTranslator("uk");
const product = { id: "p1", name: "Йогурт" };

describe("notification texts", () => {
  it.each([
    [-2, "«Йогурт» уже прострочено"],
    [0, "«Йогурт» зіпсується сьогодні"],
    [1, "«Йогурт» зіпсується завтра"],
    [3, "«Йогурт» зіпсується через 3 дні"],
    [5, "«Йогурт» зіпсується через 5 днів"],
  ])("%i днів → %s", (daysLeft, text) => {
    expect(notificationText({ product, daysLeft }, i18n)).toBe(text);
  });

  it("decodes the VAPID key (base64url without padding)", () => {
    expect([...urlBase64ToUint8Array("AQID_-8")]).toEqual([1, 2, 3, 255, 239]);
  });
});
