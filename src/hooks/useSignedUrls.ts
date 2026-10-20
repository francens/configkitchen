"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Bucket = "materials" | "attachments" | "renders";

/** Risolve percorsi di storage in URL firmati (1 ora), ricalcolando solo quando cambiano i percorsi. */
export function useSignedUrls(requests: { bucket: Bucket; paths: string[] }[]) {
  const key = useMemo(
    () => requests.map((r) => `${r.bucket}:${[...new Set(r.paths)].sort().join(",")}`).join("|"),
    [requests],
  );
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const out: Record<string, string> = {};
      for (const r of requests) {
        const paths = [...new Set(r.paths)].filter(Boolean);
        if (paths.length === 0) continue;
        const { data } = await supabase.storage.from(r.bucket).createSignedUrls(paths, 3600);
        for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
      }
      if (!cancelled) setUrls(out);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
