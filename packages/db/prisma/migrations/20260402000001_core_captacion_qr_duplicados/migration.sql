-- Migración: core-captacion-qr-duplicados
-- Cambios:
--   1. Nuevos campos en Voter: cedulaHash, address, referredById, captureDepth, qrTokenUsed
--   2. Relación autorreferencial Voter (VoterReferrals)
--   3. Nuevo modelo QrRegistration
--   4. Nuevo modelo VoterDuplicateAlert
--   5. Nuevo modelo Notification

-- ── 1. Nuevos campos en Voter ─────────────────────────────────────────────────

ALTER TABLE "Voter"
  ADD COLUMN "cedulaHash"   TEXT,
  ADD COLUMN "address"      TEXT,
  ADD COLUMN "referredById" TEXT,
  ADD COLUMN "captureDepth" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "qrTokenUsed"  TEXT;

-- Índice único para deduplicación por SHA-256 (permite NULL — los electores
-- creados antes de esta migración no tienen hash y no colisionan entre sí)
CREATE UNIQUE INDEX "Voter_tenantId_cedulaHash_key"
  ON "Voter"("tenantId", "cedulaHash")
  WHERE "cedulaHash" IS NOT NULL;

-- Clave foránea autorreferencial para el árbol de captación
ALTER TABLE "Voter"
  ADD CONSTRAINT "Voter_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "Voter"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 2. Nuevo modelo QrRegistration ───────────────────────────────────────────

CREATE TABLE "QrRegistration" (
  "id"                 TEXT NOT NULL,
  "tenantId"           TEXT NOT NULL,
  "leaderId"           TEXT NOT NULL,
  "token"              TEXT NOT NULL,
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "expiresAt"          TIMESTAMP(3),
  "registrationsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QrRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QrRegistration_token_key"          ON "QrRegistration"("token");
CREATE UNIQUE INDEX "QrRegistration_tenantId_token_key" ON "QrRegistration"("tenantId", "token");
CREATE INDEX        "QrRegistration_tenantId_leaderId_idx" ON "QrRegistration"("tenantId", "leaderId");

-- ── 3. Nuevo modelo VoterDuplicateAlert ──────────────────────────────────────

CREATE TABLE "VoterDuplicateAlert" (
  "id"                TEXT NOT NULL,
  "tenantId"          TEXT NOT NULL,
  "cedulaHash"        TEXT NOT NULL,
  "firstLeaderId"     TEXT NOT NULL,
  "duplicateLeaderId" TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'PENDIENTE',
  "detectedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VoterDuplicateAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VoterDuplicateAlert_tenantId_cedulaHash_idx"
  ON "VoterDuplicateAlert"("tenantId", "cedulaHash");

-- ── 4. Nuevo modelo Notification ─────────────────────────────────────────────

CREATE TABLE "Notification" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_tenantId_userId_isRead_idx"
  ON "Notification"("tenantId", "userId", "isRead");
