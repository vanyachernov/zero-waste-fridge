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
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  sparkles: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
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

const ICON_COMP = {}; // key → компонент-варіант набору «Icon»

/** Компонент іконки 24×24 з векторів lucide; штрихи привʼязані до змінної on-surface. */
function makeIconComponent(key) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    ICONS[key] +
    "</svg>";
  const src = figma.createNodeFromSvg(svg);
  const c = figma.createComponent();
  c.name = "Name=" + key;
  c.resize(24, 24);
  c.fills = [];
  c.clipsContent = false;
  src.children.slice().forEach(function (ch) {
    c.appendChild(ch);
    if ("constraints" in ch) ch.constraints = { horizontal: "SCALE", vertical: "SCALE" };
  });
  src.remove();
  recolor(c, "on-surface");
  return c;
}

function recolor(node, color) {
  node.findAll(function (x) {
    return "strokes" in x && x.strokes.length > 0;
  }).forEach(function (x) {
    x.strokes = [paint(color)];
  });
}

/** Екземпляр іконки потрібного розміру й кольору. */
function icon(key, size, color, name) {
  const inst = ICON_COMP[key].createInstance();
  inst.name = name || "Icon";
  inst.rescale(size / 24);
  recolor(inst, color);
  return inst;
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
  Neutral: { title: "Усього продуктів", value: "24", unit: "шт.", hint: "+3 за тиждень", valueColor: "on-surface", hintColor: "primary", icon: "package" },
  Warning: { title: "Скоро зіпсуються", value: "5", unit: "шт.", hint: "Використайте першими", valueColor: "on-warning-container", hintColor: "on-warning-container", icon: "clock" },
  Error: { title: "Прострочено", value: "2", unit: "шт.", hint: "Списати зі складу", valueColor: "error", hintColor: "error", icon: "trash" },
};

async function makeStatCard(toneKey) {
  const t = STAT_TONES[toneKey];
  const c = figma.createComponent();
  stack("VERTICAL", "Tone=" + toneKey, 12, 20, c);
  radius(c, "lg");
  c.fills = [paint("surface-container-lowest")];
  stroke(c, "border");
  await c.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Card"].id);
  const head = stack("HORIZONTAL", "Header", 8, 0);
  head.counterAxisAlignItems = "CENTER";
  c.appendChild(head);
  const title = await text(t.title, "Label/Medium", "on-surface-variant", "Title");
  head.appendChild(title);
  title.layoutGrow = 1;
  const box = stack("HORIZONTAL", "Icon box", 0, 0);
  box.primaryAxisAlignItems = "CENTER";
  box.counterAxisAlignItems = "CENTER";
  radius(box, "md");
  stroke(box, "border");
  box.appendChild(icon(t.icon, 16, "on-surface-variant", "Icon"));
  box.resize(32, 32);
  box.primaryAxisSizingMode = "FIXED";
  box.counterAxisSizingMode = "FIXED";
  head.appendChild(box);
  const row = stack("HORIZONTAL", "Value", 6, 0);
  row.counterAxisAlignItems = "BASELINE";
  row.appendChild(await text(t.value, "Heading/H1", t.valueColor, "Value"));
  row.appendChild(await text(t.unit, "Body/Regular", "on-surface-variant", "Unit"));
  c.appendChild(row);
  c.appendChild(await text(t.hint, "Caption/Strong", t.hintColor, "Hint"));
  fixWidth(c, 240);
  head.layoutSizingHorizontal = "FILL";
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

  // Icon (lucide) — один набір, Name = ключ іконки
  {
    const keys = Object.keys(ICONS);
    const perRow = 12;
    const cells = keys.map(function (k, i) {
      const node = makeIconComponent(k);
      ICON_COMP[k] = node;
      return { node: node, r: Math.floor(i / perRow), c: i % perRow };
    });
    const set = combine(
      "Icon",
      cells,
      "Іконки lucide 24×24, stroke 2. Колір — змінна on-surface (у кнопках/картках перевизначається). Розмір: 14/16/18/24.",
      page,
    );
    entries.push({ title: "Icon", node: set, grid: arrange(set, cells, 20), rows: [], cols: [], note: set.description + "\nНабір: " + keys.join(", ") });
  }

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
    const glyph = set.addComponentProperty("Icon glyph", "INSTANCE_SWAP", ICON_COMP.plus.id);
    bindProp(set, "Label", "characters", label);
    bindProp(set, "Icon", "visible", showIcon);
    bindProp(set, "Icon", "mainComponent", glyph);
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
// 4. Мокапи екранів (за сірими вайрфреймами сторінки «Мокап»)
// ---------------------------------------------------------------------------
const MOCKUP_PAGE = "Мокап";
const SCREEN_W = 1280;
const SETS = {}; // назва набору → COMPONENT_SET

function variantOf(setName, props) {
  const set = SETS[setName];
  const keys = Object.keys(props);
  for (let i = 0; i < set.children.length; i++) {
    const c = set.children[i];
    const parsed = {};
    c.name.split(",").forEach(function (pair) {
      const kv = pair.split("=");
      parsed[kv[0].trim()] = (kv[1] || "").trim();
    });
    if (keys.every(function (k) { return parsed[k] === String(props[k]); })) return c;
  }
  throw new Error("Не знайдено варіант " + setName + " " + JSON.stringify(props));
}

function propKey(setName, name) {
  const defs = SETS[setName].componentPropertyDefinitions;
  const keys = Object.keys(defs);
  for (let i = 0; i < keys.length; i++) if (keys[i].split("#")[0] === name) return keys[i];
  throw new Error("Немає властивості " + name + " у " + setName);
}

function setText(node, layerName, value) {
  const t = node.findOne(function (x) { return x.type === "TEXT" && x.name === layerName; });
  if (t) t.characters = value;
  return t;
}

function add(parent, child, opts) {
  parent.appendChild(child);
  const o = opts || {};
  if (o.fill) child.layoutSizingHorizontal = "FILL";
  if (o.grow) child.layoutGrow = 1;
  return child;
}

function hbox(name, gap, pad) {
  const f = stack("HORIZONTAL", name, gap, pad);
  f.counterAxisAlignItems = "CENTER";
  return f;
}

function vbox(name, gap, pad) {
  return stack("VERTICAL", name, gap, pad);
}

function surface(node, bg, border, rad) {
  node.fills = bg ? [paint(bg)] : [];
  if (border) stroke(node, border);
  if (rad) radius(node, rad);
  return node;
}

function bottomBorder(node, token) {
  node.strokes = [paint(token || "border")];
  node.strokeAlign = "INSIDE";
  node.strokeTopWeight = 0;
  node.strokeLeftWeight = 0;
  node.strokeRightWeight = 0;
  node.strokeBottomWeight = 1;
}

function square(node, size) {
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.resize(size, size);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  return node;
}

async function t(chars, style, color, name) {
  return text(chars, style, color, name);
}

/** Текст, що займає всю ширину батька й переноситься. */
async function para(parent, chars, style, color) {
  const n = await text(chars, style, color, chars.slice(0, 30));
  parent.appendChild(n);
  n.layoutSizingHorizontal = "FILL";
  n.textAutoResize = "HEIGHT";
  return n;
}

function iconBox(key, size, box, bg, fg, rad) {
  const b = hbox("Icon box", 0, 0);
  surface(b, bg, null, rad || "md");
  b.appendChild(icon(key, size, fg));
  return square(b, box);
}

// ---------- Екземпляри компонентів ----------
function btn(label, variant, size, iconKey) {
  const v = variant || "Primary";
  const inst = variantOf("Button", { Variant: v, State: "Default", Size: size || "md" }).createInstance();
  const props = {};
  props[propKey("Button", "Label")] = label;
  props[propKey("Button", "Icon")] = Boolean(iconKey);
  if (iconKey && iconKey !== "plus") props[propKey("Button", "Icon glyph")] = ICON_COMP[iconKey].id;
  inst.setProperties(props);
  if (iconKey) {
    const ic = inst.findOne(function (x) { return x.type === "INSTANCE"; });
    if (ic) recolor(ic, BTN_LOOK[v].fg);
  }
  inst.name = "Button · " + label;
  return inst;
}

function chip(label, count, active) {
  const inst = variantOf("Chip", { State: active ? "Active" : "Default" }).createInstance();
  setText(inst, "Label", label);
  setText(inst, "Count", "(" + count + ")");
  return inst;
}

function freshness(days, label) {
  const status = days < 0 ? "Expired" : days === 0 ? "Today" : days <= 2 ? "Soon" : "Fresh";
  const inst = variantOf("FreshnessBadge", { Status: status }).createInstance();
  setText(inst, "Label", label);
  return inst;
}

function badge(label, tone, dot) {
  const inst = variantOf("Badge", { Tone: tone, Dot: dot ? "true" : "false" }).createInstance();
  setText(inst, "Label", label);
  return inst;
}

function checkbox(checked) {
  return variantOf("Checkbox", { Checked: checked ? "true" : "false", State: "Default" }).createInstance();
}

function statCard(tone, title, value, unit, hint, iconKey) {
  const inst = variantOf("StatCard", { Tone: tone }).createInstance();
  setText(inst, "Title", title);
  setText(inst, "Value", value);
  setText(inst, "Unit", unit);
  setText(inst, "Hint", hint);
  const ic = inst.findOne(function (x) { return x.type === "INSTANCE" && x.name === "Icon"; });
  if (ic && iconKey) {
    ic.swapComponent(ICON_COMP[iconKey]);
    recolor(ic, "on-surface-variant");
  }
  return inst;
}

// ---------- Спільні частини екрана ----------
const NAV = ["Мій холодильник", "Рецепти із залишків", "Статистика & Екологія", "Список покупок"];

async function appHeader(active) {
  const h = hbox("Header", 24, [0, 32]);
  h.fills = [paint("surface-container-lowest")];
  bottomBorder(h);

  const logo = hbox("Logo", 10, 0);
  logo.appendChild(iconBox("leaf", 18, 32, "primary", "on-primary"));
  logo.appendChild(await t("Zero Waste Fridge", "Heading/H3", "on-surface", "Name"));
  h.appendChild(logo);

  const nav = hbox("Nav", 4, 0);
  for (const item of NAV) {
    const on = item === active;
    const tab = hbox(item, 0, [8, 14]);
    radius(tab, "md");
    tab.fills = on ? [paint("primary-container")] : [];
    tab.appendChild(await t(item, on ? "Body/Strong" : "Body/Regular", on ? "on-primary-container" : "on-surface-variant", "Label"));
    nav.appendChild(tab);
  }
  h.appendChild(nav);
  add(h, spacer(), { grow: true });

  const bell = iconBox("bell", 18, 36, "surface-container-lowest", "on-surface-variant");
  stroke(bell, "border");
  const dot = figma.createEllipse();
  dot.name = "Unread";
  dot.resize(8, 8);
  dot.fills = [paint("error")];
  bell.appendChild(dot);
  dot.layoutPositioning = "ABSOLUTE";
  dot.x = 24;
  dot.y = 6;
  h.appendChild(bell);

  const user = vbox("User", 0, 0);
  user.counterAxisAlignItems = "MAX";
  user.appendChild(await t("Олена Кравченко", "Label/Strong", "on-surface", "Name"));
  user.appendChild(await t("Zero-Waste Герой ★", "Caption/Regular", "muted", "Role"));
  h.appendChild(user);

  const avatar = hbox("Avatar", 0, 0);
  surface(avatar, "primary-container", null, "pill");
  avatar.appendChild(await t("ОК", "Label/Strong", "on-primary-container", "Initials"));
  h.appendChild(square(avatar, 36));
  return h;
}

async function appFooter() {
  const f = hbox("Footer", 16, [16, 32]);
  f.fills = [paint("surface-container-lowest")];
  f.strokes = [paint("border")];
  f.strokeAlign = "INSIDE";
  f.strokeTopWeight = 1;
  f.strokeBottomWeight = 0;
  f.strokeLeftWeight = 0;
  f.strokeRightWeight = 0;
  const dot = figma.createEllipse();
  dot.name = "Status dot";
  dot.resize(8, 8);
  dot.fills = [paint("primary")];
  f.appendChild(dot);
  f.appendChild(await t("Zero Waste Fridge © 2026. Збережи їжу — врятуй ресурси планети.", "Caption/Regular", "muted", "Copyright"));
  add(f, spacer(), { grow: true });
  f.appendChild(await t("Статус свіжості: В нормі", "Caption/Regular", "muted", "Status"));
  f.appendChild(await t("•", "Caption/Regular", "muted", "Sep"));
  f.appendChild(await t("Скан-модуль активний", "Caption/Regular", "muted", "Scanner"));
  return f;
}

async function breadcrumb(items) {
  const b = hbox("Breadcrumb", 6, 0);
  for (let i = 0; i < items.length; i++) {
    b.appendChild(await t(items[i], "Caption/Regular", i === items.length - 1 ? "on-surface-variant" : "muted", items[i]));
    if (i < items.length - 1) b.appendChild(icon("chevronRight", 12, "muted", "Sep"));
  }
  return b;
}

async function pageTitle(parent, eyebrowNode, title, subtitle, actions) {
  const row = add(parent, hbox("Title row", 24, 0), { fill: true });
  row.counterAxisAlignItems = "MAX";
  const left = add(row, vbox("Title", 6, 0), { grow: true });
  if (eyebrowNode) left.appendChild(eyebrowNode);
  left.appendChild(await t(title, "Heading/H1", "on-surface", "Title"));
  await para(left, subtitle, "Body/Regular", "on-surface-variant");
  if (actions && actions.length) {
    const a = hbox("Actions", 12, 0);
    actions.forEach(function (n) { a.appendChild(n); });
    row.appendChild(a);
  }
  return row;
}

/** Сегментований перемикач (Таблиця / Картки тощо). */
async function segmented(items, activeIndex) {
  const s = hbox("Segmented", 2, 3);
  surface(s, "surface-container", "border", "md");
  for (let i = 0; i < items.length; i++) {
    const on = i === activeIndex;
    const it = hbox(items[i][0], 6, [5, 10]);
    radius(it, "sm");
    it.fills = on ? [paint("surface-container-lowest")] : [];
    if (on) await it.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Card"].id);
    if (items[i][1]) it.appendChild(icon(items[i][1], 14, on ? "on-surface" : "muted"));
    it.appendChild(await t(items[i][0], "Label/Medium", on ? "on-surface" : "on-surface-variant", "Label"));
    s.appendChild(it);
  }
  return s;
}

/** Поле-«фейк» (пошук, випадний список) з іконками. */
async function field(placeholder, leadIcon, trailing, grow) {
  const f = hbox("Field · " + placeholder.slice(0, 20), 8, [0, 12]);
  surface(f, "surface-container-lowest", "border", "md");
  if (leadIcon) f.appendChild(icon(leadIcon, 16, "muted"));
  const ph = await t(placeholder, "Body/Regular", leadIcon === "search" || leadIcon === "plus" ? "muted" : "on-surface", "Value");
  f.appendChild(ph);
  if (grow) add(f, spacer(), { grow: true });
  if (trailing === "kbd") {
    const k = hbox("Kbd", 0, [1, 6]);
    surface(k, "surface-container", "border", "sm");
    k.appendChild(await t("⌘K", "Caption/Strong", "muted", "Keys"));
    f.appendChild(k);
  } else if (trailing) {
    f.appendChild(icon(trailing, 16, "muted"));
  }
  f.resize(Math.max(f.width, 1), 40);
  f.counterAxisSizingMode = "FIXED";
  return f;
}

function iconButton(key) {
  const b = iconBox(key, 18, 32, null, "muted");
  b.name = "Icon button · " + key;
  return b;
}

async function screenShell(name, active) {
  const s = vbox(name, 0, 0);
  s.fills = [paint("background")];
  s.clipsContent = true;
  fixWidth(s, SCREEN_W);
  add(s, await appHeader(active), { fill: true });
  const header = s.children[0];
  header.resize(SCREEN_W, 64);
  header.counterAxisSizingMode = "FIXED";
  header.layoutSizingHorizontal = "FILL";
  const main = add(s, vbox("Content", 28, [28, 32]), { fill: true });
  return { screen: s, main: main };
}

async function finishShell(shell) {
  add(shell.screen, await appFooter(), { fill: true });
  return shell.screen;
}

// ---------- Дані ----------
const FRIDGE_ROWS = [
  ["Фарш яловичий свіжий", "Фермерське м'ясо, охолоджене", "500 г", "07.11.2026", -1, "Прострочено (1 дн.)"],
  ["Шпинат Baby свіжий", "Органічна зелень, митий", "150 г", "08.11.2026", 0, "Сьогодні"],
  ["Грецький йогурт 5%", "ТМ Галичина, банка", "350 г", "09.11.2026", 1, "Завтра"],
  ["Філе куряче охолоджене", "Еко-пакування", "650 г", "10.11.2026", 2, "2 дні"],
  ["Кабачки / Цукіні", "Місцевий фермер", "2 шт", "11.11.2026", 3, "Свіже (3 дні)"],
  ["Полуниця солодка", "Лоток, локальний збір", "300 г", "12.11.2026", 4, "Свіже (4 дні)"],
  ["Яйця фермерські С0", "10 шт в упаковці", "6 шт", "12.11.2026", 4, "Свіже (4 дні)"],
];

const RECIPES = [
  ["Зелений вітамінний смузі зі шпинатом та йогуртом", "10 хв", "Легко", "180 ккал", "95%", ["Шпинат", "Йогурт", "Полуниця"]],
  ["Запечене куряче філе з овочами та сирною скоринкою", "40 хв", "Середньо", "520 ккал", "88%", ["Куряче філе", "Кабачки", "Гауда"]],
  ["Паста з фаршем, кабачком і песто", "25 хв", "Легко", "610 ккал", "82%", ["Фарш", "Кабачки", "Песто"]],
];

// ---------- Екран 1: Мій холодильник ----------
async function fridgeScreen() {
  const sh = await screenShell("Мій холодильник", "Мій холодильник");
  const main = sh.main;

  // Порада дня
  const tip = add(main, hbox("Порада дня", 16, [14, 16]), { fill: true });
  surface(tip, "secondary-container", null, "lg");
  tip.appendChild(iconBox("bulb", 20, 40, "warning-container", "on-warning-container"));
  const tipText = add(tip, vbox("Text", 2, 0), { grow: true });
  tipText.appendChild(await t("Розумна порада дня", "Body/Strong", "on-secondary-container", "Title"));
  await para(tipText, "Шпинат і грецький йогурт зіпсуються за 24 години — з них вийде вітамінний смузі на 2 порції.", "Label/Regular", "on-secondary-container");
  tip.appendChild(btn("Підібрати рецепт", "Outline", "sm", "sparkles"));
  tip.appendChild(iconButton("close"));

  // Заголовок
  const crumbs = await breadcrumb(["Сховище", "Холодильне відділення #1"]);
  await pageTitle(main, crumbs, "Мій холодильник", "Слідкуйте за свіжістю продуктів, запобігайте псуванню та зберігайте сімейний бюджет.", [
    btn("Сканувати чек", "Outline", "md", "scan"),
    btn("Додати продукт", "Primary", "md", "plus"),
  ]);

  // Показники
  const stats = add(main, hbox("Stats", 16, 0), { fill: true });
  stats.counterAxisAlignItems = "MIN";
  [
    statCard("Neutral", "ВСЬОГО В ХОЛОДИЛЬНИКУ", "28", "од.", "+3 за цей тиждень", "package"),
    statCard("Warning", "СКОРО ЗІПСУЮТЬСЯ", "4", "продукти", "Термін: ≤ 48 годин", "clock"),
    statCard("Error", "ПРОСТРОЧЕНІ", "2", "продукти", "Потребують компосту або утилізації", "trash"),
  ].forEach(function (c) { add(stats, c, { grow: true }); });

  // Панель інструментів
  const tools = add(main, hbox("Toolbar", 12, 0), { fill: true });
  add(tools, await field("Пошук продуктів (наприклад: йогурт, шпинат, фарш...)", "search", "kbd", true), { grow: true });
  tools.appendChild(await segmented([["Таблиця", "list"], ["Картки", "grid"]], 0));
  tools.appendChild(await field("Сортування: Термін (спочатку критичні)", null, "chevronDown", false));

  const chips = add(main, hbox("Categories", 8, 0), { fill: true });
  chips.layoutWrap = "WRAP";
  chips.counterAxisSpacing = 8;
  [["Всі продукти", 28, true], ["Овочі & Зелень", 8], ["Молочні продукти", 6], ["М'ясо & Риба", 4], ["Фрукти & Ягоди", 5], ["Соуси & Готове", 5]].forEach(function (c) {
    chips.appendChild(chip(c[0], c[1], c[2]));
  });

  // Таблиця
  const table = add(main, vbox("Table", 0, 0), { fill: true });
  surface(table, "surface-container-lowest", "border", "lg");
  table.clipsContent = true;
  await table.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Card"].id);
  const COLS = [["ПРОДУКТ", 420], ["КІЛЬКІСТЬ", 140], ["ТЕРМІН ПРИДАТНОСТІ", 190], ["СТАТУС СВІЖОСТІ", 220]];
  const head = add(table, hbox("Head", 0, [12, 20]), { fill: true });
  head.fills = [paint("surface-container-low")];
  bottomBorder(head);
  for (const c of COLS) {
    const cell = hbox(c[0], 0, 0);
    cell.appendChild(await t(c[0], "Caption/Strong", "muted", "Label"));
    head.appendChild(cell);
    fixWidth(cell, c[1]);
  }
  const actionsHead = add(head, hbox("ДІЇ", 0, 0), { grow: true });
  actionsHead.primaryAxisAlignItems = "MAX";
  actionsHead.appendChild(await t("ДІЇ", "Caption/Strong", "muted", "Label"));

  for (let i = 0; i < FRIDGE_ROWS.length; i++) {
    const r = FRIDGE_ROWS[i];
    const row = add(table, hbox("Row · " + r[0], 0, [12, 20]), { fill: true });
    if (i < FRIDGE_ROWS.length - 1) bottomBorder(row);
    const prod = hbox("Product", 12, 0);
    prod.appendChild(iconBox("package", 18, 36, "surface-container", "on-surface-variant"));
    const names = vbox("Names", 2, 0);
    names.appendChild(await t(r[0], "Body/Strong", "on-surface", "Name"));
    names.appendChild(await t(r[1], "Caption/Regular", "muted", "Brand"));
    prod.appendChild(names);
    row.appendChild(prod);
    fixWidth(prod, COLS[0][1]);
    const qty = hbox("Qty", 0, 0);
    qty.appendChild(await t(r[2], "Body/Regular", "on-surface", "Qty"));
    row.appendChild(qty);
    fixWidth(qty, COLS[1][1]);
    const date = vbox("Date", 2, 0);
    date.appendChild(await t(r[3], "Body/Regular", "on-surface", "Date"));
    date.appendChild(await t(r[4] < 0 ? "вчора" : r[4] === 0 ? "сьогодні" : "через " + r[4] + " дн.", "Caption/Regular", r[4] <= 0 ? "error" : "muted", "Relative"));
    row.appendChild(date);
    fixWidth(date, COLS[2][1]);
    const st = hbox("Status", 0, 0);
    st.appendChild(freshness(r[4], r[5]));
    row.appendChild(st);
    fixWidth(st, COLS[3][1]);
    const act = add(row, hbox("Actions", 0, 0), { grow: true });
    act.primaryAxisAlignItems = "MAX";
    act.appendChild(iconButton("more"));
  }

  const pager = add(table, hbox("Pagination", 8, [12, 20]), { fill: true });
  pager.strokes = [paint("border")];
  pager.strokeAlign = "INSIDE";
  pager.strokeTopWeight = 1;
  pager.strokeBottomWeight = 0;
  pager.strokeLeftWeight = 0;
  pager.strokeRightWeight = 0;
  pager.appendChild(await t("Показано 7 із 28 продуктів у холодильнику", "Label/Regular", "on-surface-variant", "Summary"));
  add(pager, spacer(), { grow: true });
  pager.appendChild(btn("Попередня", "Outline", "sm"));
  pager.appendChild(btn("1", "Primary", "sm"));
  pager.appendChild(btn("2", "Outline", "sm"));
  pager.appendChild(btn("3", "Outline", "sm"));
  pager.appendChild(btn("Наступна", "Outline", "sm"));

  // Що приготувати
  const quick = add(main, vbox("Quick recipes", 12, 0), { fill: true });
  const qh = add(quick, hbox("Heading", 8, 0), { fill: true });
  qh.appendChild(await t("Що приготувати з продуктів, які скоро зіпсуються", "Heading/H2", "on-surface", "Title"));
  qh.appendChild(badge("AI-підбір", "Primary", true));
  const qrow = add(quick, hbox("Cards", 16, 0), { fill: true });
  for (const r of RECIPES) {
    const c = add(qrow, hbox("Card · " + r[0].slice(0, 20), 12, 16), { grow: true });
    surface(c, "surface-container-lowest", "border", "lg");
    c.counterAxisAlignItems = "MIN";
    c.appendChild(iconBox("sparkles", 18, 40, "primary-container", "on-primary-container"));
    const tx = add(c, vbox("Text", 4, 0), { grow: true });
    await para(tx, r[0], "Body/Strong", "on-surface");
    tx.appendChild(await t(r[1] + " · використовує " + r[5].length + " продукти", "Caption/Regular", "muted", "Meta"));
  }
  return finishShell(sh);
}

// ---------- Екран 2: Розумні рецепти ----------
async function recipeCard(r, idx) {
  const c = vbox("Recipe · " + r[0].slice(0, 24), 0, 0);
  surface(c, "surface-container-lowest", "border", "lg");
  c.clipsContent = true;
  await c.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Card"].id);

  const img = add(c, vbox("Image", 0, 12), { fill: true });
  img.fills = [paint(idx === 0 ? "primary-container" : idx === 1 ? "warning-container" : "caution-container")];
  const top = add(img, hbox("Badges", 8, 0), { fill: true });
  top.appendChild(badge(r[4] + " збіг", "Primary", true));
  add(top, spacer(), { grow: true });
  top.appendChild(badge(r[1], "Neutral", false));
  const pic = add(img, hbox("Picture", 0, 0), { fill: true });
  pic.primaryAxisAlignItems = "CENTER";
  pic.paddingTop = 36;
  pic.paddingBottom = 36;
  pic.appendChild(icon("image", 32, "on-surface-variant", "Placeholder"));

  const body = add(c, vbox("Body", 12, 16), { fill: true });
  const meta = add(body, hbox("Meta", 12, 0), { fill: true });
  for (const m of [["clock", r[1]], ["gauge", r[2]], ["flame", r[3]]]) {
    const it = hbox(m[1], 4, 0);
    it.appendChild(icon(m[0], 14, "muted"));
    it.appendChild(await t(m[1], "Caption/Regular", "on-surface-variant", "Label"));
    meta.appendChild(it);
  }
  await para(body, r[0], "Heading/H3", "on-surface");
  const used = add(body, vbox("From fridge", 8, 12), { fill: true });
  surface(used, "surface-container-low", null, "md");
  const uh = hbox("Label", 4, 0);
  uh.appendChild(icon("checkCircle", 12, "primary"));
  uh.appendChild(await t("З вашого холодильника", "Caption/Strong", "primary", "Label"));
  used.appendChild(uh);
  const tags = add(used, hbox("Tags", 6, 0), { fill: true });
  tags.layoutWrap = "WRAP";
  tags.counterAxisSpacing = 6;
  r[5].forEach(function (n) { tags.appendChild(badge(n, "Warning", false)); });
  add(body, btn("Переглянути рецепт", "Primary", "md"), { fill: true });
  return c;
}

async function recipesScreen() {
  const sh = await screenShell("Розумні рецепти", "Рецепти із залишків");
  const main = sh.main;
  await pageTitle(
    main,
    badge("РОЗУМНІ РЕЦЕПТИ", "Primary", true),
    "Рецепти із залишків",
    "Оберіть продукти, термін яких спливає, — AI підбере страви, щоб нічого не викинути. Рецепти оновлюються автоматично.",
    [btn("Історія рецептів", "Outline", "md", "clock")],
  );

  // Рекомендовані
  const rec = add(main, vbox("Recommended", 16, 0), { fill: true });
  const rh = add(rec, hbox("Heading", 8, 0), { fill: true });
  rh.appendChild(await t("Рекомендовані рецепти", "Heading/H2", "on-surface", "Title"));
  rh.appendChild(badge("3 картки", "Neutral", false));
  add(rh, spacer(), { grow: true });
  rh.appendChild(await segmented([["За відповідністю", null], ["За часом", null]], 0));
  const cards = add(rec, hbox("Cards", 16, 0), { fill: true });
  cards.counterAxisAlignItems = "MIN";
  for (let i = 0; i < RECIPES.length; i++) add(cards, await recipeCard(RECIPES[i], i), { grow: true });

  // Конструктор
  const ctor = add(main, vbox("Constructor", 16, 24), { fill: true });
  surface(ctor, "surface-container-lowest", "border", "lg");
  const ch = add(ctor, hbox("Heading", 12, 0), { fill: true });
  ch.counterAxisAlignItems = "MIN";
  const cht = add(ch, vbox("Text", 4, 0), { grow: true });
  cht.appendChild(await t("Кулінарний конструктор", "Heading/H2", "on-surface", "Title"));
  cht.appendChild(await t("Оберіть від 3 до 4 продуктів, що скоро зіпсуються", "Label/Regular", "on-surface-variant", "Subtitle"));
  ch.appendChild(badge("3 / 4 обрано", "Primary", true));
  const items = [
    ["Шпинат Baby", 0, "Сьогодні", true], ["Грецький йогурт", 1, "Завтра", false], ["Філе куряче", 2, "2 дні", false], ["Кабачки / Цукіні", 3, "3 дні", false],
    ["Яйця фермерські", 4, "4 дні", true], ["Полуниця", 4, "4 дні", false], ["Молоко 2.5%", 5, "5 днів", false], ["Сир Гауда", 14, "14 днів", true],
  ];
  for (let r = 0; r < 2; r++) {
    const row = add(ctor, hbox("Row " + (r + 1), 12, 0), { fill: true });
    for (let ci = 0; ci < 4; ci++) {
      const it = items[r * 4 + ci];
      const cell = add(row, hbox(it[0], 10, [10, 12]), { grow: true });
      surface(cell, it[3] ? "primary-container" : "surface-container-low", it[3] ? "primary" : "border", "md");
      cell.appendChild(checkbox(it[3]));
      const nm = add(cell, await t(it[0], "Label/Strong", "on-surface", "Name"), { grow: true });
      nm.textAutoResize = "HEIGHT";
      cell.appendChild(freshness(it[1], it[2]));
    }
  }
  const cf = add(ctor, hbox("Footer", 12, 0), { fill: true });
  const hint = add(cf, hbox("Hint", 8, [8, 12]), { grow: true });
  surface(hint, "secondary-container", null, "md");
  hint.appendChild(icon("bulb", 16, "on-warning-container"));
  await para(hint, "Чудово! Ви обрали 3 складники. Можна додати ще один або одразу згенерувати рецепт.", "Label/Regular", "on-secondary-container");
  cf.appendChild(btn("Згенерувати рецепт", "Primary", "md", "sparkles"));

  // Обраний AI-рецепт
  const det = add(main, vbox("AI recipe", 24, 24), { fill: true });
  surface(det, "surface-container-lowest", "border", "lg");
  await det.setEffectStyleIdAsync(EFFECT_STYLE["Shadow/Card"].id);
  const top = add(det, hbox("Top", 24, 0), { fill: true });
  top.counterAxisAlignItems = "MIN";
  const info = add(top, vbox("Info", 14, 0), { grow: true });
  info.appendChild(badge("AI-рецепт", "Primary", true));
  await para(info, "Омлет фриттата зі шпинатом, яйцями та сиром Гауда", "Heading/H1", "on-surface");
  const meta = add(info, hbox("Meta", 16, 0), { fill: true });
  meta.layoutWrap = "WRAP";
  meta.counterAxisSpacing = 8;
  for (const m of [["clock", "20 хв"], ["gauge", "Легко"], ["flame", "410 ккал"]]) {
    const it = hbox(m[1], 6, 0);
    it.appendChild(icon(m[0], 16, "muted"));
    it.appendChild(await t(m[1], "Label/Medium", "on-surface-variant", "Label"));
    meta.appendChild(it);
  }
  meta.appendChild(badge("Використовує 3 продукти", "Warning", true));
  const ia = hbox("Actions", 12, 0);
  ia.appendChild(btn("Почати готувати", "Primary", "md", "arrowRight"));
  ia.appendChild(btn("Зберегти", "Outline", "md"));
  info.appendChild(ia);
  const pic = vbox("Picture", 8, 0);
  surface(pic, "surface-container", "outline-variant", "lg");
  pic.dashPattern = [6, 4];
  pic.primaryAxisAlignItems = "CENTER";
  pic.counterAxisAlignItems = "CENTER";
  pic.appendChild(icon("image", 32, "muted", "Placeholder"));
  pic.appendChild(await t("Фото страви", "Caption/Regular", "muted", "Caption"));
  pic.resize(380, 220);
  pic.primaryAxisSizingMode = "FIXED";
  pic.counterAxisSizingMode = "FIXED";
  top.appendChild(pic);

  // Інгредієнти
  const ing = add(det, vbox("Ingredients", 12, 0), { fill: true });
  ing.appendChild(await t("Інгредієнти", "Heading/H3", "on-surface", "Title"));
  const lists = add(ing, hbox("Lists", 16, 0), { fill: true });
  lists.counterAxisAlignItems = "MIN";
  const groups = [
    ["З холодильника", "3 / 3", "Primary", "checkCircle", "primary", [["Шпинат Baby", "150 г"], ["Яйця фермерські С0", "4 шт"], ["Сир твердий Гауда", "80 г"]]],
    ["Докупити", "+2", "Neutral", "plus", "muted", [["Лимон", "1 шт"], ["Кріп свіжий", "1 пучок"]]],
  ];
  for (const g of groups) {
    const box = add(lists, vbox(g[0], 10, 16), { grow: true });
    surface(box, "surface-container-low", "border", "md");
    const gh = add(box, hbox("Heading", 8, 0), { fill: true });
    gh.appendChild(await t(g[0], "Body/Strong", "on-surface", "Title"));
    add(gh, spacer(), { grow: true });
    gh.appendChild(badge(g[1], g[2], false));
    for (const it of g[5]) {
      const line = add(box, hbox(it[0], 8, 0), { fill: true });
      line.appendChild(icon(g[3], 16, g[4]));
      add(line, await t(it[0], "Body/Regular", "on-surface", "Name"), { grow: true });
      line.appendChild(await t(it[1], "Label/Regular", "muted", "Amount"));
    }
    if (g[0] === "Докупити") box.appendChild(btn("Додати в список покупок", "Outline", "sm", "cart"));
  }

  // Кроки
  const steps = add(det, vbox("Steps", 10, 0), { fill: true });
  steps.appendChild(await t("Покрокова інструкція", "Heading/H3", "on-surface", "Title"));
  const STEPS = [
    ["Підготуйте інгредієнти", "Промийте шпинат, натріть сир, збийте яйця з дрібкою солі та перцю."],
    ["Обсмажте шпинат", "На розігрітій сковороді з краплею олії 2 хвилини, доки листя не зів'яне."],
    ["Залийте яйцями", "Додайте яєчну суміш, посипте сиром і готуйте 5 хвилин на середньому вогні."],
    ["Запечіть", "Поставте сковороду в духовку на 180 °C на 8–10 хвилин до золотистої скоринки."],
  ];
  for (let i = 0; i < STEPS.length; i++) {
    const st = add(steps, hbox("Step " + (i + 1), 14, 14), { fill: true });
    st.counterAxisAlignItems = "MIN";
    surface(st, "surface-container-low", null, "md");
    const num = hbox("Number", 0, 0);
    surface(num, "primary", null, "pill");
    num.appendChild(await t(String(i + 1), "Label/Strong", "on-primary", "N"));
    st.appendChild(square(num, 28));
    const tx = add(st, vbox("Text", 2, 0), { grow: true });
    tx.appendChild(await t(STEPS[i][0], "Body/Strong", "on-surface", "Title"));
    await para(tx, STEPS[i][1], "Body/Regular", "on-surface-variant");
  }
  const df = add(det, hbox("Footer", 12, 0), { fill: true });
  add(df, spacer(), { grow: true });
  df.appendChild(btn("Поділитися", "Ghost", "md", "share"));
  df.appendChild(btn("Списати використані продукти", "Primary", "md", "checkCircle"));
  return finishShell(sh);
}

// ---------- Екран 3: Список покупок ----------
const SHOP_TODO = [
  ["Лимон", "1 шт", "Для рецепту", "Primary"],
  ["Молоко пастеризоване 2.5%", "1 л", "Закінчується", "Warning"],
  ["Шпинат Baby свіжий", "150 г", "Закінчується", "Warning"],
  ["Яйця фермерські С0", "10 шт", "Для рецепту", "Primary"],
  ["Цільнозерновий хліб", "1 шт", "Вручну", "Neutral"],
  ["Вівсяне молоко Barista", "1 л", "Вручну", "Neutral"],
];
const SHOP_DONE = [["Гречка ядриця", "1 кг"], ["Банани", "6 шт"], ["Сир кисломолочний 5%", "400 г"], ["Огірки", "500 г"]];

async function shopRow(item, done) {
  const row = hbox("Item · " + item[0], 12, [12, 16]);
  surface(row, "surface-container-lowest", "border", "md");
  row.appendChild(checkbox(done));
  const tx = add(row, vbox("Text", 2, 0), { grow: true });
  const name = await t(item[0], "Body/Strong", done ? "muted" : "on-surface", "Name");
  if (done) name.textDecoration = "STRIKETHROUGH";
  tx.appendChild(name);
  tx.appendChild(await t(item[1], "Caption/Regular", "muted", "Qty"));
  if (!done) row.appendChild(badge(item[2], item[3], true));
  row.appendChild(iconButton(done ? "close" : "more"));
  if (done) row.opacity = 0.75;
  return row;
}

async function shoppingScreen() {
  const sh = await screenShell("Список покупок", "Список покупок");
  const main = sh.main;
  const crumbs = await breadcrumb(["Сховище", "Список покупок"]);
  const auto = hbox("Auto refill", 8, [8, 12]);
  surface(auto, "surface-container-lowest", "border", "md");
  auto.appendChild(checkbox(true));
  auto.appendChild(await t("Автопоповнення", "Label/Strong", "on-surface", "Label"));
  await pageTitle(main, crumbs, "Розумний список покупок", "Спільний список сім'ї з автоматичним поповненням продуктів, що закінчуються або скоро зіпсуються.", [
    auto,
    btn("Поділитися", "Outline", "md", "share"),
  ]);

  const two = add(main, hbox("Layout", 24, 0), { fill: true });
  two.counterAxisAlignItems = "MIN";
  const left = add(two, vbox("List", 16, 0), { grow: true });
  const right = vbox("Sidebar", 16, 0);
  two.appendChild(right);
  fixWidth(right, 320);

  // AI-пропозиція
  const ai = add(left, hbox("AI suggestion", 12, [14, 16]), { fill: true });
  surface(ai, "primary-container", "primary", "lg");
  ai.dashPattern = [6, 4];
  ai.appendChild(iconBox("sparkles", 18, 36, "surface-container-lowest", "primary"));
  const at = add(ai, vbox("Text", 2, 0), { grow: true });
  at.appendChild(await t("AI пропонує додати «Лимон»", "Body/Strong", "on-primary-container", "Title"));
  await para(at, "Потрібен для рецепту «Омлет фриттата», який використовує шпинат, що зіпсується сьогодні.", "Label/Regular", "on-primary-container");
  ai.appendChild(btn("Додати", "Primary", "sm", "plus"));

  // Додавання
  const addRow = add(left, hbox("Add item", 8, 0), { fill: true });
  add(addRow, await field("Додати продукт або страву (наприклад: Вівсяне молоко Barista 1 л)...", "plus", null, true), { grow: true });
  addRow.appendChild(await field("Овочі & Зелень", null, "chevronDown", false));
  addRow.appendChild(await field("1 шт", null, "chevronDown", false));
  addRow.appendChild(btn("Додати", "Primary", "md"));

  // Треба купити
  const todoHead = add(left, hbox("To buy heading", 8, 0), { fill: true });
  todoHead.appendChild(await t("ТРЕБА КУПИТИ", "Label/Strong", "on-surface", "Title"));
  todoHead.appendChild(badge(String(SHOP_TODO.length), "Primary", false));
  add(todoHead, spacer(), { grow: true });
  todoHead.appendChild(await segmented([["Усі", null], ["За категоріями", null]], 0));
  for (const it of SHOP_TODO) add(left, await shopRow(it, false), { fill: true });

  // Вже куплено
  const doneHead = add(left, hbox("Bought heading", 8, 0), { fill: true });
  doneHead.paddingTop = 8;
  doneHead.appendChild(icon("chevronDown", 16, "muted"));
  doneHead.appendChild(await t("ВЖЕ КУПЛЕНО", "Label/Strong", "on-surface-variant", "Title"));
  doneHead.appendChild(badge(String(SHOP_DONE.length), "Neutral", false));
  for (const it of SHOP_DONE) add(left, await shopRow(it, true), { fill: true });

  const move = add(left, hbox("Move to fridge", 12, [14, 16]), { fill: true });
  surface(move, "surface-container-lowest", "border", "lg");
  move.appendChild(iconBox("package", 18, 36, "surface-container", "on-surface-variant"));
  await para(move, "Перенесіть 4 придбані товари одразу до цифрового інвентарю холодильника!", "Body/Regular", "on-surface");
  move.children[1].layoutGrow = 1;
  move.appendChild(btn("Перенести в холодильник", "Outline", "sm", "arrowRight"));

  // Бічна панель
  add(right, statCard("Neutral", "ОРІЄНТОВНИЙ БЮДЖЕТ", "≈ 640", "₴", "−12% завдяки залишкам", "cart"), { fill: true });
  const tipsCard = add(right, vbox("Tips", 10, 20), { fill: true });
  surface(tipsCard, "secondary-container", null, "lg");
  const th = hbox("Heading", 8, 0);
  th.appendChild(icon("bulb", 16, "on-warning-container"));
  th.appendChild(await t("Порада", "Body/Strong", "on-secondary-container", "Title"));
  tipsCard.appendChild(th);
  await para(tipsCard, "Купуйте зелень невеликими порціями: шпинат і кріп зберігаються лише 2–3 дні.", "Label/Regular", "on-secondary-container");
  const fam = add(right, vbox("Family", 12, 20), { fill: true });
  surface(fam, "surface-container-lowest", "border", "lg");
  fam.appendChild(await t("Хто купує", "Body/Strong", "on-surface", "Title"));
  for (const m of [["ОК", "Олена", "4 товари"], ["АК", "Андрій", "2 товари"]]) {
    const r = add(fam, hbox(m[1], 10, 0), { fill: true });
    const av = hbox("Avatar", 0, 0);
    surface(av, "primary-container", null, "pill");
    av.appendChild(await t(m[0], "Caption/Strong", "on-primary-container", "Initials"));
    r.appendChild(square(av, 28));
    add(r, await t(m[1], "Label/Strong", "on-surface", "Name"), { grow: true });
    r.appendChild(await t(m[2], "Caption/Regular", "muted", "Count"));
  }
  return finishShell(sh);
}

async function buildScreens(entries) {
  entries.forEach(function (e) { if (e.node.type === "COMPONENT_SET") SETS[e.title] = e.node; });

  let page = null;
  figma.root.children.forEach(function (p) { if (p.name === MOCKUP_PAGE) page = p; });
  if (!page) {
    page = figma.createPage();
    page.name = MOCKUP_PAGE;
  }
  await page.loadAsync();
  await figma.setCurrentPageAsync(page);
  page.children.slice().forEach(function (n) { if (n.getPluginData(TAG_KEY)) n.remove(); });

  // Мокапи розміщуємо під наявними вайрфреймами
  let top = 0, left = 0, first = true;
  page.children.forEach(function (n) {
    if (first) { left = n.x; first = false; }
    top = Math.max(top, n.y + n.height);
    left = Math.min(left, n.x);
  });
  top += page.children.length ? 400 : 0;

  const light = [await fridgeScreen(), await recipesScreen(), await shoppingScreen()];
  const rows = [["Desktop · Light", light, "light"], ["Desktop · Dark", null, "dark"]];
  const all = [];
  let y = top;
  for (const r of rows) {
    const label = await text(r[0], "Display", null, r[0]);
    label.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.62, b: 0.65 } }];
    label.setPluginData(TAG_KEY, "label");
    page.appendChild(label);
    label.x = left;
    label.y = y;
    y += label.height + 32;
    let x = left, rowH = 0;
    const screens = r[1] || light.map(function (s) { return s.clone(); });
    screens.forEach(function (s) {
      page.appendChild(s);
      s.name = s.name.replace(/ — (Light|Dark)$/, "") + (r[2] === "dark" ? " — Dark" : " — Light");
      s.setPluginData(TAG_KEY, "mockup");
      s.x = x;
      s.y = y;
      x += s.width + 120;
      rowH = Math.max(rowH, s.height);
      applyTheme(s, r[2]);
      all.push(s);
    });
    y += rowH + 240;
  }
  return all;
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

  // Мокапи на сторінці «Мокап» (вайрфрейми не змінюються)
  const mockups = await buildScreens(entries);
  figma.currentPage.selection = mockups;
  figma.viewport.scrollAndZoomIntoView(mockups);

  const variants = entries.reduce(function (n, e) { return n + (e.node.type === "COMPONENT_SET" ? e.node.children.length : 1); }, 0);
  return (
    "Готово: UI Kit (3 фрейми) + " + mockups.length + " мокапів на сторінці «Мокап», " + entries.length + " компонентів, " + variants + " варіантів. " +
    (THEME.native ? "Темна тема — режим Dark." : "Тариф без режимів: темна тема через колекцію «ZWF / Color (Dark)».")
  );
}

main().then(
  function (msg) { figma.closePlugin(msg); },
  function (err) { figma.closePlugin("Помилка: " + (err && err.message ? err.message : String(err))); },
);
