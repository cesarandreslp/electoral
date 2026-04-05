import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createElement } from 'react'

const styles = StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  border: {
    border: '3px solid #1e40af',
    borderRadius: 8,
    padding: 50,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    fontSize: 14,
    color: '#1e40af',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 3,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
    borderBottom: '2px solid #1e40af',
    paddingBottom: 8,
    paddingLeft: 30,
    paddingRight: 30,
  },
  details: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 6,
    textAlign: 'center',
  },
  score: {
    fontSize: 16,
    color: '#166534',
    fontFamily: 'Helvetica-Bold',
    marginTop: 15,
    marginBottom: 15,
  },
  footer: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 30,
    textAlign: 'center',
  },
  logo: {
    fontSize: 10,
    color: '#1e40af',
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
  },
})

interface CertificateProps {
  recipientName: string
  quizTitle:     string
  score:         number
  date:          string
}

export function CertificatePDF({ recipientName, quizTitle, score, date }: CertificateProps) {
  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', orientation: 'landscape', style: styles.page },
      createElement(
        View,
        { style: styles.border },
        createElement(Text, { style: styles.header }, 'CERTIFICADO DE APROBACIÓN'),
        createElement(Text, { style: styles.title }, 'Formación Electoral'),
        createElement(Text, { style: styles.subtitle }, 'Se certifica que'),
        createElement(Text, { style: styles.name }, recipientName),
        createElement(Text, { style: styles.details }, `Ha completado y aprobado satisfactoriamente la evaluación:`),
        createElement(Text, { style: { ...styles.details, fontFamily: 'Helvetica-Bold', fontSize: 14, marginTop: 8 } }, quizTitle),
        createElement(Text, { style: styles.score }, `Puntaje obtenido: ${score}%`),
        createElement(Text, { style: styles.details }, `Fecha de emisión: ${date}`),
        createElement(Text, { style: styles.footer }, 'Este certificado fue generado automáticamente por la plataforma CampaignOS.'),
        createElement(Text, { style: styles.logo }, 'CampaignOS — Sistema de Inteligencia Electoral'),
      ),
    ),
  )
}
