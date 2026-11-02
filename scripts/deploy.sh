#!/usr/bin/env bash
#
# Deploy the Everfresh API on Web2 (LXC 102).
#
# Modelled on /var/www/deploy.sh, but that one deploys a static SPA: it builds
# a dist/ and lets nginx serve it. This is a long-running Node process under
# PM2, so the shape differs in four ways:
#
#   - PM2 restart instead of an nginx reload
#   - envs/.env is gitignored and lives only on the server, so it is never
#     touched and its absence aborts the deploy
#   - the database schema is checked first: new code against an un-migrated
#     database throws Postgres 42703 on every enquiry
#   - the build happens in place rather than in a temp clone, because the
#     container runs close to full and a temp clone means two node_modules
#
# Usage:  ./scripts/deploy.sh [branch]        (default: main)

set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="/var/www/everfresh-admin"
PM2_NAME="everfresh-admin"
HEALTH_URL="http://127.0.0.1:5000/api/v1/health"
ENV_FILE="envs/.env"
MIN_FREE_MB=1500
KEEP_BACKUPS=3

say() { echo ">>> $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

echo "=== Everfresh API deploy started: $(date -u) ==="

# --- Preflight -------------------------------------------------------------
command -v git >/dev/null || die "git not found"
command -v npm >/dev/null || die "npm not found"
command -v pm2 >/dev/null || die "pm2 not found"

[[ -d "$APP_DIR" ]] || die "APP_DIR not found: $APP_DIR"
cd "$APP_DIR"

[[ -f "$ENV_FILE" ]] || die "$ENV_FILE is missing. It is gitignored and must exist on the server."

# envalid exits on a missing key, which PM2 shows only as a restart loop, so
# check the one that silently breaks every booking instead.
if ! grep -qE '^DEFAULT_ENQUIRY_COMPANY_ID=.+' "$ENV_FILE"; then
    die "DEFAULT_ENQUIRY_COMPANY_ID is empty in $ENV_FILE. Every enquiry would return 500."
fi

FREE_MB=$(df -Pm . | awk 'NR==2{print $4}')
if (( FREE_MB < MIN_FREE_MB )); then
    die "Only ${FREE_MB}MB free, need ${MIN_FREE_MB}MB. Try: npm cache clean --force; pm2 flush"
fi
say "Disk check passed (${FREE_MB}MB free)"

if [[ -n "$(git status --porcelain)" ]]; then
    die "Working tree has local changes. Commit, stash or discard them first."
fi

# --- Schema gate -----------------------------------------------------------
# Refuse to ship code that queries columns the database does not have.
say "Checking the database schema matches this code"

# Read values rather than sourcing the file. ALLOWED_ORIGINS holds a
# comma-and-space separated list, so `source` tries to run the second origin as
# a command and, under set -e, kills the deploy.
env_get() {
    grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

DB_HOST="$(env_get DB_HOST)"
DB_PORT="$(env_get DB_PORT)"
DB_NAME="$(env_get DB_NAME)"
DB_USER="$(env_get DB_USER)"
DB_PASSWORD="$(env_get DB_PASSWORD)"

[[ -n "$DB_HOST" && -n "$DB_NAME" && -n "$DB_USER" ]] || die "DB_HOST, DB_NAME or DB_USER missing from $ENV_FILE"
command -v psql >/dev/null || die "psql not found. Install it: apt-get install -y postgresql-client"

MISSING=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" \
    -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT count(*) FROM (VALUES ('preferred_time'),('latitude'),('longitude'),
        ('location_accuracy'),('resolved_address'),('geocoded_at')) AS required(col)
      WHERE col NOT IN (
        SELECT column_name FROM information_schema.columns
         WHERE table_name = 'service_enquiries');" 2>/dev/null || echo "ERR")

if [[ "$MISSING" == "ERR" ]]; then
    die "Could not reach the database to verify the schema. Check DB_HOST in $ENV_FILE."
elif [[ "$MISSING" != "0" ]]; then
    die "$MISSING migration column(s) missing. Run src/database/migrations/002_*.sql first."
fi
say "Schema is up to date"

# --- Backup for rollback ---------------------------------------------------
PREVIOUS_SHA="$(git rev-parse --short HEAD)"
if [[ -d dist ]]; then
    BACKUP="dist_backup_$(date -u +%Y%m%d_%H%M%S)"
    say "Backing up current build -> $BACKUP"
    cp -a dist "$BACKUP"
fi

# --- Pull ------------------------------------------------------------------
say "Fetching $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
say "Now at $(git rev-parse --short HEAD) (was $PREVIOUS_SHA)"

# --- Build -----------------------------------------------------------------
# The build needs devDependencies: tsc-alias and the @types packages live
# there. Installing with --omit=dev fails at "tsc-alias: not found". They are
# pruned again after the build, which matters on a container this full.
say "Installing dependencies (including build tools)"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

say "Building"
npm run build

[[ -f dist/Server.js ]] || die "Build produced no dist/Server.js"

# npm run build copies these; without them every email render throws ENOENT.
TEMPLATES=$(ls dist/utilities/email/templates/*.ejs 2>/dev/null | wc -l)
(( TEMPLATES > 0 )) || die "No .ejs templates in dist. Email would fail at runtime."
say "Build OK (${TEMPLATES} email templates present)"

# Runtime needs only `dependencies`. Dropping the build tools reclaims a few
# hundred MB, which is worth having on a disk this close to full.
say "Pruning build-only dependencies"
npm prune --omit=dev --no-audit --no-fund

# --- Restart ---------------------------------------------------------------
say "Restarting PM2 process: $PM2_NAME"
pm2 restart "$PM2_NAME" --update-env
pm2 save

# --- Verify ----------------------------------------------------------------
say "Waiting for health check"
for attempt in $(seq 1 15); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        say "Healthy after ${attempt}s"
        HEALTHY=1
        break
    fi
    sleep 1
done

if [[ "${HEALTHY:-0}" != "1" ]]; then
    echo "ERROR: health check failed. Recent logs:" >&2
    pm2 logs "$PM2_NAME" --lines 30 --nostream || true
    echo "" >&2
    echo "To roll back:" >&2
    echo "  cd $APP_DIR && git checkout $PREVIOUS_SHA && npm run build && pm2 restart $PM2_NAME" >&2
    exit 1
fi

# --- Tidy ------------------------------------------------------------------
say "Removing old backups (keeping last ${KEEP_BACKUPS})"
ls -1dt dist_backup_* 2>/dev/null | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm -rf

echo "=== Deploy completed: $(date -u) ==="
curl -s "$HEALTH_URL" | head -c 300; echo
