export interface DataTableColumn<TRow> {
  key: keyof TRow | string
  header: string
  // Renderizador opcional. Si no se provee, se muestra el valor crudo.
  render?: (value: unknown, row: TRow) => React.ReactNode
}

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[]
  rows: TRow[]
  keyField: keyof TRow
  emptyMessage?: string
  loading?: boolean
}

// TODO: paginación, ordenamiento y filtros cuando la pantalla de electores
// maneje volúmenes grandes. Hoy las listas son cortas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<TRow extends Record<string, any>>({
  columns,
  rows,
  keyField,
  emptyMessage = 'Sin datos',
  loading = false,
}: DataTableProps<TRow>) {
  if (loading) {
    return (
      <div role="status" className="p-8 text-center text-sm text-slate-500">
        Cargando...
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left font-semibold text-xs uppercase tracking-wider text-slate-500 px-4 py-3 whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={String(row[keyField])}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-slate-700 align-middle">
                    {col.render
                      ? col.render(row[col.key as keyof TRow], row)
                      : String(row[col.key as keyof TRow] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
