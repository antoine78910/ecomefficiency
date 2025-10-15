export default function TestElevenLabs() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test ElevenLabs Reverse Proxy</h1>
      <div className="space-y-4">
        <p>If you can see this page, the Next.js app is working.</p>
        <a 
          href="/elevenlabs/app/sign-in" 
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test ElevenLabs Reverse Proxy
        </a>
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Direct ElevenLabs URL:</h2>
          <a 
            href="https://elevenlabs.io/app/sign-in" 
            target="_blank"
            className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Open Original ElevenLabs
          </a>
        </div>
      </div>
    </div>
  )
}
