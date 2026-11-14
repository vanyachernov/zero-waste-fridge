import { isApiError } from "@zwf/api-client";
import type { Translator } from "@zwf/i18n";

type ErrorTexts = Translator["messages"]["errors"];

/** Текст для помилки запиту: за машинним `code` бекенду, інакше — загальний. */
export function errorMessage(error: unknown, { messages }: Pick<Translator, "messages">): string {
  const texts: ErrorTexts = messages.errors;
  if (isApiError(error)) {
    const byCode = error.code ? (texts as unknown as Record<string, unknown>)[error.code] : undefined;
    if (typeof byCode === "string") return byCode;
    return texts.UNKNOWN;
  }
  // fetch кидає TypeError, коли сервер недоступний
  if (error instanceof TypeError) return texts.NETWORK;
  return texts.UNKNOWN;
}

/** Текст для коду помилки поля (`NotBlank`, `Email`, `TOO_SHORT`, `EMAIL_TAKEN`…). */
export function fieldMessage(code: string | null | undefined, { messages }: Pick<Translator, "messages">): string | undefined {
  if (!code) return undefined;
  const fields = messages.errors.fields as Record<string, string>;
  return fields[code] ?? fields.INVALID;
}

/** Помилки полів із відповіді сервера (лише для відомих полів форми). */
export function serverFieldErrors<F extends string>(error: unknown, fields: readonly F[]): Partial<Record<F, string>> {
  if (!isApiError(error)) return {};
  const result: Partial<Record<F, string>> = {};
  for (const field of fields) {
    const code = error.fieldErrors[field];
    if (code) result[field] = code;
  }
  return result;
}
