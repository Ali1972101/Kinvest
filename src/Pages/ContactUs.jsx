import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import "./ContactUs.css";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import heroImage from "../assets/Images/Contactimg.png";
import { getHomePath } from "../Components/Homepath";
import { request } from "../Components/api";

const MAX_COMMENTS = 1000;

/* ---------- Icons ---------- */
const paths = {
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

const Icon = ({ name, className = "ct-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Contact details (replace with your real ones) ---------- */
const details = [
  { icon: "phone", title: "Call us", lines: ["(408) 396-1972", "Mon – Fri, 8am – 5pm"] },
  { icon: "mail", title: "Email us", lines: ["contact@kinqora.com"] },
  // { icon: "pin", title: "Visit us", lines: ["123 Main Street", "Your City, State 00000"] },
  { icon: "clock", title: "Branch hours", lines: ["Mon – Fri: 9am – 5pm", "Sat: 9am – 1pm"] },
];

const initialValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  comments: "",
  website: "", // hidden spam trap, must stay empty
};

/* ---------- Validation ---------- */
const validate = (v) => {
  const e = {};
  if (!v.firstName.trim()) e.firstName = "Enter your first name";
  if (!v.lastName.trim()) e.lastName = "Enter your last name";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address";
  if (v.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number";
  if (v.comments.trim().length < 5) e.comments = "Tell us how we can help";
  return e;
};

/* ---------- Page ---------- */
const ContactUs = () => {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [sendError, setSendError] = useState("");

  const navigate = useNavigate();

  // dashboard if logged in, login page if not (checked every time the page shows)
  const homePath = getHomePath();

  // back to the page the person came from, or home if the page was opened directly
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(homePath);
  };

  const errors = useMemo(() => validate(values), [values]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const err = (name) => ((touched[name] || submitted) && errors[name]) || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSubmitted(true);

    if (Object.keys(errors).length > 0) {
      // move the cursor to the first field that needs attention
      setTimeout(() => document.querySelector(".ct-field.has-error input")?.focus(), 0);
      return;
    }

    // spam trap: real people never fill this in, so just pretend it worked
    if (values.website) {
      setDone(true);
      return;
    }

    setSending(true);
    setSendError("");

    try {
      await request("/api/contact", {
        method: "POST",
        body: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          comments: values.comments.trim(),
          website: values.website,
        },
      });
      setDone(true);
    } catch (error) {
      setSendError(error.message || "We couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setTouched({});
    setSubmitted(false);
    setDone(false);
    setSendError("");
  };

  return (
    <>
      <Navbar />

      {/* ---------- Banner ---------- */}
      <section className="ct-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="ct-hero-overlay" />

        {/* back button (shown on phones only, see ContactUs.css) */}
        <button type="button" className="ct-back" aria-label="Go back" onClick={goBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="ct-hero-inner">
          <nav className="ct-crumbs" aria-label="Breadcrumb">
            <Link to={homePath}>Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Contact Us</span>
          </nav>
          <h1>Contact Us</h1>
          <p>We're here to help with your accounts, cards and loans.</p>
        </div>
      </section>

      {/* ---------- Content ---------- */}
      <main className="ct-main">
        <div className="ct-grid">
          {/* ---------- Form ---------- */}
          <section className="ct-card" aria-labelledby="ct-form-title">
            {done ? (
              <div className="ct-success" role="status">
                <span className="ct-success-icon">
                  <Icon name="check" />
                </span>
                <h2>Thank you, {values.firstName}</h2>
                <p>
                  We've received your message and a member of our team will get back to you
                  within one business day.
                </p>
                <button type="button" className="ct-btn ghost" onClick={reset}>
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 id="ct-form-title">Send us a message</h2>

                <div className="ct-notice" role="note">
                  <Icon name="shield" className="ct-notice-icon" />
                  <p>
                    <strong>Please do not</strong> send confidential or personal information,
                    such as account numbers, social security numbers or balances, in this form.
                    Email is not encrypted and is not a secure way to reach us. If you need help
                    with your account, please contact a Kinqora branch or call us and ask for
                    a Customer Service Representative.
                  </p>
                </div>

                <p className="ct-required-note">
                  <span aria-hidden="true">*</span> indicates a required field
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  {/* hidden spam trap */}
                  <div className="ct-hp" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={values.website}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="ct-row">
                    <div className={`ct-field ${err("firstName") ? "has-error" : ""}`}>
                      <label htmlFor="firstName">
                        First name <span className="ct-star">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        value={values.firstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={Boolean(err("firstName"))}
                        aria-describedby={err("firstName") ? "firstName-error" : undefined}
                      />
                      {err("firstName") && (
                        <p className="ct-error" id="firstName-error" role="alert">
                          {err("firstName")}
                        </p>
                      )}
                    </div>

                    <div className={`ct-field ${err("lastName") ? "has-error" : ""}`}>
                      <label htmlFor="lastName">
                        Last name <span className="ct-star">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={values.lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={Boolean(err("lastName"))}
                        aria-describedby={err("lastName") ? "lastName-error" : undefined}
                      />
                      {err("lastName") && (
                        <p className="ct-error" id="lastName-error" role="alert">
                          {err("lastName")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="ct-row">
                    <div className={`ct-field ${err("email") ? "has-error" : ""}`}>
                      <label htmlFor="email">
                        Email <span className="ct-star">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={Boolean(err("email"))}
                        aria-describedby={err("email") ? "email-error" : undefined}
                      />
                      {err("email") && (
                        <p className="ct-error" id="email-error" role="alert">
                          {err("email")}
                        </p>
                      )}
                    </div>

                    <div className={`ct-field ${err("phone") ? "has-error" : ""}`}>
                      <label htmlFor="phone">
                        Phone number <span className="ct-star">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={values.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={Boolean(err("phone"))}
                        aria-describedby={err("phone") ? "phone-error" : undefined}
                      />
                      {err("phone") && (
                        <p className="ct-error" id="phone-error" role="alert">
                          {err("phone")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`ct-field ${err("comments") ? "has-error" : ""}`}>
                    <label htmlFor="comments">
                      Comments <span className="ct-star">*</span>
                    </label>
                    <textarea
                      id="comments"
                      name="comments"
                      rows="6"
                      maxLength={MAX_COMMENTS}
                      value={values.comments}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(err("comments"))}
                      aria-describedby={err("comments") ? "comments-error" : undefined}
                    />
                    {err("comments") && (
                      <p className="ct-error" id="comments-error" role="alert">
                        {err("comments")}
                      </p>
                    )}
                    <p className="ct-counter">
                      {values.comments.length} / {MAX_COMMENTS}
                    </p>
                  </div>

                  {sendError && (
                    <p className="ct-error ct-send-error" role="alert">
                      {sendError}
                    </p>
                  )}

                  <button type="submit" className="ct-btn solid" disabled={sending}>
                    {sending ? (
                      <>
                        <span className="ct-spinner" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </form>
              </>
            )}
          </section>

          {/* ---------- Details ---------- */}
          <aside className="ct-aside" aria-label="Other ways to reach us">
            <h2>Other ways to reach us</h2>

            <ul>
              {details.map((d) => (
                <li className="ct-detail" key={d.title}>
                  <span className="ct-detail-icon">
                    <Icon name={d.icon} />
                  </span>
                  <div>
                    <h3>{d.title}</h3>
                    {d.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ContactUs;