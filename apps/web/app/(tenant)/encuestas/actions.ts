'use server'

import { revalidatePath } from 'next/cache'
import { requireModule } from '@/lib/auth-helpers'
import { getTenantDb } from '@campaignos/db'
import { getTenantConnection } from '@/lib/tenant'

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
    preguntas: { text: string; order: number; type: 'FREE_TEXT' | 'BOOLEAN' }[]
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
                type: pregunta.type
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
    return { success: true }
  } catch (err) {
    console.error('Error creating campaign:', err)
    return { success: false, error: 'Error al crear la campaña.' }
  }
}

/**
 * Obtiene la configuración de WhatsApp y el límite diario del tenant.
 */
export async function getSurveyConfig() {
  const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA'])
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const config = await db.tenantConfig.findUnique({
    where: { tenantId: session.user.tenantId },
    select: {
      whatsappToken: true,
      whatsappPhoneId: true,
      whatsappVerifyToken: true,
      botName: true,
      surveyDailyLimit: true,
    }
  })

  return config || {
    whatsappToken: '',
    whatsappPhoneId: '',
    whatsappVerifyToken: '',
    botName: 'Asistente Virtual',
    surveyDailyLimit: 250,
  }
}

/**
 * Guarda la configuración de WhatsApp y límites.
 */
export async function saveSurveyConfig(data: {
  whatsappToken: string
  whatsappPhoneId: string
  whatsappVerifyToken: string
  botName: string
  surveyDailyLimit: number
}) {
  try {
    const session = await requireModule('ENCUESTAS', ['ADMIN_CAMPANA'])
    const db = getTenantDb(await getTenantConnection(session.user.tenantId))

    await db.tenantConfig.upsert({
      where: { tenantId: session.user.tenantId },
      create: {
        tenantId: session.user.tenantId,
        whatsappToken: data.whatsappToken,
        whatsappPhoneId: data.whatsappPhoneId,
        whatsappVerifyToken: data.whatsappVerifyToken,
        botName: data.botName,
        surveyDailyLimit: data.surveyDailyLimit,
      },
      update: {
        whatsappToken: data.whatsappToken,
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

  // Obtener conteo de respuestas por candidato de forma agrupada
  const responsesGrouped = await db.surveyResponse.groupBy({
    by: ['surveyPreguntaId', 'surveyCandidatoId'],
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
    metadata: {
      preguntas,
      candidatos
    }
  }
}
