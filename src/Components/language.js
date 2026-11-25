/*
  Site language.

  The language a customer picks in Settings → Language is saved on this device and applied to the whole
  site: every page, button, menu and message. It is translated in the browser, so pages that are added
  later are covered too, with nothing to translate by hand.
*/

export const LANGUAGE_KEY = "kinvest_language";
const SOURCE = "en";

// a few of our codes differ from the ones the translation service uses
const ENGINE_CODE = { fil: "tl", he: "iw", jv: "jw" };
const engineCode = (code) => ENGINE_CODE[code] || code;

export const getSiteLanguage = () => {
  try {
    return localStorage.getItem(LANGUAGE_KEY) || SOURCE;
  } catch {
    return SOURCE;
  }
};

/* ---------- the cookie the translation service reads ---------- */
const setCookie = (value) => {
  const host = window.location.hostname;
  const base = "path=/; SameSite=Lax";
  if (value) {
    document.cookie = `googtrans=${value}; ${base}`;
    if (host.includes(".")) document.cookie = `googtrans=${value}; domain=.${host}; ${base}`;
  } else {
    const gone = `${base}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `googtrans=; ${gone}`;
    if (host.includes(".")) {
      document.cookie = `googtrans=; domain=.${host}; ${gone}`;
      document.cookie = `googtrans=; domain=${host}; ${gone}`;
    }
  }
};

/* ---------- hide the translation service's own banner and widget ---------- */
const STYLE_ID = "kinvest-translate-style";
const addStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #kinvest-translate { display: none !important; }
    .skiptranslate iframe, iframe.skiptranslate, .goog-te-banner-frame { display: none !important; }
    body { top: 0 !important; position: static !important; }
    .goog-text-highlight { background: none !important; box-shadow: none !important; }
    #goog-gt-tt, .goog-tooltip, .goog-tooltip:hover { display: none !important; }
    font { background: none !important; box-shadow: none !important; }
  `;
  document.head.appendChild(style);
};

/*
  A translated page rewrites text nodes, which can make React throw when it later removes or moves an
  element that the translator wrapped. These two guards make React skip nodes that are no longer where
  it left them, instead of crashing the page.
*/
const protectReact = () => {
  if (window.__kinvestReactGuard) return;
  window.__kinvestReactGuard = true;

  const remove = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return remove.call(this, child);
  };

  const insert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    if (ref && ref.parentNode !== this) return node;
    return insert.call(this, node, ref);
  };
};

const loadTranslator = () => {
  if (document.getElementById("kinvest-translate-script")) return;

  let holder = document.getElementById("kinvest-translate");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "kinvest-translate";
    holder.setAttribute("aria-hidden", "true");
    document.body.appendChild(holder);
  }

  window.kinvestTranslateInit = () => {
    try {
      // eslint-disable-next-line no-undef
      new google.translate.TranslateElement({ pageLanguage: SOURCE, autoDisplay: false }, "kinvest-translate");
    } catch {
      /* the translator could not start: the site simply stays in English */
    }
  };

  const script = document.createElement("script");
  script.id = "kinvest-translate-script";
  script.src = "https://translate.google.com/translate_a/element.js?cb=kinvestTranslateInit";
  script.async = true;
  document.body.appendChild(script);
};

/* Call once when the site starts: applies the language saved on this device. */
export const initLanguage = () => {
  const code = getSiteLanguage();
  document.documentElement.lang = code;
  if (code === SOURCE) {
    setCookie("");
    return;
  }
  addStyles();
  protectReact();
  setCookie(`/${SOURCE}/${engineCode(code)}`);
  if (document.body) loadTranslator();
  else document.addEventListener("DOMContentLoaded", loadTranslator, { once: true });
};

/* Call when the customer picks a language. The page reloads once so every screen switches together. */
export const setSiteLanguage = (code) => {
  if (code === getSiteLanguage()) return;
  try {
    localStorage.setItem(LANGUAGE_KEY, code);
  } catch {
    /* storage unavailable: the choice lasts until the page is closed */
  }
  setCookie(code === SOURCE ? "" : `/${SOURCE}/${engineCode(code)}`);
  window.location.reload();
};
