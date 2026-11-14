import type { UserEvent } from "@testing-library/user-event";

/** Вибір у кастомному `Select` (@zwf/ui): відкрити список і клацнути пункт із потрібним `value`. */
export async function pick(user: UserEvent, combobox: HTMLElement, value: string) {
  await user.click(combobox);
  const listbox = document.getElementById(combobox.getAttribute("aria-controls") ?? "");
  const option = listbox?.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`);
  if (!option) throw new Error(`Select option "${value}" not found`);
  await user.click(option);
}
