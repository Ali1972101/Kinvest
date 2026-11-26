import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  getProfileExtras,
  removeAvatar,
  saveProfileExtras,
  updateProfile,
  uploadAvatar,
  useAvatar,
  useCurrentUser,
} from "../Components/userStore";
import "./EditProfile.css";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  person: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.3 18.2c1.2-2 3.4-3.2 5.7-3.2s4.5 1.2 5.7 3.2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

const Icon = ({ name, className = "ep-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Data ---------- */
const MAX_PHOTO_MB = 2;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const emptyProfile = {
  fullName: "",
  email: "",
  phone: "",
  day: "",
  month: "", // 0 to 11
  year: "",
};

// builds the form from the signed-in customer's own details
const buildProfile = (account) => {
  if (!account) return emptyProfile;
  return {
    ...emptyProfile,
    fullName: [account.firstName, account.lastName].filter(Boolean).join(" "),
    email: account.email || "",
    phone: account.phone || "",
    ...getProfileExtras(account.id),
  };
};

/* ---------- Helpers ---------- */
const daysInMonth = (month, year) =>
  new Date(Number(year) || 2000, Number(month) + 1, 0).getDate();

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const validate = (v) => {
  const e = {};
  if (!v.fullName.trim()) e.fullName = "Enter your full name";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address";
  if (v.phone && v.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number";

  const chosen = [v.day, v.month, v.year].filter((x) => x !== "").length;
  if (chosen > 0 && chosen < 3) e.birth = "Choose a day, month and year";
  return e;
};

/* ---------- Page ---------- */
const EditProfile = () => {
  const account = useCurrentUser();
  const photo = useAvatar(); // the saved picture, or "" when there isn't one
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(() => buildProfile(account));
  const [form, setForm] = useState(() => buildProfile(account));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [toast, setToast] = useState(false);
  const [toastText, setToastText] = useState("Profile updated");

  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const errors = useMemo(() => validate(form), [form]);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const thisYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 83 }, (_, i) => thisYear - 18 - i),
    [thisYear]
  );
  const maxDay = form.month === "" ? 31 : daysInMonth(form.month, form.year);

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  const err = (name) => ((touched[name] || submitted) && errors[name]) || "";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((f) => {
      const next = { ...f, [name]: value };
      // never allow a day that doesn't exist (e.g. 31 September)
      if ((name === "month" || name === "year") && next.day !== "" && next.month !== "") {
        const max = daysInMonth(next.month, next.year);
        if (Number(next.day) > max) next.day = String(max);
      }
      return next;
    });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  // the picture is sent to the server as soon as it is chosen
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Photo must be smaller than ${MAX_PHOTO_MB} MB.`);
      return;
    }

    setPhotoError("");
    setUploading(true);
    const result = await uploadAvatar(file);
    setUploading(false);

    if (!result.ok) setPhotoError(result.error);
    else flashToast("Photo updated");
  };

  const handleRemovePhoto = async () => {
    setPhotoError("");
    setUploading(true);
    const result = await removeAvatar();
    setUploading(false);

    if (!result.ok) setPhotoError(result.error);
    else flashToast("Photo removed");
  };

  const flashToast = (message) => {
    setToastText(message);
    setToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 2600);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveError("");
    if (Object.keys(errors).length > 0 || !dirty || saving) return;

    const clean = {
      ...form,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };

    // saves to this customer's own account on the server
    const [first, ...rest] = clean.fullName.split(/\s+/);
    setSaving(true);
    const profile = await updateProfile(account.id, {
      firstName: first,
      lastName: rest.join(" "),
      phone: clean.phone,
    });
    const extras = profile.ok
      ? await saveProfileExtras(account.id, { day: clean.day, month: clean.month, year: clean.year })
      : profile;
    setSaving(false);

    if (!extras.ok) {
      setSaveError(extras.error);
      return;
    }

    setForm(clean);
    setSaved(clean);
    setSubmitted(false);
    setTouched({});
    flashToast("Profile updated");
  };

  return (
    <div className="ep-page">
      <form className="ep" onSubmit={handleSave} noValidate>
        <div className="ep-body">
          {/* ---------- Header ---------- */}
          <header className="ep-header">
            <Link to="/profile" className="ep-round-btn" aria-label="Back">
              <Icon name="back" />
            </Link>
            <h1>Edit Profile</h1>
            <span aria-hidden="true" />
          </header>

          {/* ---------- Avatar ---------- */}
          <section className="ep-avatar-block">
            <div className="ep-avatar-wrap">
              <div className="ep-avatar">
                {photo ? (
                  <img src={photo} alt="Your profile" />
                ) : (
                  <span>{initials(form.fullName)}</span>
                )}
              </div>

              <button
                type="button"
                className="ep-camera"
                aria-label="Change photo"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="camera" />
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="ep-file"
                onChange={handlePhoto}
                tabIndex={-1}
              />
            </div>

            {photoError && (
              <p className="ep-error center" role="alert">
                {photoError}
              </p>
            )}

            {uploading && <p className="ep-photo-note">Uploading…</p>}
            {photo && !uploading && (
              <button type="button" className="ep-remove" onClick={handleRemovePhoto}>
                Remove photo
              </button>
            )}

            <h2>{form.fullName.trim() || "Your name"}</h2>
            <p>{account.accountType || "Kinqora customer"}</p>
          </section>

          {/* ---------- Full name ---------- */}
          <div className={`ep-field ${err("fullName") ? "has-error" : ""}`}>
            <label htmlFor="fullName">Full Name</label>
            <div className="ep-input">
              <Icon name="person" className="ep-field-icon" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(err("fullName"))}
              />
            </div>
            {err("fullName") && (
              <p className="ep-error" role="alert">
                {err("fullName")}
              </p>
            )}
          </div>

          {/* ---------- Email ---------- */}
          <div className={`ep-field ${err("email") ? "has-error" : ""}`}>
            <label htmlFor="email">Email Address</label>
            <div className="ep-input">
              <Icon name="mail" className="ep-field-icon" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                readOnly
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(err("email"))}
              />
            </div>
            {err("email") && (
              <p className="ep-error" role="alert">
                {err("email")}
              </p>
            )}
          </div>

          {/* ---------- Phone ---------- */}
          <div className={`ep-field ${err("phone") ? "has-error" : ""}`}>
            <label htmlFor="phone">Phone Number</label>
            <div className="ep-input">
              <Icon name="phone" className="ep-field-icon" />
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+000 0000 000000"
                value={form.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(err("phone"))}
              />
            </div>
            {err("phone") && (
              <p className="ep-error" role="alert">
                {err("phone")}
              </p>
            )}
          </div>

          {/* ---------- Birth date ---------- */}
          {/* <fieldset className={`ep-field ep-birth ${err("birth") ? "has-error" : ""}`}>
            <legend>Birth Date</legend>

            <div className="ep-birth-row">
              <select
                name="day"
                aria-label="Day"
                value={form.day}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                name="month"
                aria-label="Month"
                value={form.month}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                name="year"
                aria-label="Year"
                value={form.year}
                onChange={handleChange}
                onBlur={handleBlur}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {err("birth") && (
              <p className="ep-error" role="alert">
                {err("birth")}
              </p>
            )}
          </fieldset> */}
        </div>

        {/* ---------- Footer ---------- */}
        <footer className="ep-footer">
          {saveError && (
            <p className="ep-error center" role="alert">
              {saveError}
            </p>
          )}
          <button type="submit" className="ep-save" disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </footer>

        {toast && (
          <div className="ep-toast" role="status">
            <Icon name="check" />
            {toastText}
          </div>
        )}
      </form>
    </div>
  );
};

export default EditProfile;