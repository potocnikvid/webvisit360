"use client";

import { useEffect } from "react";
import { rememberSource } from "@/lib/attribution";

/** Notes where the visit came from on its first page (see lib/attribution). */
export default function RememberSource() {
  useEffect(rememberSource, []);
  return null;
}
