import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import "./Settings.css";
import { getSiteLanguage, setSiteLanguage } from "../Components/language";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 12h5v4h-5a2 2 0 0 1 0-4z" />
    </>
  ),
  stats: (
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

const Icon = ({ name, className = "set-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Languages (add more by adding a line) ---------- */
const rawLanguages = [
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "ak", name: "Akan (Twi)", native: "Akan" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan dili" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "be", name: "Belarusian", native: "Беларуская" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "br", name: "Breton", native: "Brezhoneg" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "ceb", name: "Cebuano", native: "Cebuano" },
  { code: "ny", name: "Chichewa", native: "Chichewa" },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "co", name: "Corsican", native: "Corsu" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "en", name: "English", native: "English" },
  { code: "eo", name: "Esperanto", native: "Esperanto" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "fo", name: "Faroese", native: "Føroyskt" },
  { code: "fil", name: "Filipino", native: "Filipino" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "fr", name: "French", native: "Français" },
  { code: "fy", name: "Frisian", native: "Frysk" },
  { code: "ff", name: "Fula", native: "Fulfulde" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "gn", name: "Guarani", native: "Avañe'ẽ" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "ht", name: "Haitian Creole", native: "Kreyòl ayisyen" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "hmn", name: "Hmong", native: "Hmoob" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "jv", name: "Javanese", native: "Basa Jawa" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "kk", name: "Kazakh", native: "Қазақ тілі" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "rw", name: "Kinyarwanda", native: "Ikinyarwanda" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ku", name: "Kurdish", native: "Kurdî" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "la", name: "Latin", native: "Latina" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "ln", name: "Lingala", native: "Lingála" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "mg", name: "Malagasy", native: "Malagasy" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "mi", name: "Maori", native: "Te Reo Māori" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "pcm", name: "Nigerian Pidgin", native: "Naijá" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "om", name: "Oromo", native: "Afaan Oromoo" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "qu", name: "Quechua", native: "Runasimi" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "sm", name: "Samoan", native: "Gagana Samoa" },
  { code: "gd", name: "Scots Gaelic", native: "Gàidhlig" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "st", name: "Sesotho", native: "Sesotho" },
  { code: "tn", name: "Setswana", native: "Setswana" },
  { code: "sn", name: "Shona", native: "chiShona" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "so", name: "Somali", native: "Soomaali" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "su", name: "Sundanese", native: "Basa Sunda" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "tt", name: "Tatar", native: "Татар" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "bo", name: "Tibetan", native: "བོད་སྐད་" },
  { code: "ti", name: "Tigrinya", native: "ትግርኛ" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "tk", name: "Turkmen", native: "Türkmen" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "ug", name: "Uyghur", native: "ئۇيغۇرچە" },
  { code: "uz", name: "Uzbek", native: "Oʻzbek" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "wo", name: "Wolof", native: "Wolof" },
  { code: "xh", name: "Xhosa", native: "isiXhosa" },
  { code: "yi", name: "Yiddish", native: "ייִדיש" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
];

const languages = [...rawLanguages].sort((a, b) => a.name.localeCompare(b.name));

// lets "espanol" find "Español", etc.
const normalize = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();



const sections = [
  {
    title: "General",
    items: [
      { label: "Language", action: "language" },
      { label: "My Profile", to: "/profile" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Change Password", to: "/settings/password" },
      { label: "Privacy Policy", to: "/settings/privacy" },
    ],
  },
];
const tabs = [
  { id: "home", label: "Home", icon: "home", to: "/homeprofile" },
  { id: "cards", label: "My Cards", icon: "wallet", to: "/my-cards" },
  { id: "stats", label: "Statistics", icon: "stats", to: "/statistics" },
  { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
];

/* ---------- Page ---------- */
const Settings = () => {
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState(getSiteLanguage);

  const noBtnRef = useRef(null);
  const searchRef = useRef(null);

  const modalOpen = confirmOpen || langOpen;

  // Esc closes whichever box is open, and the page behind stops scrolling
  useEffect(() => {
    if (!modalOpen) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setConfirmOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  // put the cursor in the safest place when a box opens
  useEffect(() => {
    if (confirmOpen) noBtnRef.current?.focus();
  }, [confirmOpen]);

  useEffect(() => {
    if (langOpen) searchRef.current?.focus();
  }, [langOpen]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return languages;
    return languages.filter(
      (l) => normalize(l.name).includes(q) || normalize(l.native).includes(q)
    );
  }, [query]);

  const current = languages.find((l) => l.code === language) || languages.find((l) => l.code === "en");

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true") {
    return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("kinvest_auth");
    } catch {
      /* storage unavailable, ignore */
    }
    setConfirmOpen(false);
    navigate("/", { replace: true });
  };

  const closeLanguage = () => {
    setLangOpen(false);
    setQuery("");
  };

  const chooseLanguage = (code) => {
    setLanguage(code);
    closeLanguage();
    // saves the choice and switches the whole site to it
    setSiteLanguage(code);
  };

  return (
    <div className="set-page">
      <div className="set">
        <div className="set-body">
          {/* ---------- Header ---------- */}
          <header className="set-header">
            <Link to="/homeprofile" className="set-round-btn" aria-label="Back">
              <Icon name="back" />
            </Link>

            <h1>Settings</h1>

            <button
              type="button"
              className="set-round-btn"
              aria-label="Log out"
              onClick={() => setConfirmOpen(true)}
            >
              <Icon name="logout" />
            </button>
          </header>

          {/* ---------- Groups ---------- */}
          {sections.map((s) => (
            <section className="set-group" key={s.title} aria-labelledby={`set-${s.title}`}>
              <h2 id={`set-${s.title}`}>{s.title}</h2>

              <ul>
                {s.items.map((item) => (
                  <li key={item.label}>
                    {item.action === "language" ? (
                      <button
                        type="button"
                        className="set-row"
                        onClick={() => setLangOpen(true)}
                      >
                        <span className="set-row-label">{item.label}</span>
                        <span className="set-row-value">{current.name}</span>
                        <Icon name="chevron" className="set-chevron" />
                      </button>
                    ) : (
                      <Link to={item.to} className="set-row">
                        <span className="set-row-label">{item.label}</span>
                        <Icon name="chevron" className="set-chevron" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* ---------- Bottom tab bar ---------- */}
        <nav className="set-tabbar" aria-label="Main">
          {tabs.map((t) => (
            <Link
              to={t.to}
              key={t.id}
              className={`set-tab ${t.id === "settings" ? "active" : ""}`}
              aria-current={t.id === "settings" ? "page" : undefined}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* ---------- Log out confirmation ---------- */}
      {confirmOpen && (
        <div className="set-overlay" onClick={() => setConfirmOpen(false)}>
          <div
            className="set-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="set-dialog-icon">
              <Icon name="logout" />
            </span>
            <h2 id="logout-title">Log out?</h2>
            <p id="logout-desc">Are you sure you want to log out?</p>

            <div className="set-dialog-actions">
              <button
                type="button"
                ref={noBtnRef}
                className="set-btn ghost"
                onClick={() => setConfirmOpen(false)}
              >
                No
              </button>
              <button type="button" className="set-btn solid" onClick={handleLogout}>
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Language picker ---------- */}
      {langOpen && (
        <div className="set-overlay bottom" onClick={closeLanguage}>
          <div
            className="set-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lang-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="set-sheet-head">
              <h2 id="lang-title">Select language</h2>
              <button
                type="button"
                className="set-sheet-close"
                aria-label="Close"
                onClick={closeLanguage}
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="set-search">
              <Icon name="search" />
              <input
                ref={searchRef}
                type="search"
                placeholder="Search language"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search language"
              />
            </div>

            <ul className="set-lang-list">
              {filtered.map((l) => (
                <li key={l.code}>
                  <button
                    type="button"
                    className={`set-lang ${l.code === language ? "selected" : ""}`}
                    aria-current={l.code === language ? "true" : undefined}
                    onClick={() => chooseLanguage(l.code)}
                  >
                    <span className="set-lang-names">
                      <strong>{l.native}</strong>
                      {l.native !== l.name && <small>{l.name}</small>}
                    </span>
                    {l.code === language && <Icon name="check" className="set-lang-check" />}
                  </button>
                </li>
              ))}
            </ul>

            {filtered.length === 0 && <p className="set-empty">No language found</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;