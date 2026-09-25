-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."EntityStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');

-- CreateEnum
CREATE TYPE "public"."ConnectionType" AS ENUM ('SUPPORTS', 'DERIVES_FROM', 'CONFLICTS_WITH', 'INFORMS');

-- CreateEnum
CREATE TYPE "public"."ConnectionStrength" AS ENUM ('STRONG', 'MEDIUM', 'WEAK');

-- CreateEnum
CREATE TYPE "public"."ReconciliationState" AS ENUM ('SYNCED', 'NEEDS_ATTENTION', 'DOWNSTREAM_IMPACT', 'CONFLICTED', 'PENDING_REVIEW', 'RECONCILED');

-- CreateEnum
CREATE TYPE "public"."ChangeType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "public"."ConflictType" AS ENUM ('BUSINESS_VS_USER', 'CONSTRAINT_VIOLATION', 'DEPENDENCY_CYCLE', 'PRIORITY_MISMATCH');

-- CreateEnum
CREATE TYPE "public"."ConflictStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK');

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entities" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "layer" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB NOT NULL,
    "position_x" INTEGER NOT NULL,
    "position_y" INTEGER NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "status" "public"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."layer_connections" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "from_entity_id" TEXT NOT NULL,
    "to_entity_id" TEXT NOT NULL,
    "from_layer" INTEGER NOT NULL,
    "to_layer" INTEGER NOT NULL,
    "connection_type" "public"."ConnectionType" NOT NULL,
    "strength" "public"."ConnectionStrength" NOT NULL DEFAULT 'MEDIUM',
    "rationale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "layer_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reconciliation_status" (
    "entity_id" TEXT NOT NULL,
    "state" "public"."ReconciliationState" NOT NULL DEFAULT 'SYNCED',
    "triggered_by" TEXT,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "reconciliation_status_pkey" PRIMARY KEY ("entity_id")
);

-- CreateTable
CREATE TABLE "public"."change_events" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "change_type" "public"."ChangeType" NOT NULL,
    "changed_fields" JSONB NOT NULL DEFAULT '[]',
    "old_values" JSONB,
    "new_values" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "batch_id" TEXT,

    CONSTRAINT "change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."impact_analyses" (
    "change_event_id" TEXT NOT NULL,
    "affected_entities" JSONB NOT NULL,
    "analysis_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "impact_analyses_pkey" PRIMARY KEY ("change_event_id")
);

-- CreateTable
CREATE TABLE "public"."conflict_resolutions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "entity_ids" JSONB NOT NULL DEFAULT '[]',
    "conflict_type" "public"."ConflictType" NOT NULL,
    "description" TEXT NOT NULL,
    "proposed_resolution" TEXT,
    "status" "public"."ConflictStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "conflict_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_snapshots" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "commit_hash" TEXT,
    "message" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entities_snapshot" JSONB NOT NULL,
    "connections_snapshot" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "project_snapshots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."entities" ADD CONSTRAINT "entities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."layer_connections" ADD CONSTRAINT "layer_connections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."layer_connections" ADD CONSTRAINT "layer_connections_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."layer_connections" ADD CONSTRAINT "layer_connections_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reconciliation_status" ADD CONSTRAINT "reconciliation_status_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reconciliation_status" ADD CONSTRAINT "reconciliation_status_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_events" ADD CONSTRAINT "change_events_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."impact_analyses" ADD CONSTRAINT "impact_analyses_change_event_id_fkey" FOREIGN KEY ("change_event_id") REFERENCES "public"."change_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conflict_resolutions" ADD CONSTRAINT "conflict_resolutions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_snapshots" ADD CONSTRAINT "project_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

