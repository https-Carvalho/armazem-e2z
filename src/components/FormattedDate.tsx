"use client";

import { useEffect, useState } from "react";

interface Props {
  iso: string;
  showTime?: boolean;
}

export default function FormattedDate({ iso, showTime = false }: Props) {
  const [display, setDisplay] = useState<{ data: string; hora: string } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const d = new Date(iso);
      setDisplay({
        data: d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }),
        hora: d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
      });
    }, 0);

    return () => window.clearTimeout(id);
  }, [iso]);

  if (!display) return <span className="text-sm text-slate-400">...</span>;

  return (
    <span>
      <span className="font-medium text-slate-900">{display.data}</span>
      {showTime && <span className="ml-2 text-xs text-slate-400">{display.hora}</span>}
    </span>
  );
}
