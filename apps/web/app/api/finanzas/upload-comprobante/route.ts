import { NextRequest, NextResponse } from 'next/server'
import { requireModule } from '@/lib/auth-helpers'
import { put } from '@vercel/blob'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * POST /api/finanzas/upload-comprobante
 * Sube un comprobante (imagen o PDF) a Vercel Blob.
 * Body: FormData con campo "file"
 * Solo ADMIN_CAMPANA y COORDINADOR con módulo FINANZAS.
 */
export async function POST(req: NextRequest) {
  try {
    const session  = await requireModule('FINANZAS', ['ADMIN_CAMPANA', 'COORDINADOR'])
    const tenantId = session.user.tenantId as string

    const formData = await req.formData()
    const file     = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Archivo requerido.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo JPEG, PNG o PDF.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo supera el tamaño máximo de 5MB.' },
        { status: 400 },
      )
    }

    const ext       = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'
    const timestamp = Date.now()
    const blob = await put(
      `finanzas/${tenantId}/comprobantes/${timestamp}.${ext}`,
      file,
      { access: 'public' },
    )

    return NextResponse.json({ success: true, url: blob.url })
  } catch (err) {
    console.error('[POST /api/finanzas/upload-comprobante]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Error al subir el comprobante.' }, { status: 500 })
  }
}
