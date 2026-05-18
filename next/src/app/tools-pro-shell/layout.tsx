import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ecom Efficiency',
  robots: { index: false, follow: false },
}

export default function ToolsProShellLayout({ children }: { children: React.ReactNode }) {
  return children
}
