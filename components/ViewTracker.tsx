"use client";

import { useEffect } from "react";

export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    const key = `vista_${listingId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/anuncios/${listingId}`, { method: "POST" }).catch(() => {});
  }, [listingId]);

  return null;
}
