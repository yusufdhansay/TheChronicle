"use client";

import { useEffect, useState } from "react";

/**
 * Thin secondary-coloured progress bar fixed to the top of the
 * viewport. Tracks how far the reader has scrolled through the page.
 */
export default function ScrollProgress() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    function onScroll() {
      const h = document.documentElement;
      const b = document.body;
      const st = h.scrollTop || b.scrollTop;
      const sh = (h.scrollHeight || b.scrollHeight) - h.clientHeight;
      setWidth(sh > 0 ? (st / sh) * 100 : 0);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-[60] h-1 bg-secondary transition-all duration-150"
      style={{ width: `${width}%` }}
    />
  );
}
