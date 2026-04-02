-- Migración: core-commitment-indexes
-- Cambios:
--   1. Reemplazar enum CommitmentStatus (nuevo funnel de contacto)
--   2. Agregar campo Voter.notes
--   3. Agregar índices de performance en Leader y Voter

-- ── 1. Actualizar enum CommitmentStatus ──────────────────────────────────────
-- PostgreSQL no permite modificar enums in-place cuando se eliminan valores.
-- Procedimiento estándar: renombrar el tipo viejo, crear el nuevo, migrar columna,
-- eliminar tipo viejo.

ALTER TYPE "CommitmentStatus" RENAME TO "CommitmentStatus_old";

CREATE TYPE "CommitmentStatus" AS ENUM (
  'SIN_CONTACTAR',
  'CONTACTADO',
  'SIMPATIZANTE',
  'COMPROMETIDO',
  'VOTO_SEGURO'
);

-- Migrar la columna al nuevo tipo (valores existentes incompatibles → default)
ALTER TABLE "Voter"
  ALTER COLUMN "commitmentStatus" DROP DEFAULT,
  ALTER COLUMN "commitmentStatus" TYPE "CommitmentStatus"
    USING 'SIN_CONTACTAR'::"CommitmentStatus",
  ALTER COLUMN "commitmentStatus" SET DEFAULT 'SIN_CONTACTAR'::"CommitmentStatus";

DROP TYPE "CommitmentStatus_old";

-- ── 2. Agregar campo notes a Voter ───────────────────────────────────────────

ALTER TABLE "Voter" ADD COLUMN "notes" TEXT;

-- ── 3. Índices de performance ────────────────────────────────────────────────

-- Índices en Leader
CREATE INDEX "Leader_tenantId_idx"                ON "Leader"("tenantId");
CREATE INDEX "Leader_tenantId_parentLeaderId_idx" ON "Leader"("tenantId", "parentLeaderId");

-- Índices en Voter
CREATE INDEX "Voter_tenantId_leaderId_idx"          ON "Voter"("tenantId", "leaderId");
CREATE INDEX "Voter_tenantId_commitmentStatus_idx"  ON "Voter"("tenantId", "commitmentStatus");
