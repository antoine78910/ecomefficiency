import { ProExtensionGuard } from '@/components/ProExtensionGuard'

/** Guard for tools.ecomefficiency.com/pro — closes AdsPower after 3s without extension. */
export default function ToolsProShellPage() {
  const adspowerApiKey = process.env.ADSPOWER_API_KEY || process.env.NEXT_PUBLIC_ADSPOWER_API_KEY
  return <ProExtensionGuard adspowerApiKey={adspowerApiKey} />
}
