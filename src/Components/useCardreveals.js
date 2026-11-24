import { useCallback, useEffect, useState } from "react";

export const REVEAL_SECONDS = 30;

const useCardReveal = (seconds = REVEAL_SECONDS) => {
  const [expiresAt, setExpiresAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const revealed = expiresAt !== null;
  const remaining = revealed ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;

  // count down, and hide when the time is up
  useEffect(() => {
    if (expiresAt === null) return undefined;

    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= expiresAt) setExpiresAt(null);
    }, 250);

    return () => clearInterval(id);
  }, [expiresAt]);

  // hide straight away if the person leaves the tab or app
  useEffect(() => {
    if (!revealed) return undefined;

    const onVisibility = () => {
      if (document.hidden) setExpiresAt(null);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [revealed]);

  const reveal = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setExpiresAt(t + seconds * 1000);
  }, [seconds]);

  const hide = useCallback(() => setExpiresAt(null), []);

  return { revealed, remaining, reveal, hide };
};

export default useCardReveal;