import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { useCurrentUser, useMyTransactions } from "../Components/userStore";
import "./Search.css";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </>
  ),
  bag: (
    <>
      <path d="M6 7h12l1 13H5L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9.5v5l4.5-2.5-4.5-2.5z" />
    </>
  ),
  transfer: <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  cart: (
    <>
      <path d="M3 4h2l2.5 11h10L20 7H6.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
};

const Icon = ({ name, className = "sr-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

const formatAmount = (n) => {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `- $${abs}` : `$${abs}`;
};

/* ---------- Helpers ---------- */
const normalize = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// wraps the matching part of a text in <mark>
const Highlight = ({ text, query }) => {
  const q = query.trim();
  if (!q) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "i"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

/* ---------- Page ---------- */
const Search = () => {
  const account = useCurrentUser();
  // only this customer's own transactions: an empty list for a new customer
  const transactions = useMyTransactions();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  // put the cursor in the search box when the page opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return transactions;

    return transactions.filter((t) => {
      const haystack = normalize(`${t.name} ${t.category} ${formatAmount(t.amount)} ${Math.abs(t.amount)}`);
      return haystack.includes(q);
    });
  }, [query, transactions]);

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && query) {
      e.preventDefault();
      clear();
    }
  };

  const hasQuery = query.trim().length > 0;
  const hasAny = transactions.length > 0;

  return (
    <div className="sr-page">
      <div className="sr">
        {/* ---------- Header + search box ---------- */}
        <div className="sr-top">
          <header className="sr-header">
            <Link to="/homeprofile" className="sr-round-btn" aria-label="Back">
              <Icon name="back" />
            </Link>

            <h1>Search</h1>

            <Link to="/homeprofile" className="sr-round-btn" aria-label="Close search">
              <Icon name="close" />
            </Link>
          </header>

          <form className="sr-box" role="search" onSubmit={(e) => e.preventDefault()}>
            <Icon name="search" className="sr-box-icon" />

            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Search"
              autoComplete="off"
              spellCheck="false"
              aria-label="Search transactions"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {query && (
              <button
                type="button"
                className="sr-clear"
                aria-label="Clear search"
                onClick={clear}
              >
                <Icon name="close" />
              </button>
            )}
          </form>
        </div>

        {/* ---------- Results ---------- */}
        <div className="sr-body">
          {/* read out by screen readers when the number of results changes */}
          <p className="sr-live" role="status" aria-live="polite">
            {hasQuery ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}
          </p>

          {!hasAny ? (
            <div className="sr-empty">
              <span className="sr-empty-icon">
                <Icon name="search" />
              </span>
              <h2>No transactions yet</h2>
              <p>Your transactions will show here once you send or receive money.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="sr-empty">
              <span className="sr-empty-icon">
                <Icon name="search" />
              </span>
              <h2>No results</h2>
              <p>
                We couldn't find anything for “{query.trim()}”. Check the spelling or try a
                different word.
              </p>
            </div>
          ) : (
            <ul className="sr-list">
              {results.map((t) => (
                <li className="sr-tx" key={t.id}>
                  <span className={`sr-tx-icon ${t.tone || "plain"}`}>
                    <Icon name={paths[t.icon] ? t.icon : t.amount > 0 ? "down" : "up"} />
                  </span>

                  <div className="sr-tx-info">
                    <strong>
                      <Highlight text={t.name} query={query} />
                    </strong>
                    <small>
                      <Highlight text={t.category} query={query} />
                    </small>
                  </div>

                  <span className="sr-tx-amount">
                    <Highlight text={formatAmount(t.amount)} query={query} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;