import React, { useState } from "react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import "./ServiceAgreement.css";

const PLACEHOLDER =
  "Add your agreement text for this section here. It should be written or reviewed by your bank's legal team before you publish it.";

/* ---------- Agreement content (edit this) ---------- */
const sections = [
  {
    id: "s1",
    title: "General Description of This Agreement",
    topics: [
      { title: "What This Agreement Covers" },
      { title: "Accepting the Agreement" },
      { title: "Relation to Other Agreements" },
    ],
  },
  {
    id: "s2",
    title: "Transfer Services",
    topics: [
      {
        title: "Transfers Between Your Own Accounts",
        table: {
          head: ["Transfer From", "Transfer To", "Limit", "Cutoff Time"],
          rows: [
            ["Checking / Savings", "Checking / Savings", "—", "—"],
            ["Checking / Savings", "Loan account", "—", "—"],
            ["Credit card", "Checking / Savings", "—", "—"],
          ],
        },
      },
      { title: "Transfers to Other Customers" },
      { title: "Payments From External Accounts" },
    ],
  },
  {
    id: "s3",
    title: "Bill Payment Services",
    topics: [
      { title: "Setting Up Payments" },
      { title: "E-Bills" },
      { title: "Limits" },
      { title: "Canceling Payments" },
      { title: "Fees" },
    ],
  },
  {
    id: "s4",
    title: "Person-to-Person Payments",
    topics: [
      { title: "Description of Service" },
      { title: "Eligibility and Enrollment" },
      { title: "Sending and Receiving Money" },
      { title: "Limits" },
      { title: "Fees" },
    ],
  },
  {
    id: "s5",
    title: "ACH and Wire Transfers",
    topics: [
      { title: "Security Procedures" },
      { title: "Types of Transfers" },
      { title: "Canceling Transfers" },
      { title: "Liability" },
    ],
  },
  {
    id: "s6",
    title: "Online Banking Alerts",
    topics: [{ title: "General Information" }, { title: "Text Message Alerts" }],
  },
  {
    id: "s7",
    title: "Error Resolution Procedures",
    topics: [
      { title: "Errors or Questions About Your Transactions" },
      { title: "Unauthorized Transactions" },
      { title: "Our Liability" },
    ],
  },
  {
    id: "s8",
    title: "Additional Terms for Business Accounts",
    topics: [
      { title: "Protecting Passwords" },
      { title: "Security Procedures" },
      { title: "Limitation of the Bank's Liability" },
    ],
  },
  {
    id: "s9",
    title: "Disclaimer of Warranties, Limitation of Liability and Indemnification",
    topics: [
      { title: "Disclaimer of Warranties" },
      { title: "Limitation of Liability" },
      { title: "Indemnification" },
    ],
  },
  {
    id: "s10",
    title: "Other Terms and Conditions",
    topics: [
      { title: "Service Charges" },
      { title: "Service Hours" },
      { title: "Changes to This Agreement" },
      { title: "Cancellation" },
      { title: "Electronic Communications" },
    ],
  },
  {
    id: "s11",
    title: "Disputes and Arbitration",
    topics: [],
  },
];

const letter = (i) => String.fromCharCode(65 + i);

/* ---------- Page ---------- */
const ServiceAgreement = () => {
  const [open, setOpen] = useState({});

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const setAll = (value) =>
    setOpen(
      Object.fromEntries(
        sections.filter((s) => s.topics.length > 0).map((s) => [s.id, value])
      )
    );

  return (
    <div>
      <Navbar />

      <main className="agreement">
        <h1>Online Banking Service Agreement</h1>

        <a href="/" className="back-link">
          ‹‹ Go to Online Banking Overview
        </a>

        <h2>KinvestBank Online Banking Service Agreement</h2>
        {/* ---------- Table of contents ---------- */}
        <nav className="toc" aria-label="Table of contents">
          <div className="toc-head">
            <strong>Table of Contents:</strong>
            <button type="button" onClick={() => setAll(true)}>
              Show all topics
            </button>
            <span aria-hidden="true">|</span>
            <button type="button" onClick={() => setAll(false)}>
              Hide all topics
            </button>
          </div>

          <ol className="toc-list">
            {sections.map((s, i) => (
              <li key={s.id}>
                <div className="toc-row">
                  {s.topics.length > 0 ? (
                    <button
                      type="button"
                      className="toc-toggle"
                      aria-expanded={!!open[s.id]}
                      aria-label={`${open[s.id] ? "Hide" : "Show"} topics for section ${i + 1}`}
                      onClick={() => toggle(s.id)}
                    >
                      {open[s.id] ? "−" : "+"}
                    </button>
                  ) : (
                    <span className="toc-spacer" />
                  )}
                  <a href={`#${s.id}`}>
                    {i + 1}. {s.title}
                  </a>
                </div>

                {open[s.id] && (
                  <ul className="toc-topics">
                    {s.topics.map((t, j) => (
                      <li key={t.title}>
                        <a href={`#${s.id}-${j}`}>
                          {letter(j)}. {t.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* ---------- Agreement body ---------- */}
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="agreement-section">
            <h3>
              {i + 1}. {s.title}
            </h3>

            {s.topics.length === 0 && <p>{PLACEHOLDER}</p>}

            {s.topics.map((t, j) => (
              <div key={t.title} id={`${s.id}-${j}`} className="topic">
                <h4>
                  {letter(j)}. {t.title}
                </h4>

                {(t.body || [PLACEHOLDER]).map((p, k) => (
                  <p key={k}>{p}</p>
                ))}

                {t.table && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {t.table.head.map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.table.rows.map((row, r) => (
                          <tr key={r}>
                            {row.map((cell, c) => (
                              <td key={c}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

        <a href="#top" className="to-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          ↑ Back to top
        </a>
      </main>

      <Footer />
    </div>
  );
};

export default ServiceAgreement;