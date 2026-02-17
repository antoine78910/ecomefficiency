"use client"

import React from "react"
import AdminAttributionClient from "@/components/AdminAttributionClient"

export default function AdminAttributionPage() {
  // Auth is enforced by middleware + API (token via cookie or ?token=...).
  return <AdminAttributionClient />
}

