import { NextRequest, NextResponse } from 'next/server'
import { requireModule } from '@/lib/auth-helpers'
import { put } from '@vercel/blob'

/**
 * POST /api/dia-e/upload-foto
 * Sube una imagen del E-14 a Vercel Blob.
 * Solo usuarios autenticados con módulo DIA_E.
 * Body: FormData con campo "file" (imagen) y "votingTableId"
 */
export async function POST(req: NextRequest) {
  try {
    const session  = await requireModule('DIA_E')
    const tenantId = session.user.tenantId as string

    const formData      = await req.formData()
    const file           = formData.get('file') as File | null
    const votingTableId  = formData.get('votingTableId') as string

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Archivo requerido.' }, { status: 400 })
    }

    if (!votingTableId) {
      return NextResponse.json({ error: 'votingTableId requerido.' }, { status: 400 })
    }

    const timestamp = Date.now()
    const blob = await put(
      `dia-e/${tenantId}/${votingTableId}/${timestamp}.jpg`,
      file,
      { access: 'public' },
    )

    return NextResponse.json({ success: true, url: blob.url })
  } catch (err) {
    console.error('[POST /api/dia-e/upload-foto]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Error al subir la imagen.' }, { status: 500 })
  }
}
