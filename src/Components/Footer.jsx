import "./Footer.css";
import { Link } from "react-router";

const disclosures = [
  "Are Not FDIC Insured",
  "Are Not Bank Guaranteed",
  "May Lose Value",
  "Are Not Deposits",
  "Are Not Insured by Any Federal Government Agency",
  "Are Not a Condition to Any Banking Service or Activity",
];

const linksRow1 = [
  { label: "Contact Us", to: "/contact" },
  { label: "Accessible Banking", to: "/accessible-banking" },
  { label: "Privacy", to: "/privacy" },
  { label: "Security", to: "/security" },
];

const linksRow2 = [
  
];

const Footer = () => {
  return (
    <footer className="footer">
      {/* ---------- Disclosures ---------- */}
      <div className="disclosure">
        <p className="disc-intro">Investment and insurance products:</p>

        <div className="disc-table">
          {disclosures.map((d) => (
            <div className="disc-cell" key={d}>
              {d}
            </div>
          ))}
        </div>

        <Link to="/service-agreement" className="disc-link">
          Online Banking Service Agreement
        </Link>

        <p>
          Investing in securities involves risks, and there is always the
          potential of losing money when you invest in securities. You should
          review any planned financial transactions that may have tax or legal
          implications with your personal tax or legal advisor.
        </p>
        <p>
          Investment products are provided by licensed partners and affiliates
          of Kinqora. Product availability, terms and conditions are subject
          to change without notice.
        </p>
        <p>
          Insurance products are offered through licensed insurance agencies
          that are partners or affiliates of Kinqora.
        </p>
        <p>
          Banking, credit card, auto loan, mortgage and home equity products are
          provided by Kinqora. Credit and collateral are subject to
          approval. Terms and conditions apply. This is not a commitment to
          lend. Programs, rates, terms and conditions are subject to change
          without notice.
        </p>
      </div>

      {/* ---------- Navy link bar ---------- */}
      <div className="footer-bar">
        <ul className="footer-links">
          {linksRow1.map((l) => (
            <li key={l.label}>
              {l.to === "/contact" ? (
                <Link to={l.to}>{l.label}</Link>
              ) : (
                <span>{l.label}</span>
              )}
            </li>
          ))}
        </ul>

        <ul className="footer-links">
          {linksRow2.map((l) => (
            <li key={l}>
              <a href="#">{l}</a>
            </li>
          ))}
        </ul>

        <div className="footer-legal">
          <p>
            Kinqora is licensed and regulated by [Federal Reserve Board].{" "}
            <a href="#">Equal Opportunity Lender</a> · License No. [ 3998020]
          </p>
          <p>© {new Date().getFullYear()} Kinqora. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;