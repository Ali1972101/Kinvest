import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import "./Navbar.css";
import logo from "../assets/Images/Logo.png";

// links with a "to" open a real page; the others are placeholders for now
const links = [
  { label: "Personal", to: "/", home: true },
   { label: "Business", to: "/business" },
 { label: "Loans", to: "/loans" },
  // { label: "Digital banking" },
  { label: "Contact us", to: "/contact" },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("Personal");
  const [query, setQuery] = useState("");
  const { pathname } = useLocation();

  const handleSearch = (e) => {
    e.preventDefault();
    // connect to your search here
    console.log("Search:", query);
  };

  return (
    <header
      className={`navbar ${pathname === "/" ? "navbar-home" : "navbar-other"}${pathname === "/signup" ? " navbar-signup" : ""}${pathname === "/loans/apply" ? " navbar-loan-apply" : ""}${pathname === "/loan" || pathname === "/loans" ? " navbar-loan" : ""}${pathname === "/business" ? " navbar-business" : ""}${pathname === "/recover" ? " navbar-recover" : ""}`}
    >
      <Link to="/" className="logo" aria-label="KinvestBank home">
        <img src={logo} alt="KinvestBank" />
      </Link>

      <ul className={`nav-links ${menuOpen ? "show" : ""}`}>
        {links.map((item) => (
          <li key={item.label}>
            {item.home ? (
              // "Personal" takes you back to the home page
              <Link
                to={item.to}
                className={pathname === "/" && active === item.label ? "active" : ""}
                onClick={() => {
                  setActive(item.label);
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </Link>
            ) : item.to ? (
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ) : (
              <a
                href="#"
                className={pathname === "/" && active === item.label ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(item.label);
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>

      <form className="search" role="search" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search"
          aria-label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" aria-label="Submit search">
          <svg viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="7" />
            <line x1="15.5" y1="15.5" x2="22" y2="22" />
          </svg>
        </button>
      </form>

      <button
        className={`menu-toggle ${menuOpen ? "open" : ""}`}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
};

export default Navbar;