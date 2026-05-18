import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ecom Efficiency',
  robots: { index: false, follow: false },
}

/** Empty shell for tools.ecomefficiency.com/pro — UI is injected by the extension only. */
export default function ToolsProShellPage() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: 'html,body{margin:0;padding:0;min-height:100vh;background:#fff}',
      }}
    />
  )
}
