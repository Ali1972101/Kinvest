import React from "react";
import { Link, Navigate } from "react-router";
import { fullName, useAvatar, useCurrentUser } from "../Components/userStore";
import "./Profile.css";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  editUser: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20c.4-3.4 3.1-6 6.5-6 1.2 0 2.3.3 3.2.9" />
      <path d="M14.5 20.5l.6-2.6 5-5a1.4 1.4 0 0 1 2 2l-5 5-2.6.6z" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.3 18.2c1.2-2 3.4-3.2 5.7-3.2s4.5 1.2 5.7 3.2" />
    </>
  ),
  payment: (
    <>
      <rect x="3" y="8" width="15" height="10" rx="2" />
      <path d="M6 8V6.5A1.5 1.5 0 0 1 7.5 5H20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2" />
    </>
  ),
  bankCard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

const Icon = ({ name, className = "pf-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* ---------- Page ---------- */
const Profile = () => {
  const account = useCurrentUser();
  const photo = useAvatar(); // the saved picture, or "" when there isn't one

  // keep this page for logged-in customers only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  // everything here comes from the details the customer gave when they signed up
  const user = {
    name: fullName(account),
    role: account.accountType || "KinvestBank customer",
    avatar: photo,
  };

  const menu = [
    { label: "Personal Information", icon: "person", to: "/profile/personal" },
    // { label: "Payment Preferences", icon: "payment", to: "/profile/payment" },
    { label: "Banks and Cards", icon: "bankCard", to: "/my-cards" },
    { label: "Settings", icon: "settings", to: "/settings" },
  ];

  return (
    <div className="pf-page">
      <div className="pf">
        {/* ---------- Header ---------- */}
        <header className="pf-header">
          <Link to="/settings" className="pf-round-btn" aria-label="Back">
            <Icon name="back" />
          </Link>

          <h1>Profile</h1>

          <Link to="/profile/personal" className="pf-round-btn" aria-label="Edit profile">
            <Icon name="editUser" />
          </Link>
        </header>

        {/* ---------- Identity ---------- */}
        <section className="pf-identity" aria-label="Your details">
          <div className="pf-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              <span>{initials(user.name)}</span>
            )}
          </div>

          <div>
            <h2>{user.name}</h2>
            <p>{user.role}</p>
          </div>
        </section>

        {/* ---------- Menu ---------- */}
        <nav aria-label="Profile menu">
          <ul className="pf-menu">
            {menu.map((item) => (
              <li key={item.label}>
                <Link to={item.to} className="pf-row">
                  <Icon name={item.icon} className="pf-row-icon" />
                  <span className="pf-row-label">{item.label}</span>
                  <Icon name="chevron" className="pf-chevron" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Profile;