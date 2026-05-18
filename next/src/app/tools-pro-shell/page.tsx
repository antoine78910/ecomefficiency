import { ProExtensionGuard } from '@/components/ProExtensionGuard'

/** Guard for tools.ecomefficiency.com/pro — closes AdsPower after 3s without extension. */
export default function ToolsProShellPage() {
  const adspowerApiKey = process.env.ADSPOWER_API_KEY || process.env.NEXT_PUBLIC_ADSPOWER_API_KEY
  const adspowerProfileId =
    process.env.ADSPOWER_PROFILE_ID || process.env.NEXT_PUBLIC_ADSPOWER_PROFILE_ID || 'k14q9qo9'
  return (
    <ProExtensionGuard adspowerApiKey={adspowerApiKey} adspowerProfileId={adspowerProfileId} />
  )
}
