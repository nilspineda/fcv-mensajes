export function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n')
  return lines.map(line => parseCSVLine(line))
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        result.push('"')
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  result.push(current.trim())
  return result
}

export function csvToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      obj[header] = row[i] || ''
    })
    return obj
  })
}

export function extractSheetId(urlOrId: string): string {
  const url = urlOrId.trim()
  
  if (url.includes('/spreadsheets/d/')) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) return match[1]
  }
  
  if (url.includes('docs.google.com/spreadsheets/')) {
    const parts = url.split('/')
    const dIndex = parts.indexOf('d')
    if (dIndex >= 0 && parts[dIndex + 1]) {
      return parts[dIndex + 1]
    }
  }
  
  return url
}