"use client";
import { useEffect } from "react";
import { startProbes } from "@/lib/probe-store";

export function ProbeRunner() {
  useEffect(() => {
    startProbes();
  }, []);
  return null;
}
