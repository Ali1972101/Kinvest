import React, { useState } from "react";
import { Link, useSearchParams } from "react-router";
import "./LoanApply.css";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";

const TYPE_NAMES = {
  personal: "Personal loan",
  auto: "Auto loan",
  home: "Home loan",
  business: "Business loan",
  prequalify: "Prequalification",
};

const NEEDS = [
  "A valid photo ID",
  "Your contact details",
  "Details of your income and employment",
  "The amount you would like to borrow",
];

const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    <path d="M12 15v2" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12l4 4 10-10" />
  </svg>
);

const LoanApply = () => {
  const [params] = useSearchParams();
  const typeName = TYPE_NAMES[params.get("type")] || "";

  // signed in already? (the login pages set this when a customer logs in)
  const [signedIn] = useState(() => {
    try {
      return sessionStorage.getItem("kinvest_auth") === "true";
    } catch {
      return false;
    }
  });

  return (
    <div className="la">
      <Navbar />

      <main className="la-main">
        <div className="la-card">
          <span className="la-lock">
            <LockIcon />
          </span>

          {signedIn ? (
            <>
              <h1>You're signed in</h1>
              <p className="la-lead">
                You can continue to your loans in your Kinqora dashboard
                {typeName ? ` to start your ${typeName.toLowerCase()}` : ""}.
              </p>

              {typeName && <span className="la-chip">{typeName}</span>}

              <div className="la-actions">
                <Link to="/loan" className="la-btn primary">
                  Continue to my loans
                </Link>
                <Link to="/loans" className="la-btn ghost">
                  Back to loans
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1>Log in to apply</h1>
              <p className="la-lead">
                For your security, you need to be logged in to your Kinqora account to start a loan
                application.
              </p>

              {typeName && (
                <span className="la-chip">
                  You are applying for: <strong>{typeName}</strong>
                </span>
              )}

              <div className="la-actions">
                <Link to="/" className="la-btn primary">
                  Log in
                </Link>
                <Link to="/signup" className="la-btn outline">
                  Open an account
                </Link>
              </div>

              <p className="la-small">
                New to Kinqora? Open an account online, then come back to apply.
              </p>
            </>
          )}

          <div className="la-need">
            <h2>What to have ready</h2>
            <ul>
              {NEEDS.map((n) => (
                <li key={n}>
                  <CheckIcon />
                  {n}
                </li>
              ))}
            </ul>
          </div>

          <Link to="/loans" className="la-back">
             Back to loans
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoanApply;