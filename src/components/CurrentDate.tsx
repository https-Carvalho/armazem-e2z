"use client";

import { useEffect, useState } from "react";

export default function CurrentDate() {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDateStr(
        new Date().toLocaleDateString("pt-PT", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  if (!dateStr) return <p className="text-sm text-slate-500">A carregar data...</p>;

  return <p className="text-sm text-slate-500 capitalize">{dateStr}</p>;
}
