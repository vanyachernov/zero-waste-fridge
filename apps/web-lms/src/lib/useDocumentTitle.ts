import { useEffect } from "react";

const BRAND = "Zero Waste Fridge";

/** Заголовок вкладки браузера: «Сторінка · Zero Waste Fridge». */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${BRAND}`;
  }, [title]);
}
