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

// TODO: implementar con paginación, ordenamiento y filtros cuando se construya
// la pantalla de gestión de líderes y electores
export function DataTable<TRow extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  emptyMessage = 'Sin datos',
  loading = false,
}: DataTableProps<TRow>) {
  if (loading) return <div role="status">Cargando...</div>

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>{emptyMessage}</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={String(row[keyField])}>
              {columns.map((col) => (
                <td key={String(col.key)}>
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
  )
}
