import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import "./Terms.css";

/* ---------- Content (replace with your real terms, reviewed by your legal team) ---------- */
const LAST_UPDATED = "[September 8, 2023]";

const clauses = [
  {
    id: "1.1",
    text: "Thank you for visiting the KinvestBank application and for choosing to bank with us. By creating an account or using the application, you agree to these Terms and Conditions and to our Privacy Policy.",
  },
  {
    id: "1.2",
    text: "Your privacy is important to us. This notice explains what information we collect, how we collect it and how we use it. We collect information that you give us when you register, information created when you use our services, and information we receive from other sources where the law allows. We use it to provide and improve our services, to keep your accounts secure and to meet our legal duties.",
  },
  {
    id: "1.3",
    text: "To use our services you must register and verify your identity and your device. You are responsible for keeping your login details, passwords and one-time codes private. Please tell us straight away if you think someone else has used them.",
  },
  {
    id: "1.4",
    text: "We protect your information with industry-standard security measures. We will never ask you for your full password, PIN or one-time code by email, text message or phone call.",
  },
  {
    id: "1.5",
    text: "We only share your information with other companies where this is needed to provide a service you asked for, where the law requires it, or where you have given your permission. We do not sell your personal information.",
  },
  {
    id: "1.6",
    text: "This Privacy Policy applies to the information we collect through this application. It does not apply to the practices of other businesses that we do not own or control, or to people we do not employ.",
  },
  {
    id: "1.7",
    text: "We may update these terms from time to time. When we make an important change, we will tell you in the application or by email. If you keep using the application after a change takes effect, you agree to the updated terms.",
  },
  {
    id: "1.8",
    text: "If you have any questions about these terms or about your information, please contact us through the Contact Us page, and our team will be glad to help.",
  },
  {
    id: "1.9",
    text: "By using this application, you agree to the terms of this Privacy Policy.",
  },
];

/* ---------- Page ---------- */
const Terms = () => {
  const navigate = useNavigate();

  // start at the top of the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // go back to the page the person came from, or to the home page if there isn't one
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="tc-page">
      <div className="tc">
        <div className="tc-body">
          {/* ---------- Header ---------- */}
          <header className="tc-header">
            <button type="button" className="tc-round-btn" aria-label="Back" onClick={goBack}>
              <svg className="tc-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <h1>Terms &amp; Conditions</h1>
            <span aria-hidden="true" />
          </header>

          {/* ---------- Text ---------- */}
          <article className="tc-text" aria-label="Terms and Conditions">
            <p className="tc-updated">Last updated: {LAST_UPDATED}</p>

            {clauses.map((c) => (
              <p key={c.id}>
                <span className="tc-num">{c.id}</span> {c.text}
              </p>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
};

export default Terms;