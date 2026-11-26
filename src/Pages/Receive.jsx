import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import "./Receive.css";
import { ACCOUNT } from "../Components/transferData";
import { fullName, useCurrentUser } from "../Components/userStore";

const NOTE = "Transfers from other Kinqora accounts usually arrive within minutes.";

const rowsFor = (who) => [
  { key: "holder", label: "Account name", value: who.holder },
  { key: "number", label: "Account number", value: who.accountNumber, mono: true },
  { key: "bank", label: "Bank", value: ACCOUNT.bank },
  { key: "type", label: "Account type", value: who.accountType },
];

const Receive = () => {
  const account = useCurrentUser();
  const [copiedKey, setCopiedKey] = useState("");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // keep this page for logged-in customers only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  // the customer's own details
  const who = {
    holder: fullName(account),
    accountNumber: account.accountNumber,
    accountType: account.accountType,
  };
  const rows = rowsFor(who);

  const flash = (key) => {
    setCopiedKey(key);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiedKey(""), 2000);
  };

  const copy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      flash(key);
    } catch {
      /* clipboard blocked by the browser, ignore */
    }
  };

  const share = async () => {
    const text = [
      `Send money to ${who.holder} (${ACCOUNT.bank})`,
      ...rows.map((r) => `${r.label}: ${r.value}`),
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "My account details", text });
      } else {
        await navigator.clipboard.writeText(text);
        flash("all");
      }
    } catch {
      /* the person closed the share box, ignore */
    }
  };

  return (
    <div className="rc-page">
      <div className="rc">
        <div className="rc-body">
          <header className="rc-header">
            <Link to="/homeprofile" className="rc-round-btn" aria-label="Back">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </Link>
            <h1>Receive Money</h1>
            <span aria-hidden="true" />
          </header>

          <p className="rc-intro">Share these details so people can send money to your account.</p>

          <dl className="rc-card">
            {rows.map((r) => (
              <div className="rc-row" key={r.key}>
                <div>
                  <dt>{r.label}</dt>
                  <dd className={r.mono ? "mono" : ""}>{r.value}</dd>
                </div>

                <button
                  type="button"
                  className={`rc-copy ${copiedKey === r.key ? "copied" : ""}`}
                  onClick={() => copy(r.key, r.value)}
                  aria-label={`Copy ${r.label}`}
                >
                  {copiedKey === r.key ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </dl>

          <button type="button" className="rc-share" onClick={share}>
            {copiedKey === "all" ? "Details copied" : "Share details"}
          </button>

          <p className="rc-note">{NOTE}</p>

          <div className="rc-safe">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <p>
              These details let people send money <strong>to</strong> you. Never share your
              password, PIN or one-time codes with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receive;