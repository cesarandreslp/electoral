'use server'

import { revalidatePath } from 'next/cache'
import { requireModule } from '@/lib/auth-helpers'
import { getTenantDb, encrypt } from '@campaignos/db'
import { getTenantConnection } from '@/lib/tenant'
import { enviarPendientesTenant, type ResultadoEnvio } from '@/lib/encuestas/enviar-pendientes'
import { enviarPushATenant } from '@/lib/push'

/**
 * Obtiene las campañas de encuestas del tenant.
 */
export async function getSurveyCampaigns() {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  return db.surveyCampaign.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      cargos: {
        include: {
          preguntas: true,
          candidatos: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Activa/Desactiva una campaña de encuesta.
 */
export async function toggleSurveyEnabled(campaignId: string) {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const campaign = await db.surveyCampaign.findUnique({
    where: { id: campaignId, tenantId: session.user.tenantId }
  })

  if (!campaign) return { success: false, error: 'Campaña no encontrada' }

  await db.surveyCampaign.update({
    where: { id: campaignId },
    data: { isSurveyEnabled: !campaign.isSurveyEnabled }
  })

  revalidatePath('/encuestas/campanas')
  return { success: true }
}

/**
 * Crea una nueva campaña de encuesta con su estructura completa.
 */
export async function createSurveyCampaign(data: {
  name: string
  electionDate: Date
  cargos: {
    name: string
    order: number
    preguntas: {
      text: string
      order: number
      type: 'FREE_TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE'
      opciones?: string[]
    }[]
    candidatos: { name: string; code?: string }[]
  }[]
}) {
  try {
    const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA'])
    const db = getTenantDb(await getTenantConnection(session.user.tenantId))

    await db.surveyCampaign.create({
      data: {
        tenantId: session.user.tenantId,
        name: data.name,
        electionDate: data.electionDate,
        isActive: true,
        isSurveyEnabled: true,
        cargos: {
          create: data.cargos.map(cargo => ({
            name: cargo.name,
            order: cargo.order,
            preguntas: {
              create: cargo.preguntas.map(pregunta => ({
                text: pregunta.text,
                order: pregunta.order,
                type: pregunta.type,
                opciones: pregunta.type === 'SINGLE_CHOICE'
                  ? { create: (pregunta.opciones ?? []).map((text, i) => ({ text, order: i })) }
                  : undefined,
              }))
            },
            candidatos: {
              create: cargo.candidatos.map(candidato => ({
                name: candidato.name,
                code: candidato.code
              }))
            }
          }))
        }
      }
    })

    revalidatePath('/encuestas/campanas')

    // Aviso push best-effort a electores con la PWA instalada — no bloquea
    // la creación de la campaña si Web Push no está configurado o falla.
    enviarPushATenant(db, session.user.tenantId, {
      title: 'Nueva encuesta disponible',
      body: 'Revisa tu panel, hay una nueva encuesta para responder.',
      url: '/pwa/encuestas',
    }).catch((err) => console.error('[PUSH] Error al avisar nueva encuesta:', err))

    return { success: true }
  } catch (err) {
    console.error('Error creating campaign:', err)
    return { success: false, error: 'Error al crear la campaña.' }
  }
}

/**
 * Obtiene la configuración de WhatsApp y el límite diario del tenant.
 * El token NUNCA se devuelve al cliente (va cifrado en DB) — solo si está
 * configurado, igual que las claves de IA en /core/configuracion.
 */
export async function getSurveyConfig() {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const config = await db.tenantConfig.findUnique({
    where: { tenantId: session.user.tenantId },
    select: {
      whatsappSurveyEnabled: true,
      whatsappToken: true,
      whatsappPhoneId: true,
      whatsappVerifyToken: true,
      botName: true,
      surveyDailyLimit: true,
    }
  })

  return {
    whatsappSurveyEnabled: config?.whatsappSurveyEnabled ?? true,
    hasWhatsappToken:    Boolean(config?.whatsappToken),
    whatsappPhoneId:     config?.whatsappPhoneId ?? '',
    whatsappVerifyToken: config?.whatsappVerifyToken ?? '',
    botName:             config?.botName ?? 'Asistente Virtual',
    surveyDailyLimit:    config?.surveyDailyLimit ?? 250,
  }
}

/**
 * Guarda la configuración de WhatsApp y límites.
 * whatsappToken: vacío/omitido = no cambiar el que ya hay guardado (cifrado).
 */
export async function saveSurveyConfig(data: {
  whatsappSurveyEnabled: boolean
  whatsappToken?: string
  whatsappPhoneId: string
  whatsappVerifyToken: string
  botName: string
  surveyDailyLimit: number
}) {
  try {
    const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA'])
    const db = getTenantDb(await getTenantConnection(session.user.tenantId))

    const tokenCifrado = data.whatsappToken?.trim() ? encrypt(data.whatsappToken.trim()) : undefined

    await db.tenantConfig.upsert({
      where: { tenantId: session.user.tenantId },
      create: {
        tenantId: session.user.tenantId,
        whatsappSurveyEnabled: data.whatsappSurveyEnabled,
        whatsappToken: tokenCifrado,
        whatsappPhoneId: data.whatsappPhoneId,
        whatsappVerifyToken: data.whatsappVerifyToken,
        botName: data.botName,
        surveyDailyLimit: data.surveyDailyLimit,
      },
      update: {
        whatsappSurveyEnabled: data.whatsappSurveyEnabled,
        ...(tokenCifrado !== undefined && { whatsappToken: tokenCifrado }),
        whatsappPhoneId: data.whatsappPhoneId,
        whatsappVerifyToken: data.whatsappVerifyToken,
        botName: data.botName,
        surveyDailyLimit: data.surveyDailyLimit,
      }
    })

    revalidatePath('/encuestas/configuracion')
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Error guardando configuración' }
  }
}

/**
 * Envía ahora mismo el primer mensaje a electores PENDIENTE del tenant
 * (respeta el límite diario y requiere credenciales de WhatsApp configuradas).
 * No depende de que haya un cron externo corriendo.
 */
export async function enviarEncuestasAhora(): Promise<ResultadoEnvio> {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const resultado = await enviarPendientesTenant(session.user.tenantId, db)
  revalidatePath('/encuestas/campanas')
  return resultado
}

/**
 * Fidelidad de los electores ya inscritos (commitmentStatus, el mismo dato
 * que mantienen los líderes desde la PWA) — la fuente principal de "qué tan
 * fiel es la gente" en la mayoría de campañas, el bot de WhatsApp es un
 * complemento, no el reemplazo de esto.
 */
export async function getFidelidadStats() {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const grupos = await db.voter.groupBy({
    by: ['commitmentStatus'],
    where: { tenantId: session.user.tenantId },
    _count: { id: true },
  })

  const porEstado: Record<string, number> = {
    SIN_CONTACTAR: 0, CONTACTADO: 0, SIMPATIZANTE: 0, COMPROMETIDO: 0, VOTO_SEGURO: 0,
  }
  let total = 0
  for (const g of grupos) {
    porEstado[g.commitmentStatus] = g._count.id
    total += g._count.id
  }

  return { total, porEstado }
}

export async function getSurveyStats() {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const [total, pending, contacted, consented, completed, rejected, responding] = await Promise.all([
    db.voter.count({ where: { tenantId: session.user.tenantId } }),
    db.voter.count({ where: { tenantId: session.user.tenantId, conversationState: 'PENDIENTE' } }),
    db.voter.count({ where: { tenantId: session.user.tenantId, conversationState: 'CONTACTADO' } }),
    db.voter.count({ where: { tenantId: session.user.tenantId, conversationState: 'CONSENTIDO' } }),
    db.voter.count({ where: { tenantId: session.user.tenantId, conversationState: 'COMPLETADO' } }),
    db.voter.count({ where: { tenantId: session.user.tenantId, conversationState: 'RECHAZADO' } }),
    db.voter.count({ where: { tenantId: session.user.tenantId, conversationState: 'RESPONDIENDO' } })
  ])

  // Obtener conteo de respuestas por candidato de forma agrupada (preguntas FREE_TEXT)
  const responsesGrouped = await db.surveyResponse.groupBy({
    by: ['surveyPreguntaId', 'surveyCandidatoId'],
    where: { tenantId: session.user.tenantId },
    _count: { id: true },
  })

  // Conteo por texto de respuesta — cubre BOOLEAN (SI/NO) y SINGLE_CHOICE
  // (el texto guardado es el de la opción elegida), donde no hay candidatoId.
  const responsesByText = await db.surveyResponse.groupBy({
    by: ['surveyPreguntaId', 'text'],
    where: { tenantId: session.user.tenantId },
    _count: { id: true },
  })

  // Buscar información de las preguntas y candidatos para presentar bien en UI
  const preguntas = await db.surveyPregunta.findMany({
    where: { cargo: { campaign: { tenantId: session.user.tenantId } } }
  })

  const candidatos = await db.surveyCandidato.findMany({
    where: { cargo: { campaign: { tenantId: session.user.tenantId } } }
  })

  return {
    funnel: {
      total,
      pending,
      inProgress: contacted + consented + responding,
      completed,
      rejected
    },
    rawResponsesGrouped: responsesGrouped,
    rawResponsesByText: responsesByText,
    metadata: {
      preguntas,
      candidatos
    }
  }
}

/**
 * Resultados por pregunta de UNA campaña puntual — lo que se ve al hacer clic
 * en su tarjeta desde /encuestas/campanas. A diferencia de getSurveyStats()
 * (agregado de todo el tenant), esto solo trae lo de esta campaña.
 */
export async function getSurveyStatsByCampaign(campaignId: string) {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const campania = await db.surveyCampaign.findFirst({
    where: { id: campaignId, tenantId: session.user.tenantId },
  })
  if (!campania) return null

  const filtroCampania = { cargo: { surveyCampaignId: campaignId } }

  const [responsesGrouped, responsesByText, preguntas, candidatos] = await Promise.all([
    db.surveyResponse.groupBy({
      by: ['surveyPreguntaId', 'surveyCandidatoId'],
      where: { tenantId: session.user.tenantId, pregunta: filtroCampania },
      _count: { id: true },
    }),
    db.surveyResponse.groupBy({
      by: ['surveyPreguntaId', 'text'],
      where: { tenantId: session.user.tenantId, pregunta: filtroCampania },
      _count: { id: true },
    }),
    db.surveyPregunta.findMany({ where: filtroCampania, orderBy: { order: 'asc' } }),
    db.surveyCandidato.findMany({ where: { cargo: { surveyCampaignId: campaignId } } }),
  ])

  return {
    campania,
    rawResponsesGrouped: responsesGrouped,
    rawResponsesByText: responsesByText,
    metadata: { preguntas, candidatos },
  }
}
