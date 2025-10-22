export interface ParsedUserAgent {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  deviceModel?: string
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
      device: 'Unknown'
    }
  }

  const result: ParsedUserAgent = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
    device: 'Desktop'
  }

  // Detect Device Type
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    result.device = 'Tablet'
  } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    result.device = 'Mobile'
  }

  // Detect OS
  if (/Windows NT 10.0/.test(ua)) {
    result.os = 'Windows'
    result.osVersion = '10/11'
  } else if (/Windows NT 6.3/.test(ua)) {
    result.os = 'Windows'
    result.osVersion = '8.1'
  } else if (/Windows NT 6.2/.test(ua)) {
    result.os = 'Windows'
    result.osVersion = '8'
  } else if (/Windows NT 6.1/.test(ua)) {
    result.os = 'Windows'
    result.osVersion = '7'
  } else if (/Windows/.test(ua)) {
    result.os = 'Windows'
  } else if (/Mac OS X ([\d_]+)/.test(ua)) {
    result.os = 'macOS'
    const match = ua.match(/Mac OS X ([\d_]+)/)
    if (match) {
      result.osVersion = match[1].replace(/_/g, '.')
    }
  } else if (/iPhone OS ([\d_]+)/.test(ua)) {
    result.os = 'iOS'
    const match = ua.match(/iPhone OS ([\d_]+)/)
    if (match) {
      result.osVersion = match[1].replace(/_/g, '.')
    }
  } else if (/iPad.*OS ([\d_]+)/.test(ua)) {
    result.os = 'iPadOS'
    const match = ua.match(/OS ([\d_]+)/)
    if (match) {
      result.osVersion = match[1].replace(/_/g, '.')
    }
  } else if (/Android ([\d.]+)/.test(ua)) {
    result.os = 'Android'
    const match = ua.match(/Android ([\d.]+)/)
    if (match) {
      result.osVersion = match[1]
    }
  } else if (/Linux/.test(ua)) {
    result.os = 'Linux'
  } else if (/CrOS/.test(ua)) {
    result.os = 'Chrome OS'
  }

  // Detect Device Model for Mobile
  if (result.device === 'Mobile' || result.device === 'Tablet') {
    if (/iPhone/.test(ua)) {
      result.deviceModel = 'iPhone'
    } else if (/iPad/.test(ua)) {
      result.deviceModel = 'iPad'
    } else if (/Samsung/.test(ua)) {
      result.deviceModel = 'Samsung'
    } else if (/Pixel/.test(ua)) {
      result.deviceModel = 'Google Pixel'
    } else if (/Huawei/.test(ua)) {
      result.deviceModel = 'Huawei'
    } else if (/Xiaomi/.test(ua)) {
      result.deviceModel = 'Xiaomi'
    }
  }

  // Detect Browser
  if (/Edg\/(\d+)/.test(ua)) {
    result.browser = 'Edge'
    const match = ua.match(/Edg\/(\d+)/)
    if (match) result.browserVersion = match[1]
  } else if (/Chrome\/(\d+)/.test(ua) && !/Edg/.test(ua)) {
    result.browser = 'Chrome'
    const match = ua.match(/Chrome\/(\d+)/)
    if (match) result.browserVersion = match[1]
  } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua) && !/Edg/.test(ua)) {
    result.browser = 'Safari'
    const match = ua.match(/Version\/(\d+)/)
    if (match) result.browserVersion = match[1]
  } else if (/Firefox\/(\d+)/.test(ua)) {
    result.browser = 'Firefox'
    const match = ua.match(/Firefox\/(\d+)/)
    if (match) result.browserVersion = match[1]
  } else if (/Opera|OPR\/(\d+)/.test(ua)) {
    result.browser = 'Opera'
    const match = ua.match(/(?:Opera|OPR)\/(\d+)/)
    if (match) result.browserVersion = match[1]
  }

  return result
}

export function formatUserAgentShort(parsed: ParsedUserAgent): string {
  const parts: string[] = []
  
  if (parsed.device !== 'Desktop' && parsed.device !== 'Unknown') {
    parts.push(parsed.device)
    if (parsed.deviceModel) {
      parts.push(parsed.deviceModel)
    }
  }
  
  parts.push(`${parsed.os}${parsed.osVersion ? ' ' + parsed.osVersion : ''}`)
  parts.push(`${parsed.browser}${parsed.browserVersion ? ' ' + parsed.browserVersion : ''}`)
  
  return parts.join(' • ')
}

