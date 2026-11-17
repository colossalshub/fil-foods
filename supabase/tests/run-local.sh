#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres database and runs the staff workflow,
# sign-up and privacy checks.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres supabase/tests/run-local.sh
# Never point this at the hosted Supabase project: it drops and recreates the "fil_test" database.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB:-fil_test}"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
P="psql -v ON_ERROR_STOP=1 -q -d $DB"
$P -c "alter database $DB set search_path = public, extensions"
$P -f tests/supabase_shim.sql
for f in migrations/*.sql; do $P -f "$f" >/dev/null 2>&1 || { echo "Migration failed: $f"; $P -f "$f"; exit 1; }; done
$P -f tests/staff_workflow.test.sql 2>&1 | grep -E "ok -|ERROR|PASSED"
$P -f tests/auth_privacy.test.sql 2>&1 | grep -E "ok -|ERROR|PASSED"
