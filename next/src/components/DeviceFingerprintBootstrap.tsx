"use client";

import { useEffect } from "react";
import { collectDeviceFingerprint } from "@/lib/deviceFingerprint";

/** Warms fingerprint cache early on authenticated app surfaces. */
export default function DeviceFingerprintBootstrap() {
  useEffect(() => {
    void collectDeviceFingerprint();
  }, []);
  return null;
}
