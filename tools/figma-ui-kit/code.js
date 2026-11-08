/*
 * Zero Waste Fridge — генератор UI Kit для Figma.
 *
 * Що робить:
 *   1. Змінні «ZWF / Color» з режимами Light / Dark (значення = packages/ui/src/styles/*.css),
 *      «ZWF / Radius», текстові стилі «ZWF/…» та стилі тіней «ZWF/Shadow/…».
 *   2. Набори компонентів з варіантами: Button, Input, Checkbox, Chip, Badge, FreshnessBadge, StatCard, Card.
 *   3. Сторінка «🧩 UI Kit» з трьома окремими фреймами: «Кольори», «Типографіка», «Компоненти».
 *      У кожному — колонки Light | Dark поруч; у «Компонентах» ліворуч майстер-компоненти,
 *      праворуч ті самі компоненти як екземпляри в режимі Dark.
 *
 * Повторний запуск оновлює змінні/стилі та перебудовує фрейми на сторінці «🧩 UI Kit».
 * Синтаксис навмисно консервативний (без ?. / ?? / spread), щоб працювати в sandbox Figma.
 */

const PAGE_NAME = "🧩 UI Kit";
const FONT = "Inter";
const TAG_KEY = "zwf";

// ---------------------------------------------------------------------------
// Токени (джерело правди — packages/ui/src/styles/theme.css та index.css → .dark)
// [група, назва, light, dark]
// ---------------------------------------------------------------------------
const COLOR_TOKENS = [
  ["Primary", "primary", "#006948", "#5fd8a4"],
  ["Primary", "on-primary", "#ffffff", "#00382a"],
  ["Primary", "primary-hover", "#005137", "#7ff0bd"],
  ["Primary", "primary-pressed", "#002114", "#a5f5cf"],
  ["Primary", "primary-container", "#c7f0da", "#0d3a2b"],
  ["Primary", "on-primary-container", "#00513a", "#a2f2cb"],
  ["Primary", "primary-fixed-dim", "#8bd8b2", "#8bd8b2"],
  ["Brand", "brand", "#006948", "#006948"],
  ["Brand", "on-brand", "#ffffff", "#ffffff"],
  ["Secondary", "secondary-container", "#e3e7f7", "#232a3d"],
  ["Secondary", "on-secondary-container", "#3a4060", "#d3d9f0"],
  ["Status", "error", "#ba0035", "#ff8f9a"],
  ["Status", "on-error", "#ffffff", "#ffffff"],
  ["Status", "error-container", "#ffdadc", "#4a0f1b"],
  ["Status", "on-error-container", "#92002a", "#ffb3b8"],
  ["Status", "warning", "#fe932c", "#fe932c"],
  ["Status", "on-warning", "#2e1500", "#2e1500"],
  ["Status", "warning-container", "#ffe3cc", "#47290a"],
  ["Status", "on-warning-container", "#8a4600", "#ffc48f"],
  ["Status", "caution-container", "#fff0c7", "#3d3108"],
  ["Status", "on-caution-container", "#7a5200", "#f5d77a"],
  ["Surface", "background", "#f7f8fc", "#0f141a"],
  ["Surface", "surface", "#f7f8fc", "#0f141a"],
  ["Surface", "surface-container-lowest", "#ffffff", "#161c24"],
  ["Surface", "surface-container-low", "#f1f3f9", "#1b222b"],
  ["Surface", "surface-container", "#ebeef5", "#212a34"],
  ["Surface", "surface-container-high", "#e5e8f0", "#29333e"],
  ["Surface", "surface-container-highest", "#dfe3eb", "#323d49"],
  ["Text", "on-surface", "#171c1f", "#e6eaef"],
  ["Text", "on-surface-variant", "#3e4942", "#b7c2bb"],
  ["Text", "muted", "#6e7a72", "#8c9891"],
  ["Outline", "outline", "#6e7a72", "#8c9891"],
  ["Outline", "outline-variant", "#bccac0", "#3c4842"],
  ["Outline", "border", "#e3e7ee", "#263039"],
];

const RADIUS_TOKENS = [
  ["sm", 6],
  ["md", 8],
  ["lg", 12],
  ["xl", 16],
  ["pill", 9999],
];

// [назва, розмір, висота рядка, накреслення, letter-spacing %]
const TYPE_TOKENS = [
  ["Display", 40, 46, "Extra Bold", -2],
  ["Heading/H1", 30, 36, "Extra Bold", -1],
  ["Heading/H2", 20, 28, "Bold", 0],
  ["Heading/H3", 16, 24, "Bold", 0],
  ["Body/Large Strong", 16, 24, "Semi Bold", 0],
  ["Body/Strong", 14, 20, "Semi Bold", 0],
  ["Body/Regular", 14, 20, "Regular", 0],
  ["Label/Strong", 12, 16, "Semi Bold", 0],
  ["Label/Medium", 12, 16, "Medium", 0],
  ["Label/Regular", 12, 16, "Regular", 0],
  ["Caption/Strong", 11, 16, "Semi Bold", 0],
  ["Caption/Regular", 11, 16, "Regular", 0],
];

const INK = { r: 23 / 255, g: 28 / 255, b: 31 / 255 };
function shadow(type, y, blur, spread, alpha, color) {
  const c = color || INK;
  const e = {
    type: type,
    color: { r: c.r, g: c.g, b: c.b, a: alpha },
    offset: { x: 0, y: y },
    radius: blur,
    spread: spread,
    visible: true,
    blendMode: "NORMAL",
  };
  if (type === "DROP_SHADOW") e.showShadowBehindNode = false;
  return e;
}
const EFFECT_TOKENS = [
  ["Shadow/Card", [shadow("DROP_SHADOW", 1, 2, 0, 0.04), shadow("DROP_SHADOW", 1, 3, 0, 0.06)]],
  ["Shadow/Raised", [shadow("DROP_SHADOW", 4, 12, 0, 0.08)]],
  ["Shadow/Modal", [shadow("DROP_SHADOW", 24, 48, -12, 0.25)]],
  ["Shadow/Pressed (inner)", [shadow("INNER_SHADOW", 2, 4, 0, 0.2, { r: 0, g: 0, b: 0 })]],
  ["Focus ring", [shadow("DROP_SHADOW", 0, 0, 3, 0.15, { r: 0, g: 0x69 / 255, b: 0x48 / 255 })]],
];

// Іконки lucide (stroke 2, viewBox 24)
const ICONS = {
  plus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
};

// ---------------------------------------------------------------------------
// Стан, що заповнюється під час запуску
// ---------------------------------------------------------------------------
const VAR = {}; // short name → Variable (light / основна колекція)
const HEX = {}; // short name → [light, dark]
const RADIUS = {}; // name → Variable
const TEXT_STYLE = {}; // name → TextStyle
const EFFECT_STYLE = {}; // name → EffectStyle
const THEME = { native: true, collection: null, lightModeId: null, darkModeId: null, darkById: new Map() };

// ---------------------------------------------------------------------------
// Утиліти
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function paint(token, opacity) {
  const v = VAR[token];
  if (!v) throw new Error("Невідомий токен кольору: " + token);
  const base = { type: "SOLID", color: hexToRgb(HEX[token][0]), opacity: opacity === undefined ? 1 : opacity };
  return figma.variables.setBoundVariableForPaint(base, "color", v);
}

function rawPaint(white, opacity) {
  return { type: "SOLID", color: white ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 }, opacity: opacity };
}

function radius(node, name) {
  const v = RADIUS[name];
  ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].forEach(function (k) {
    node.setBoundVariable(k, v);
  });
}

function stroke(node, token, weight) {
  node.strokes = [paint(token)];
  node.strokeWeight = weight || 1;
  node.strokeAlign = "INSIDE";
}

/** Auto-layout для нового фрейму або існуючого компонента. pad: число або [вертикаль, горизонталь]. */
function stack(dir, name, gap, pad, existing) {
  const f = existing || figma.createFrame();
  f.name = name;
  if (!existing) {
    f.fills = [];
    f.clipsContent = false;
  }
  f.layoutMode = dir;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.itemSpacing = gap || 0;
  const p = Array.isArray(pad) ? pad : [pad || 0, pad || 0];
  f.paddingTop = p[0];
  f.paddingBottom = p[0];
  f.paddingLeft = p[1];
  f.paddingRight = p[1];
  return f;
}

/** Фіксована ширина, висота «hug» (для VERTICAL / HORIZONTAL). */
function fixWidth(f, w) {
  f.resize(w, Math.max(f.height, 1));
  if (f.layoutMode === "VERTICAL") {
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "FIXED";
  } else if (f.layoutMode === "HORIZONTAL") {
    f.primaryAxisSizingMode = "FIXED";
    f.counterAxisSizingMode = "AUTO";
  }
}

/** Фіксована висота, ширина «hug» (лише для HORIZONTAL). */
function fixHeight(f, h) {
  f.resize(Math.max(f.width, 1), h);
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "FIXED";
}

async function text(chars, style, color, name) {
  const t = figma.createText();
  await t.setTextStyleIdAsync(TEXT_STYLE[style].id);
  t.characters = chars;
  if (color) t.fills = [paint(color)];
  t.name = name || chars.slice(0, 40);
  return t;
}

function wrapText(t, w) {
  t.resize(w, Math.max(t.height, 1));
  t.textAutoResize = "HEIGHT";
  return t;
}

function icon(key, size, color, name) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    ICONS[key] +
    "</svg>";
  const n = figma.createNodeFromSvg(svg);
  n.name = name || "Icon";
  n.fills = [];
  n.clipsContent = false;
  n.rescale(size / 24);
  n.findAll(function (x) {
    return "strokes" in x && x.strokes.length > 0;
  }).forEach(function (x) {
    x.strokes = [paint(color)];
  });
  return n;
}

function spacer() {
  const s = figma.createFrame();
  s.name = "Spacer";
  s.fills = [];
  s.resize(1, 1);
  return s;
}

// ---------------------------------------------------------------------------
// 1. Foundations: змінні та стилі
// ---------------------------------------------------------------------------
function colorScopes(group, name) {
  if (group === "Text" || name.indexOf("on-") === 0) return ["TEXT_FILL", "SHAPE_FILL", "STROKE_COLOR"];
  if (group === "Outline") return ["STROKE_COLOR", "SHAPE_FILL", "FRAME_FILL"];
  return ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"];
}

async function upsertCollection(name) {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  for (let i = 0; i < all.length; i++) if (all[i].name === name) return all[i];
  return figma.variables.createVariableCollection(name);
}

async function upsertVariables(collection, type) {
  const all = await figma.variables.getLocalVariablesAsync(type);
  const map = new Map();
  all.forEach(function (v) {
    if (v.variableCollectionId === collection.id) map.set(v.name, v);
  });
  return function (name) {
    return map.get(name) || figma.variables.createVariable(name, collection, type);
  };
}

async function setupColors() {
  const coll = await upsertCollection("ZWF / Color");
  const lightMode = coll.modes[0];
  if (lightMode.name !== "Light") coll.renameMode(lightMode.modeId, "Light");
  let darkModeId = null;
  coll.modes.forEach(function (m) {
    if (m.name === "Dark") darkModeId = m.modeId;
  });
  if (!darkModeId) {
    try {
      darkModeId = coll.addMode("Dark");
    } catch (e) {
      // Тариф Starter: одна мода на колекцію → темна тема окремою колекцією + перепривʼязка змінних
      darkModeId = null;
    }
  }
  THEME.native = Boolean(darkModeId);
  THEME.collection = coll;
  THEME.lightModeId = lightMode.modeId;
  THEME.darkModeId = darkModeId;

  const get = await upsertVariables(coll, "COLOR");
  COLOR_TOKENS.forEach(function (t) {
    const group = t[0], name = t[1], light = t[2], dark = t[3];
    const v = get(group + "/" + name);
    v.scopes = colorScopes(group, name);
    v.description = "Tailwind: bg-" + name + " / text-" + name + " / border-" + name;
    v.setValueForMode(lightMode.modeId, hexToRgb(light));
    if (darkModeId) v.setValueForMode(darkModeId, hexToRgb(dark));
    v.setVariableCodeSyntax("WEB", "var(--color-" + name + ")");
    VAR[name] = v;
    HEX[name] = [light, dark];
  });

  if (!THEME.native) {
    const darkColl = await upsertCollection("ZWF / Color (Dark)");
    const getDark = await upsertVariables(darkColl, "COLOR");
    COLOR_TOKENS.forEach(function (t) {
      const group = t[0], name = t[1];
      const dv = getDark(group + "/" + name);
      dv.scopes = colorScopes(group, name);
      dv.setValueForMode(darkColl.modes[0].modeId, hexToRgb(t[3]));
      dv.setVariableCodeSyntax("WEB", "var(--color-" + name + ")");
      THEME.darkById.set(VAR[name].id, dv);
    });
  }
}

async function setupRadius() {
  const coll = await upsertCollection("ZWF / Radius");
  if (coll.modes[0].name !== "Value") coll.renameMode(coll.modes[0].modeId, "Value");
  const get = await upsertVariables(coll, "FLOAT");
  RADIUS_TOKENS.forEach(function (t) {
    const v = get("radius/" + t[0]);
    v.scopes = ["CORNER_RADIUS"];
    v.setValueForMode(coll.modes[0].modeId, t[1]);
    v.setVariableCodeSyntax("WEB", "var(--radius-" + t[0] + ")");
    RADIUS[t[0]] = v;
  });
}

async function setupTextStyles() {
  const existing = await figma.getLocalTextStylesAsync();
  TYPE_TOKENS.forEach(function (t) {
    const full = "ZWF/" + t[0];
    let s = null;
    for (let i = 0; i < existing.length; i++) if (existing[i].name === full) s = existing[i];
    if (!s) s = figma.createTextStyle();
    s.name = full;
    s.fontName = { family: FONT, style: t[3] };
    s.fontSize = t[1];
    s.lineHeight = { unit: "PIXELS", value: t[2] };
    s.letterSpacing = { unit: "PERCENT", value: t[4] };
    TEXT_STYLE[t[0]] = s;
  });
}

async function setupEffectStyles() {
  const existing = await figma.getLocalEffectStylesAsync();
  EFFECT_TOKENS.forEach(function (t) {
    const full = "ZWF/" + t[0];
    let s = null;
    for (let i = 0; i < existing.length; i++) if (existing[i].name === full) s = existing[i];
    if (!s) s = figma.createEffectStyle();
    s.name = full;
    s.effects = t[1];
    EFFECT_STYLE[t[0]] = s;
  });
}

async function loadFonts() {
  const styles = ["Regular", "Medium", "Semi Bold", "Bold", "Extra Bold"];
  for (let i = 0; i < styles.length; i++) {
    try {
      await figma.loadFontAsync({ family: FONT, style: styles[i] });
    } catch (e) {
      throw new Error('Не вдалося завантажити шрифт "' + FONT + " " + styles[i] + '". Перевірте, що Inter доступний у Figma.');
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Компоненти
// ---------------------------------------------------------------------------
const BTN_VARIANTS = ["Primary", "Secondary", "Outline", "Ghost", "Danger", "Warning"];
const BTN_STATES = ["Default", "Hover", "Pressed", "Disabled"];
const BTN_SIZES = {
  sm: { h: 32, px: 12, gap: 6, icon: 14, style: "Label/Strong" },
  md: { h: 40, px: 20, gap: 8, icon: 16, style: "Body/Strong" },
  lg: { h: 48, px: 24, gap: 8, icon: 18, style: "Body/Large Strong" },
};
// overlay: [білий?, прозорість] — аналог hover:brightness-* у коді
const BTN_LOOK = {
  Primary: { bg: "primary", fg: "on-primary", Hover: { bg: "primary-hover", lift: true }, Pressed: { bg: "primary-pressed", inner: true } },
  Secondary: { bg: "secondary-container", fg: "on-secondary-container", Hover: { overlay: [false, 0.05] }, Pressed: { overlay: [false, 0.1], inner: true } },
  Outline: { bg: "surface-container-lowest", fg: "on-surface", border: "border", Hover: { bg: "surface-container-low" }, Pressed: { bg: "surface-container" } },
  Ghost: { bg: null, fg: "on-surface-variant", Hover: { bg: "surface-container-low" }, Pressed: { bg: "surface-container" } },
  Danger: { bg: "error", fg: "on-error", Hover: { overlay: [true, 0.1] }, Pressed: { overlay: [false, 0.1], inner: true } },
  Warning: { bg: "warning", fg: "on-warning", Hover: { overlay: [true, 0.06] }, Pressed: { overlay: [false, 0.1], inner: true } },
};

async function makeButton(variant, state, sizeKey) {
  const look = BTN_LOOK[variant];
  const s = BTN_SIZES[sizeKey];
  const c = figma.createComponent();
  stack("HORIZONTAL", "Variant=" + variant + ", State=" + state + ", Size=" + sizeKey, s.gap, [0, s.px], c);
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  radius(c, "md");

  let bg = look.bg, fg = look.fg, overlay = null, lift = false, inner = false;
  if (state === "Disabled") {
    bg = "outline-variant";
    fg = "on-surface-variant";
    c.opacity = 0.6;
  } else if (state === "Hover" || state === "Pressed") {
    const st = look[state];
    if (st.bg) bg = st.bg;
    overlay = st.overlay || null;
    lift = Boolean(st.lift);
    inner = Boolean(st.inner);
  }
  const fills = bg ? [paint(bg)] : [];
  if (overlay) fills.push(rawPaint(overlay[0], overlay[1]));
  c.fills = fills;
  if (look.border && state !== "Disabled") stroke(c, look.border);
  if (lift) await c.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Raised"].id);
  if (inner) await c.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Pressed (inner)"].id);

  c.appendChild(icon("plus", s.icon, fg, "Icon"));
  c.appendChild(await text("Додати продукт", s.style, fg, "Label"));
  fixHeight(c, s.h);
  return c;
}

const INPUT_TYPES = ["Text", "Password", "Password visible"];
const INPUT_STATES = ["Default", "Focus", "Filled", "Error", "Disabled"];

async function makeInput(type, state) {
  const c = figma.createComponent();
  stack("VERTICAL", "Type=" + type + ", State=" + state, 6, 0, c);
  c.fills = [];
  c.appendChild(await text("Назва поля", "Label/Strong", "on-surface", "Label"));

  const box = stack("HORIZONTAL", "Field", 8, [0, 12]);
  box.counterAxisAlignItems = "CENTER";
  c.appendChild(box);
  radius(box, "md");

  const isPassword = type !== "Text";
  const empty = state === "Default" || state === "Disabled";
  let fill = paint("surface-container-lowest");
  let border = "border";
  if (state === "Focus") {
    fill = paint("surface-container-low");
    border = "primary";
    await box.setEffectStyleIdAsync(EFFECT_STYLE["Focus ring"].id);
  } else if (state === "Error") {
    fill = paint("error-container", 0.3);
    border = "error";
  } else if (state === "Disabled") {
    fill = paint("surface-container-highest");
    box.opacity = 0.7;
  }
  box.fills = [fill];
  stroke(box, border);

  let value;
  if (empty) value = isPassword ? "Введіть пароль" : "you@example.com";
  else if (type === "Text") value = "olena@example.com";
  else if (type === "Password") value = "••••••••••••";
  else value = "Secret-pass-123";
  box.appendChild(await text(value, "Body/Regular", empty ? "muted" : "on-surface", "Value"));

  if (state === "Focus") {
    const caret = figma.createRectangle();
    caret.name = "Caret";
    caret.resize(1.5, 18);
    caret.fills = [paint("primary")];
    box.appendChild(caret);
  }
  const sp = spacer();
  box.appendChild(sp);
  sp.layoutGrow = 1;
  if (isPassword) box.appendChild(icon(type === "Password" ? "eyeOff" : "eye", 16, "muted", "Toggle visibility"));

  const helper = await text(
    state === "Error" ? "Обовʼязкове поле" : "Допоміжний текст",
    state === "Error" ? "Caption/Strong" : "Caption/Regular",
    state === "Error" ? "error" : "muted",
    "Helper",
  );
  c.appendChild(helper);

  fixWidth(c, 260);
  box.resize(box.width, 40);
  box.counterAxisSizingMode = "FIXED";
  box.layoutSizingHorizontal = "FILL";
  return c;
}

async function makeCheckbox(checked, state) {
  const c = figma.createComponent();
  stack("HORIZONTAL", "Checked=" + (checked ? "true" : "false") + ", State=" + state, 0, 0, c);
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  radius(c, "sm");
  c.fills = [paint(checked ? "primary" : "surface-container-lowest")];
  stroke(c, checked || state === "Hover" ? "primary" : "outline-variant", 2);
  const ic = icon("check", 14, "on-primary", "Check");
  c.appendChild(ic);
  ic.visible = checked;
  if (state === "Disabled") c.opacity = 0.5;
  c.resize(20, 20);
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "FIXED";
  return c;
}

const CHIP_STATES = ["Default", "Hover", "Active"];

async function makeChip(state) {
  const c = figma.createComponent();
  stack("HORIZONTAL", "State=" + state, 4, [0, 14], c);
  c.counterAxisAlignItems = "CENTER";
  radius(c, "pill");
  const active = state === "Active";
  c.fills = [paint(active ? "primary" : state === "Hover" ? "surface-container-low" : "surface-container-lowest")];
  stroke(c, active ? "primary" : state === "Hover" ? "outline-variant" : "border");
  c.appendChild(await text("Молочне", "Label/Medium", active ? "on-primary" : "on-surface-variant", "Label"));
  const count = await text("(12)", "Label/Medium", active ? "on-primary" : "muted", "Count");
  if (active) count.opacity = 0.9;
  c.appendChild(count);
  fixHeight(c, 32);
  return c;
}

const BADGE_TONES = {
  Neutral: { bg: "surface-container", fg: "on-surface-variant", dot: "outline" },
  Primary: { bg: "primary-container", fg: "on-primary-container", dot: "primary" },
  Error: { bg: "error-container", fg: "on-error-container", dot: "error" },
  Warning: { bg: "warning-container", fg: "on-warning-container", dot: "warning" },
  Caution: { bg: "caution-container", fg: "on-caution-container", dot: "warning" },
  Info: { bg: "secondary-container", fg: "on-secondary-container", dot: "on-secondary-container" },
};

async function makeBadge(name, toneKey, withDot, label) {
  const tone = BADGE_TONES[toneKey];
  const c = figma.createComponent();
  stack("HORIZONTAL", name, 6, [2, 10], c);
  c.counterAxisAlignItems = "CENTER";
  radius(c, "pill");
  c.fills = [paint(tone.bg)];
  const dot = figma.createEllipse();
  dot.name = "Dot";
  dot.resize(6, 6);
  dot.fills = [paint(tone.dot)];
  c.appendChild(dot);
  dot.visible = withDot;
  c.appendChild(await text(label, "Caption/Strong", tone.fg, "Label"));
  return c;
}

const FRESHNESS = [
  ["Expired", "Error", "Прострочено"],
  ["Today", "Warning", "Сьогодні"],
  ["Soon", "Caution", "2 дні"],
  ["Fresh", "Primary", "Свіже (5 днів)"],
];

const STAT_TONES = {
  Neutral: { title: "Усього продуктів", value: "24", unit: "шт.", hint: "+3 за тиждень", valueColor: "on-surface", hintColor: "primary" },
  Warning: { title: "Скоро зіпсуються", value: "5", unit: "шт.", hint: "Використайте першими", valueColor: "on-warning-container", hintColor: "on-warning-container" },
  Error: { title: "Прострочено", value: "2", unit: "шт.", hint: "Списати зі складу", valueColor: "error", hintColor: "error" },
};

async function makeStatCard(toneKey) {
  const t = STAT_TONES[toneKey];
  const c = figma.createComponent();
  stack("VERTICAL", "Tone=" + toneKey, 12, 20, c);
  radius(c, "lg");
  c.fills = [paint("surface-container-lowest")];
  stroke(c, "border");
  await c.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Card"].id);
  c.appendChild(await text(t.title, "Label/Medium", "on-surface-variant", "Title"));
  const row = stack("HORIZONTAL", "Value", 6, 0);
  row.counterAxisAlignItems = "BASELINE";
  row.appendChild(await text(t.value, "Heading/H1", t.valueColor, "Value"));
  row.appendChild(await text(t.unit, "Body/Regular", "on-surface-variant", "Unit"));
  c.appendChild(row);
  c.appendChild(await text(t.hint, "Caption/Strong", t.hintColor, "Hint"));
  fixWidth(c, 240);
  return c;
}

async function makeCard() {
  const c = figma.createComponent();
  stack("VERTICAL", "Card", 8, 20, c);
  radius(c, "lg");
  c.fills = [paint("surface-container-lowest")];
  stroke(c, "border");
  await c.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Card"].id);
  c.appendChild(await text("Заголовок картки", "Heading/H3", "on-surface", "Title"));
  const body = await text("Базовий контейнер: фон surface-container-lowest, рамка border, радіус lg, тінь Card.", "Body/Regular", "on-surface-variant", "Body");
  c.appendChild(body);
  fixWidth(c, 320);
  wrapText(body, 280);
  return c;
}

/** Розкладає варіанти сіткою; повертає геометрію для підписів рядків і стовпців. */
function arrange(set, cells, gap) {
  const pad = 24;
  let nr = 0, nc = 0;
  cells.forEach(function (x) {
    nr = Math.max(nr, x.r + 1);
    nc = Math.max(nc, x.c + 1);
  });
  const colW = new Array(nc).fill(0), rowH = new Array(nr).fill(0);
  cells.forEach(function (x) {
    colW[x.c] = Math.max(colW[x.c], x.node.width);
    rowH[x.r] = Math.max(rowH[x.r], x.node.height);
  });
  const colX = [], rowY = [];
  let acc = pad;
  for (let i = 0; i < nc; i++) { colX.push(acc); acc += colW[i] + gap; }
  const w = acc - gap + pad;
  acc = pad;
  for (let i = 0; i < nr; i++) { rowY.push(acc); acc += rowH[i] + gap; }
  const h = acc - gap + pad;
  cells.forEach(function (x) {
    x.node.x = colX[x.c];
    x.node.y = rowY[x.r] + (rowH[x.r] - x.node.height) / 2;
  });
  set.resizeWithoutConstraints(w, h);
  return { colX: colX, colW: colW, rowY: rowY, rowH: rowH };
}

function combine(name, cells, description, page) {
  const set = figma.combineAsVariants(cells.map(function (x) { return x.node; }), page);
  set.name = name;
  set.description = description;
  set.fills = [];
  return set;
}

function bindProp(set, nodeName, field, propId, skip) {
  set.children.forEach(function (variant) {
    if (skip && skip(variant)) return;
    const n = variant.findOne(function (x) { return x.name === nodeName; });
    if (!n) return;
    const refs = Object.assign({}, n.componentPropertyReferences || {});
    refs[field] = propId;
    n.componentPropertyReferences = refs;
  });
}

async function buildComponents(page) {
  const entries = [];

  // Button
  {
    const cells = [];
    let r = 0;
    for (const v of BTN_VARIANTS) {
      for (const size of Object.keys(BTN_SIZES)) {
        for (let ci = 0; ci < BTN_STATES.length; ci++) cells.push({ node: await makeButton(v, BTN_STATES[ci], size), r: r, c: ci });
        r++;
      }
    }
    const set = combine(
      "Button",
      cells,
      "Кнопка дії. Variant × State × Size.\n" +
        "Primary: bg-primary → hover bg-primary-hover + shadow-raised (-translate-y-0.5) → pressed bg-primary-pressed + scale-95.\n" +
        "Disabled: bg-outline-variant, opacity-60, cursor-not-allowed.\n" +
        "Розміри: sm h-8 px-3 · md h-10 px-5 · lg h-12 px-6, радіус md (8px).\nКод: packages/ui/src/components/Button.tsx",
      page,
    );
    const label = set.addComponentProperty("Label", "TEXT", "Додати продукт");
    const showIcon = set.addComponentProperty("Icon", "BOOLEAN", true);
    bindProp(set, "Label", "characters", label);
    bindProp(set, "Icon", "visible", showIcon);
    const rows = [];
    BTN_VARIANTS.forEach(function (v) { Object.keys(BTN_SIZES).forEach(function (s) { rows.push(v + " · " + s); }); });
    entries.push({ title: "Button", node: set, grid: arrange(set, cells, 24), rows: rows, cols: BTN_STATES, note: set.description });
  }

  // Input
  {
    const cells = [];
    for (let ri = 0; ri < INPUT_STATES.length; ri++)
      for (let ci = 0; ci < INPUT_TYPES.length; ci++) cells.push({ node: await makeInput(INPUT_TYPES[ci], INPUT_STATES[ri]), r: ri, c: ci });
    const set = combine(
      "Input",
      cells,
      "Поле вводу з підписом і допоміжним текстом. Type × State.\n" +
        "Focus: border-primary + ring-primary/15, Error: border-error + bg-error-container/30, Disabled: bg-surface-container-highest, opacity-70.\n" +
        "Код: packages/ui/src/components/Input.tsx (Input + Field)",
      page,
    );
    const label = set.addComponentProperty("Label", "TEXT", "Назва поля");
    const helperText = set.addComponentProperty("Helper text", "TEXT", "Допоміжний текст");
    const showHelper = set.addComponentProperty("Helper", "BOOLEAN", true);
    bindProp(set, "Label", "characters", label);
    bindProp(set, "Helper", "characters", helperText, function (v) { return v.name.indexOf("State=Error") >= 0; });
    bindProp(set, "Helper", "visible", showHelper);
    entries.push({ title: "Input", node: set, grid: arrange(set, cells, 24), rows: INPUT_STATES, cols: INPUT_TYPES, note: set.description });
  }

  // Checkbox
  {
    const states = ["Default", "Hover", "Disabled"];
    const cells = [];
    for (let ri = 0; ri < 2; ri++)
      for (let ci = 0; ci < states.length; ci++) cells.push({ node: await makeCheckbox(ri === 1, states[ci]), r: ri, c: ci });
    const set = combine(
      "Checkbox",
      cells,
      "Чекбокс 20×20, радіус sm. Checked × State.\nOff: border-2 border-outline-variant · hover border-primary · On: bg-primary + іконка on-primary.\nКод: packages/ui/src/components/Checkbox.tsx",
      page,
    );
    entries.push({ title: "Checkbox", node: set, grid: arrange(set, cells, 32), rows: ["Unchecked", "Checked"], cols: states, note: set.description });
  }

  // Chip
  {
    const cells = [];
    for (let ci = 0; ci < CHIP_STATES.length; ci++) cells.push({ node: await makeChip(CHIP_STATES[ci]), r: 0, c: ci });
    const set = combine(
      "Chip",
      cells,
      "Фільтр-чіп категорії (h-8, rounded-pill). Active = обраний фільтр.\nКод: packages/ui/src/components/Chip.tsx",
      page,
    );
    const label = set.addComponentProperty("Label", "TEXT", "Молочне");
    const showCount = set.addComponentProperty("Count", "BOOLEAN", true);
    bindProp(set, "Label", "characters", label);
    bindProp(set, "Count", "visible", showCount);
    entries.push({ title: "Chip", node: set, grid: arrange(set, cells, 24), rows: [], cols: CHIP_STATES, note: set.description });
  }

  // Badge
  {
    const tones = Object.keys(BADGE_TONES);
    const cells = [];
    for (let ri = 0; ri < 2; ri++)
      for (let ci = 0; ci < tones.length; ci++)
        cells.push({ node: await makeBadge("Tone=" + tones[ci] + ", Dot=" + (ri === 1 ? "true" : "false"), tones[ci], ri === 1, tones[ci]), r: ri, c: ci });
    const set = combine(
      "Badge",
      cells,
      "Бейдж статусу (text-2xs, rounded-pill, px-2.5 py-0.5). Tone × Dot.\nКод: packages/ui/src/components/Badge.tsx",
      page,
    );
    const label = set.addComponentProperty("Label", "TEXT", "Мітка");
    bindProp(set, "Label", "characters", label);
    entries.push({ title: "Badge", node: set, grid: arrange(set, cells, 24), rows: ["Без крапки", "З крапкою"], cols: tones, note: set.description });
  }

  // FreshnessBadge
  {
    const cells = [];
    for (let ci = 0; ci < FRESHNESS.length; ci++)
      cells.push({ node: await makeBadge("Status=" + FRESHNESS[ci][0], FRESHNESS[ci][1], true, FRESHNESS[ci][2]), r: 0, c: ci });
    const set = combine(
      "FreshnessBadge",
      cells,
      "Статус свіжості продукту: Expired (< 0 днів) · Today (0) · Soon (1–2) · Fresh (3+).\nКод: packages/ui/src/components/FreshnessBadge.tsx",
      page,
    );
    entries.push({ title: "FreshnessBadge", node: set, grid: arrange(set, cells, 24), rows: [], cols: FRESHNESS.map(function (f) { return f[0]; }), note: set.description });
  }

  // StatCard
  {
    const tones = Object.keys(STAT_TONES);
    const cells = [];
    for (let ci = 0; ci < tones.length; ci++) cells.push({ node: await makeStatCard(tones[ci]), r: 0, c: ci });
    const set = combine(
      "StatCard",
      cells,
      "Картка-показник на дашборді «Мій холодильник». Tone змінює колір значення та підказки.\nКод: packages/ui/src/components/StatCard.tsx",
      page,
    );
    entries.push({ title: "StatCard", node: set, grid: arrange(set, cells, 24), rows: [], cols: tones, note: set.description });
  }

  // Card (без варіантів)
  {
    const card = await makeCard();
    card.description = "Базова картка: rounded-lg border border-border bg-surface-container-lowest shadow-card.\nКод: packages/ui/src/components/Card.tsx";
    entries.push({ title: "Card", node: card, grid: null, rows: [], cols: [], note: card.description });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 3. Документація: колонки Light / Dark
// ---------------------------------------------------------------------------
function mirror(entry) {
  const src = entry.node;
  const f = figma.createFrame();
  f.name = entry.title + " · instances";
  f.fills = [];
  f.clipsContent = false;
  f.resizeWithoutConstraints(src.width, src.height);
  const comps = src.type === "COMPONENT_SET" ? src.children : [src];
  comps.forEach(function (comp) {
    const inst = comp.createInstance();
    f.appendChild(inst);
    inst.x = src.type === "COMPONENT_SET" ? comp.x : 0;
    inst.y = src.type === "COMPONENT_SET" ? comp.y : 0;
  });
  return f;
}

async function specimen(content, entry) {
  const LW = entry.rows.length ? 132 : 0;
  const LH = entry.cols.length ? 28 : 0;
  const f = figma.createFrame();
  f.name = "Specimen";
  f.fills = [];
  f.clipsContent = false;
  f.resizeWithoutConstraints(LW + content.width, LH + content.height);
  if (entry.grid) {
    for (let i = 0; i < entry.cols.length; i++) {
      const t = await text(entry.cols[i], "Label/Strong", "muted", "Column · " + entry.cols[i]);
      f.appendChild(t);
      t.x = LW + entry.grid.colX[i];
      t.y = 0;
    }
    for (let i = 0; i < entry.rows.length; i++) {
      const t = await text(entry.rows[i], "Label/Medium", "muted", "Row · " + entry.rows[i]);
      f.appendChild(t);
      t.x = 0;
      t.y = LH + entry.grid.rowY[i] + entry.grid.rowH[i] / 2 - t.height / 2;
    }
  }
  f.appendChild(content);
  content.x = LW;
  content.y = LH;
  return f;
}

async function componentBlock(entry, theme) {
  const b = stack("VERTICAL", entry.title, 16, 0);
  b.appendChild(await text(entry.title, "Heading/H2", "on-surface", "Title"));
  b.appendChild(wrapText(await text(entry.note, "Label/Regular", "on-surface-variant", "Description"), 880));
  const content = theme === "light" ? entry.node : mirror(entry);
  b.appendChild(await specimen(content, entry));
  return b;
}

async function sectionTitle(title, subtitle) {
  const b = stack("VERTICAL", "Section title", 4, 0);
  b.appendChild(await text(title, "Heading/H1", "on-surface", "Title"));
  if (subtitle) b.appendChild(await text(subtitle, "Body/Regular", "on-surface-variant", "Subtitle"));
  return b;
}

async function colorsSection(theme) {
  const idx = theme === "light" ? 0 : 1;
  const root = stack("VERTICAL", "Colors", 40, 0);
  // Кольори
  const groups = [];
  COLOR_TOKENS.forEach(function (t) { if (groups.indexOf(t[0]) < 0) groups.push(t[0]); });
  for (const g of groups) {
    const block = stack("VERTICAL", "Color · " + g, 12, 0);
    block.appendChild(await text(g, "Heading/H3", "on-surface", "Group"));
    const wrap = stack("HORIZONTAL", "Swatches", 16, 0);
    for (const t of COLOR_TOKENS) {
      if (t[0] !== g) continue;
      const sw = stack("VERTICAL", t[1], 6, 0);
      const rect = figma.createRectangle();
      rect.name = "Color";
      rect.resize(150, 56);
      rect.fills = [paint(t[1])];
      stroke(rect, "border");
      radius(rect, "md");
      sw.appendChild(rect);
      sw.appendChild(wrapText(await text(t[1], "Label/Strong", "on-surface", "Name"), 150));
      sw.appendChild(await text(t[2 + idx].toUpperCase(), "Caption/Regular", "muted", "Hex"));
      fixWidth(sw, 150);
      wrap.appendChild(sw);
    }
    block.appendChild(wrap);
    fixWidth(wrap, 1000);
    wrap.layoutWrap = "WRAP";
    wrap.counterAxisSpacing = 20;
    root.appendChild(block);
  }

  return root;
}

async function typographySection() {
  const root = stack("VERTICAL", "Typography", 20, 0);
  // Типографіка
  for (const t of TYPE_TOKENS) {
    const row = stack("HORIZONTAL", t[0], 24, 0);
    row.counterAxisAlignItems = "CENTER";
    const meta = stack("VERTICAL", "Meta", 2, 0);
    meta.appendChild(await text(t[0], "Label/Strong", "on-surface", "Name"));
    meta.appendChild(await text(t[1] + " / " + t[2] + " · " + t[3], "Caption/Regular", "muted", "Spec"));
    fixWidth(meta, 200);
    row.appendChild(meta);
    row.appendChild(await text("Свіже молоко — 2 дні", t[0], "on-surface", "Sample"));
    root.appendChild(row);
  }

  return root;
}

async function effectsSection() {
  const root = stack("VERTICAL", "Radius & Shadow", 24, 0);
  root.appendChild(await sectionTitle("Радіуси й тіні", "Спільні для всіх компонентів"));
  // Радіуси та тіні
  const misc = stack("HORIZONTAL", "Radius & Shadow", 48, 0);
  const rad = stack("VERTICAL", "Radius", 12, 0);
  rad.appendChild(await text("Радіуси", "Heading/H3", "on-surface", "Group"));
  const radRow = stack("HORIZONTAL", "Items", 16, 0);
  for (const r of RADIUS_TOKENS) {
    const item = stack("VERTICAL", r[0], 6, 0);
    const box = figma.createRectangle();
    box.name = "Shape";
    box.resize(r[0] === "pill" ? 96 : 64, 64);
    box.fills = [paint("primary-container")];
    stroke(box, "primary");
    radius(box, r[0]);
    item.appendChild(box);
    item.appendChild(await text(r[0] + " · " + (r[0] === "pill" ? "9999" : r[1]) + "px", "Caption/Regular", "muted", "Name"));
    radRow.appendChild(item);
  }
  rad.appendChild(radRow);
  misc.appendChild(rad);

  const sh = stack("VERTICAL", "Shadows", 12, 0);
  sh.appendChild(await text("Тіні", "Heading/H3", "on-surface", "Group"));
  const shRow = stack("HORIZONTAL", "Items", 24, [0, 0]);
  for (const name of ["Shadow/Card", "Shadow/Raised", "Shadow/Modal"]) {
    const card = stack("VERTICAL", name, 0, 0);
    card.primaryAxisAlignItems = "CENTER";
    card.counterAxisAlignItems = "CENTER";
    card.fills = [paint("surface-container-lowest")];
    radius(card, "lg");
    await card.setEffectStyleIdAsync(EFFECT_STYLE[name].id);
    card.appendChild(await text(name.replace("Shadow/", ""), "Label/Strong", "on-surface", "Name"));
    card.resize(140, 88);
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    shRow.appendChild(card);
  }
  sh.appendChild(shRow);
  misc.appendChild(sh);
  root.appendChild(misc);
  return root;
}

async function componentsSection(theme, entries) {
  const root = stack("VERTICAL", "Components", 64, 0);
  root.appendChild(await effectsSection());
  for (const e of entries) root.appendChild(await componentBlock(e, theme));
  return root;
}

async function themeColumn(theme, subtitle, content) {
  const col = stack("VERTICAL", theme === "light" ? "Light" : "Dark", 48, 56);
  col.fills = [paint("background")];
  stroke(col, "border");
  col.cornerRadius = 24;

  const head = stack("VERTICAL", "Theme header", 8, 0);
  const pill = stack("HORIZONTAL", "Mode", 6, [4, 12]);
  pill.counterAxisAlignItems = "CENTER";
  pill.fills = [paint("primary-container")];
  radius(pill, "pill");
  pill.appendChild(await text(theme === "light" ? "Mode: Light" : "Mode: Dark", "Caption/Strong", "on-primary-container", "Label"));
  head.appendChild(pill);
  head.appendChild(await text(theme === "light" ? "Світла тема" : "Темна тема", "Heading/H1", "on-surface", "Title"));
  if (subtitle) head.appendChild(await text(subtitle, "Body/Regular", "on-surface-variant", "Subtitle"));
  col.appendChild(head);
  col.appendChild(content);
  return col;
}

/** Окремий фрейм-дошка: заголовок + дві колонки (Light | Dark) з однаковим вмістом. */
async function board(name, title, description, subtitles, build) {
  const b = stack("VERTICAL", name, 40, 64);
  b.setPluginData(TAG_KEY, name);
  b.fills = [paint("surface-container-high")];
  b.cornerRadius = 32;

  const header = stack("VERTICAL", "Header", 8, 0);
  header.appendChild(await text(title, "Display", "on-surface", "Title"));
  header.appendChild(wrapText(await text(description, "Body/Regular", "on-surface-variant", "Description"), 1000));
  b.appendChild(header);

  const row = stack("HORIZONTAL", "Themes", 40, 0);
  b.appendChild(row);
  const light = await themeColumn("light", subtitles[0], await build("light"));
  row.appendChild(light);
  const dark = await themeColumn("dark", subtitles[1], await build("dark"));
  row.appendChild(dark);

  if (THEME.native) applyTheme(b, "light");
  applyTheme(light, "light");
  applyTheme(dark, "dark");
  return b;
}

function rebindDark(node) {
  ["fills", "strokes"].forEach(function (key) {
    if (!(key in node)) return;
    const arr = node[key];
    if (arr === figma.mixed || !Array.isArray(arr) || arr.length === 0) return;
    let changed = false;
    const next = arr.map(function (p) {
      const id = p.type === "SOLID" && p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null;
      const dark = id ? THEME.darkById.get(id) : null;
      if (!dark) return p;
      changed = true;
      return figma.variables.setBoundVariableForPaint(p, "color", dark);
    });
    if (changed) node[key] = next;
  });
  if ("children" in node) node.children.forEach(rebindDark);
}

function applyTheme(node, theme) {
  if (THEME.native) {
    node.setExplicitVariableModeForCollection(THEME.collection, theme === "light" ? THEME.lightModeId : THEME.darkModeId);
  } else if (theme === "dark") {
    rebindDark(node);
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function preparePage() {
  let page = null;
  figma.root.children.forEach(function (p) { if (p.name === PAGE_NAME) page = p; });
  if (!page) {
    page = figma.createPage();
    page.name = PAGE_NAME;
  }
  await page.loadAsync();
  await figma.setCurrentPageAsync(page);
  page.children.slice().forEach(function (n) { if (n.getPluginData(TAG_KEY)) n.remove(); });
  return page;
}

async function main() {
  await loadFonts();
  await setupColors();
  await setupRadius();
  await setupTextStyles();
  await setupEffectStyles();

  const page = await preparePage();
  const entries = await buildComponents(page);

  const boards = [];
  boards.push(
    await board(
      "Кольори",
      "Кольори",
      "Змінні «ZWF / Color» з режимами Light / Dark. Назви збігаються з Tailwind-токенами: bg-primary, text-on-surface, border-border…",
      ["Режим Light", "Режим Dark"],
      colorsSection,
    ),
  );
  boards.push(
    await board(
      "Типографіка",
      "Типографіка",
      "Текстові стилі «ZWF/…», шрифт Inter. Розмір / висота рядка · накреслення.",
      ["Текст на світлому фоні", "Текст на темному фоні"],
      function () { return typographySection(); },
    ),
  );
  boards.push(
    await board(
      "Компоненти",
      "Компоненти",
      "Кожен компонент — один набір варіантів зі станами (Default / Hover / Pressed / Disabled тощо) і властивостями (Label, Icon, Helper…).",
      ["Майстер-компоненти. Редагуйте тут — зміни підхоплять обидві теми.", "Ті самі компоненти (екземпляри) в режимі Dark."],
      function (theme) { return componentsSection(theme, entries); },
    ),
  );

  let x = 0;
  boards.forEach(function (b) {
    page.appendChild(b);
    b.x = x;
    b.y = 0;
    x += b.width + 200;
  });
  figma.currentPage.selection = boards;
  figma.viewport.scrollAndZoomIntoView(boards);

  const variants = entries.reduce(function (n, e) { return n + (e.node.type === "COMPONENT_SET" ? e.node.children.length : 1); }, 0);
  return (
    "UI Kit готовий: 3 фрейми (кольори, типографіка, компоненти), " + entries.length + " компонентів, " + variants + " варіантів. " +
    (THEME.native ? "Темна тема — режим Dark." : "Тариф без режимів: темна тема через колекцію «ZWF / Color (Dark)».")
  );
}

main().then(
  function (msg) { figma.closePlugin(msg); },
  function (err) { figma.closePlugin("Помилка: " + (err && err.message ? err.message : String(err))); },
);
