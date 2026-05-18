import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(root, 'next/src/app/pro/page.tsx'), 'utf8')
const v = '20260502-freepik-v1'
const base = 'https://tools.ecomefficiency.com'

const styleMatch = src.match(/<style>\{\`([\s\S]*?)\`\}<\/style>/)
const css = styleMatch ? styleMatch[1] : ''

const extraCss = `
*, *::before, *::after { box-sizing: border-box; }
.relative { position: relative; }
.overflow-hidden { overflow: hidden; }
.text-center { text-align: center; }
.mt-8 { margin-top: 2rem; }
.z-10 { z-index: 10; }
`

const start = src.indexOf('<div className="relative overflow-hidden">')
const end = src.indexOf('\n      </motion>\n    </>', start)
const endDiv = src.indexOf('\n      </div>\n    </>', start)
let bodyHtml = src.slice(start, endDiv + '\n      </div>'.length)

function toHtml(jsx) {
  return jsx
    .replace(/className=/g, 'class=')
    .replace(/src=\{\`\/tools-images\/([^`?]+)(?:\?v=\$\{ASSET_VERSION\})?\`\}/g, (_, file) =>
      `src="${base}/tools-images/${file}?v=${v}"`
    )
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

bodyHtml = toHtml(bodyHtml)

const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ecom Efficiency Tools</title>
  <style>${css}${extraCss}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`

const outPath = path.join(root, 'Ecom Efficiency style/pro_tools_page.html')
fs.writeFileSync(outPath, finalHtml)
console.log('Wrote', outPath, 'cards:', (bodyHtml.match(/<a href/g) || []).length)
