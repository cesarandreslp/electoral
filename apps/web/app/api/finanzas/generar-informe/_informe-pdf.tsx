import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createElement } from 'react'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottom: '2px solid #1e40af',
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#334155',
  },
  headerType: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 8,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    padding: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 180,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  infoValue: {
    flex: 1,
    color: '#0f172a',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    padding: 6,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1px solid #e2e8f0',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  colConcepto: { width: '50%' },
  colMonto:    { width: '25%', textAlign: 'right' },
  colCount:    { width: '25%', textAlign: 'center' },
  summaryBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#0c4a6e',
  },
  summaryValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1px solid #cbd5e1',
  },
  footerLine: {
    marginTop: 40,
    textAlign: 'center',
    borderTop: '1px solid #0f172a',
    paddingTop: 4,
    width: 250,
    alignSelf: 'center',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 9,
    color: '#64748b',
  },
  timestamp: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
})

const TYPE_LABELS: Record<string, string> = {
  PARCIAL: 'Informe Parcial',
  FINAL:   'Informe Final',
  CNE:     'Informe para el CNE',
}

const CATEGORY_LABELS: Record<string, string> = {
  PUBLICIDAD:  'Publicidad',
  TRANSPORTE:  'Transporte',
  LOGISTICA:   'Logística',
  PERSONAL:    'Personal',
  TECNOLOGIA:  'Tecnología',
  EVENTOS:     'Eventos',
  JURIDICO:    'Jurídico',
  OTRO:        'Otro',
}

const DONOR_TYPE_LABELS: Record<string, string> = {
  PERSONA_NATURAL:  'Persona natural',
  PERSONA_JURIDICA: 'Persona jurídica',
  APORTE_PROPIO:    'Aporte propio del candidato',
}

function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`
}

export interface InformeData {
  type:                string
  config: {
    cargoPostulado:     string | null
    municipio:          string | null
    topeGastos:         number | null
    fechaInicioCampana: Date | null
    fechaFinCampana:    Date | null
    nombreTesorero:     string | null
    cedulaTesorero:     string | null // ya descifrada
  } | null
  totalExpenses:        number
  totalDonations:       number
  balance:              number
  porcentajeTope:       number | null
  gastosPorCategoria:   Record<string, number>
  donacionesPorTipo:    Record<string, number>
  totalGastos:          number
  totalDonacionesCount: number
}

export function InformePDF({ data }: { data: InformeData }) {
  const fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const period = data.type === 'FINAL'
    ? 'Período completo de campaña'
    : `Generado el ${fecha}`

  return createElement(Document, null,
    createElement(Page, { size: 'A4', style: styles.page },

      // Encabezado
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.headerTitle }, 'INFORME FINANCIERO DE CAMPAÑA'),
        createElement(Text, { style: styles.headerSubtitle }, 'República de Colombia — Normativa Electoral'),
        createElement(Text, { style: styles.headerType }, TYPE_LABELS[data.type] ?? data.type),
        createElement(Text, { style: { fontSize: 9, color: '#64748b', marginTop: 4 } }, period),
      ),

      // Datos del candidato
      data.config && createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'DATOS DE LA CAMPAÑA'),
        data.config.cargoPostulado && createElement(View, { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, 'Cargo postulado:'),
          createElement(Text, { style: styles.infoValue }, data.config.cargoPostulado),
        ),
        data.config.municipio && createElement(View, { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, 'Municipio/Departamento:'),
          createElement(Text, { style: styles.infoValue }, data.config.municipio),
        ),
        data.config.topeGastos && createElement(View, { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, 'Tope legal de gastos:'),
          createElement(Text, { style: styles.infoValue }, formatCOP(data.config.topeGastos)),
        ),
        data.config.fechaInicioCampana && createElement(View, { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, 'Período de campaña:'),
          createElement(Text, { style: styles.infoValue },
            `${new Date(data.config.fechaInicioCampana).toLocaleDateString('es-CO')} — ${data.config.fechaFinCampana ? new Date(data.config.fechaFinCampana).toLocaleDateString('es-CO') : 'En curso'}`
          ),
        ),
        data.config.nombreTesorero && createElement(View, { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, 'Tesorero:'),
          createElement(Text, { style: styles.infoValue }, data.config.nombreTesorero),
        ),
        data.config.cedulaTesorero && createElement(View, { style: styles.infoRow },
          createElement(Text, { style: styles.infoLabel }, 'Cédula del tesorero:'),
          createElement(Text, { style: styles.infoValue }, data.config.cedulaTesorero),
        ),
      ),

      // Tabla de ingresos (donaciones por tipo)
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'INGRESOS (DONACIONES)'),
        createElement(View, { style: styles.tableHeader },
          createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colConcepto } }, 'Tipo de donante'),
          createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colCount } }, 'Cantidad'),
          createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colMonto } }, 'Monto'),
        ),
        ...Object.entries(data.donacionesPorTipo).map(([tipo, monto], i) =>
          createElement(View, { key: tipo, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
            createElement(Text, { style: styles.colConcepto }, DONOR_TYPE_LABELS[tipo] ?? tipo),
            createElement(Text, { style: styles.colCount }, '-'),
            createElement(Text, { style: styles.colMonto }, formatCOP(monto)),
          ),
        ),
        createElement(View, { style: { ...styles.tableRow, backgroundColor: '#e0f2fe' } },
          createElement(Text, { style: { ...styles.colConcepto, fontFamily: 'Helvetica-Bold' } }, 'TOTAL INGRESOS'),
          createElement(Text, { style: { ...styles.colCount, fontFamily: 'Helvetica-Bold' } }, String(data.totalDonacionesCount)),
          createElement(Text, { style: { ...styles.colMonto, fontFamily: 'Helvetica-Bold' } }, formatCOP(data.totalDonations)),
        ),
      ),

      // Tabla de egresos (gastos por categoría)
      createElement(View, { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'EGRESOS (GASTOS)'),
        createElement(View, { style: styles.tableHeader },
          createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colConcepto } }, 'Categoría'),
          createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colCount } }, 'Cantidad'),
          createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colMonto } }, 'Monto'),
        ),
        ...Object.entries(data.gastosPorCategoria).map(([cat, monto], i) =>
          createElement(View, { key: cat, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
            createElement(Text, { style: styles.colConcepto }, CATEGORY_LABELS[cat] ?? cat),
            createElement(Text, { style: styles.colCount }, '-'),
            createElement(Text, { style: styles.colMonto }, formatCOP(monto)),
          ),
        ),
        createElement(View, { style: { ...styles.tableRow, backgroundColor: '#e0f2fe' } },
          createElement(Text, { style: { ...styles.colConcepto, fontFamily: 'Helvetica-Bold' } }, 'TOTAL EGRESOS'),
          createElement(Text, { style: { ...styles.colCount, fontFamily: 'Helvetica-Bold' } }, String(data.totalGastos)),
          createElement(Text, { style: { ...styles.colMonto, fontFamily: 'Helvetica-Bold' } }, formatCOP(data.totalExpenses)),
        ),
      ),

      // Resumen financiero
      createElement(View, { style: styles.summaryBox },
        createElement(Text, { style: { ...styles.sectionTitle, backgroundColor: 'transparent', padding: 0, marginBottom: 10 } }, 'RESUMEN FINANCIERO'),
        createElement(View, { style: styles.summaryRow },
          createElement(Text, { style: styles.summaryLabel }, 'Total ingresos:'),
          createElement(Text, { style: styles.summaryValue }, formatCOP(data.totalDonations)),
        ),
        createElement(View, { style: styles.summaryRow },
          createElement(Text, { style: styles.summaryLabel }, 'Total egresos:'),
          createElement(Text, { style: styles.summaryValue }, formatCOP(data.totalExpenses)),
        ),
        createElement(View, { style: styles.summaryRow },
          createElement(Text, { style: styles.summaryLabel }, 'Saldo:'),
          createElement(Text, { style: { ...styles.summaryValue, color: data.balance >= 0 ? '#166534' : '#991b1b' } }, formatCOP(data.balance)),
        ),
        data.porcentajeTope !== null && createElement(View, { style: styles.summaryRow },
          createElement(Text, { style: styles.summaryLabel }, '% del tope utilizado:'),
          createElement(Text, { style: { ...styles.summaryValue, color: data.porcentajeTope > 100 ? '#991b1b' : data.porcentajeTope > 80 ? '#92400e' : '#166534' } }, `${data.porcentajeTope.toFixed(1)}%`),
        ),
      ),

      // Firma del tesorero
      createElement(View, { style: styles.footer },
        createElement(View, { style: styles.footerLine },
          createElement(Text, { style: { textAlign: 'center', fontSize: 10 } },
            data.config?.nombreTesorero ?? 'Tesorero de campaña',
          ),
          data.config?.cedulaTesorero && createElement(Text, { style: { textAlign: 'center', fontSize: 9, color: '#64748b' } },
            `C.C. ${data.config.cedulaTesorero}`,
          ),
          createElement(Text, { style: { textAlign: 'center', fontSize: 9, color: '#64748b' } }, 'Tesorero de campaña'),
        ),
      ),

      // Timestamp
      createElement(Text, { style: styles.timestamp },
        `Generado automáticamente por CampaignOS — ${new Date().toLocaleString('es-CO')}`,
      ),
    ),
  )
}
