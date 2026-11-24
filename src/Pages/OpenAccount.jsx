import React from "react";
import { useNavigate } from "react-router";
import "./OpenAccount.css";
import Navbar from "../Components/Navbar";
import logo from "../assets/Images/Logo.png";

import img1 from "../assets/Images/account-1.png"; // checking & savings
import img2 from "../assets/Images/account-2.png"; // credit cards
import img3 from "../assets/Images/account-3.png"; // home loans
import img4 from "../assets/Images/account-4.png"; // auto loans
import img5 from "../assets/Images/account-5.png"; // small business
import img6 from "../assets/Images/account-6.png"; // investing

const disclosures = ["Are Not FDIC Insured", "Are Not Bank Guaranteed", "May Lose Value"];

const links = ["Privacy", "Security", "Advertising Practices", "Your Privacy Choices"];

const LockIcon = () => (
  <svg className="lock-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1zm2 0h6V7a3 3 0 0 0-6 0v3z" />
  </svg>
);

const HouseIcon = () => (
  <svg className="house-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
    <path d="M9 14h6M9 17h6" />
  </svg>
);

const options = [
  { title: "Checking & Savings", image: img1, href: "/open-account/checking-savings" },
  { title: "Credit Cards", image: img2, href: "/open-account/credit-cards" },
  { title: "Home Loans", image: img3, href: "/open-account/home-loans" },
  { title: "Auto Loans", image: img4, href: "/open-account/auto-loans" },
  { title: "Small Business", image: img5, href: "/open-account/small-business" },
  { title: "Investing", image: img6, href: "/open-account/investing", tone: "gold" },
];

const OpenAccount = () => {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <>
      <Navbar />

      <section className="options">
        <button type="button" className="oa-back" onClick={goBack} aria-label="Go back">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          <span></span>
        </button>

        <div className="options-inner">
          <h2>Open an account that fits your needs</h2>
          <p className="options-sub">
            From setting up a checking or savings account to finding the right
            home loan, KinvestBank can help.
            <br />
            And for your investment needs, we offer digital tools and resources
            to help you take control of your finances.
          </p>

          <div className="options-grid">
            {options.map((o) => (
              <article className="option-card" key={o.title}>
                <img src={o.image} alt="" />

                <div className="option-panel">
                  <h3>{o.title}</h3>
                  <a
                    href={o.href}
                    className={`get-started ${o.tone === "gold" ? "gold" : ""}`}
                    aria-label={`Get started with ${o.title}`}
                  >
                    Get started
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="legal-footer">
        {/* ---------- White disclosure area ---------- */}
        <div className="legal-top">
          <p>
            Banking, credit card, auto loan, mortgage and home equity products are
            provided by KinvestBank and its affiliates. Credit and collateral are
            subject to approval. Terms and conditions apply. This is not a
            commitment to lend. Programs, rates, terms and conditions are subject
            to change without notice.
          </p>

          <p className="legal-bold">
            Investing involves risk. There is always the potential of losing money
            when you invest in securities.
          </p>

          <p>
            Brokerage services are provided by a licensed and registered
            broker-dealer that is a partner or affiliate of KinvestBank.{" "}
            <a href="#">Member SIPC</a>.
          </p>

          <p>Investment products:</p>

          <div className="legal-table" role="table" aria-label="Investment product disclosures">
            {disclosures.map((d) => (
              <div className="legal-cell" role="cell" key={d}>
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Grey footer ---------- */}
        <div className="legal-bottom">
          <p className="footnote">
            <sup>1</sup> Mobile Banking requires that you download the Mobile
            Banking app and may not be available for select mobile devices.
            Message and data rates may apply.
          </p>

          <a href="/" className="legal-logo" aria-label="KinvestBank home">
            <img src={logo} alt="KinvestBank" />
          </a>

          <ul className="legal-links">
            <li className="lock">
              <LockIcon />
            </li>
            {links.map((l) => (
              <li key={l}>
                <a href="#">{l}</a>
              </li>
            ))}
          </ul>

          <p className="legal-line">
            KinvestBank, Member FDIC.{" "}
            <a href="#">Equal Housing Lender</a> <HouseIcon />
          </p>
          <p className="legal-line">
            © {new Date().getFullYear()} KinvestBank. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
};

export default OpenAccount;