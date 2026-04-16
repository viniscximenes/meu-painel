import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  // Informações seguras — nunca retorna chaves ou valores sensíveis completos
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const serviceEmail  = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ''
  const privateKey    = process.env.GOOGLE_PRIVATE_KEY ?? ''

  const debug = {
    spreadsheetId: spreadsheetId
      ? `${spreadsheetId.slice(0, 8)}…${spreadsheetId.slice(-4)}`
      : '(não definido)',
    serviceEmailInicio: serviceEmail
      ? `${serviceEmail.slice(0, 10)}…`
      : '(não definido)',
    privateKeyPresente: privateKey.length > 0,
    privateKeyTemHeader: privateKey.includes('BEGIN PRIVATE KEY'),
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title',
    })

    return NextResponse.json({
      ok: true,
      ...debug,
      planilhaTitulo: meta.data.properties?.title,
      abas: meta.data.sheets?.map((s) => s.properties?.title) ?? [],
    })
  } catch (err: unknown) {
    const e = err as { message?: string; code?: number; status?: string }

    // Sanitiza a mensagem para não vazar tokens ou chaves
    const msgSanitizada = (e?.message ?? 'erro desconhecido')
      .replace(/key[^,}\s]*/gi, '[REDACTED]')
      .replace(/token[^,}\s]*/gi, '[REDACTED]')
      .replace(/-----[^-]+-----/g, '[REDACTED]')

    return NextResponse.json({
      ok: false,
      ...debug,
      erro: {
        mensagem: msgSanitizada,
        codigo: e?.code,
        status: e?.status,
      },
    }, { status: 500 })
  }
}
