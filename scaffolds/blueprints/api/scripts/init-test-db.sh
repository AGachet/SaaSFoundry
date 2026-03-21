#!/bin/bash

# 1. Define configuration constants
readonly ENV_TEST_FILE=".env.test"
readonly SQL_FUNCTIONS_DIR="prisma/sql/functions"
readonly SQL_TRIGGERS_DIR="prisma/sql/triggers"
readonly SQL_DATASETS_DIR="prisma/sql/datasets"

# 2. Create task-specific functions
load_env_variables() {
    echo "• Loading test environment variables..."
    if [ -f "${ENV_TEST_FILE}" ]; then
        export $(grep -v '^#' "${ENV_TEST_FILE}" | xargs)
        echo "  ↳ Environment loaded from ${ENV_TEST_FILE}"
    else
        echo "❌ Error: ${ENV_TEST_FILE} file not found"
        exit 1
    fi
}

wait_for_database() {
    echo "• Waiting for database connection..."
    local retries=0
    local max_retries=15
    while [ $retries -lt $max_retries ]; do
        if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
            echo "  ✓ Database is accepting connections"
            return 0
        fi
        retries=$((retries + 1))
        echo "  ↳ Attempt $retries/$max_retries - waiting..."
        sleep 1
    done
    echo "  ❌ Database not ready after $max_retries attempts"
    exit 1
}

clean_database() {
    echo "• Cleaning database objects..."
    echo "  ↳ Dropping triggers and functions"
    psql "$DATABASE_URL" << EOF > /dev/null 2>&1
DO \$\$
DECLARE
    _sql text;
BEGIN
    -- Drop all triggers
    FOR _sql IN
        SELECT 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON ' || event_object_table || ' CASCADE;'
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;

    -- Drop all functions
    FOR _sql IN
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || p.proname || '(' || pg_get_function_arguments(p.oid) || ') CASCADE;'
        FROM pg_proc p
        INNER JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE ns.nspname = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;
END \$\$;
EOF
    echo "  ✓ Database cleaned"
}

apply_schema() {
    echo "• Applying database schema..."
    echo "  ↳ Resetting database"
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma db push --force-reset --accept-data-loss > /dev/null 2>&1
    echo "  ✓ Schema applied"

    echo "  ↳ Generating Prisma Client"
    npx prisma generate > /dev/null 2>&1
    echo "  ✓ Client generated"
}

apply_sql_files() {
    local dir=$1
    local type=$2
    local debug=${3:-false}

    if [ -d "$dir" ] && [ "$(ls -A $dir)" ]; then
        echo "• Applying SQL ${type}..."
        for file in "$dir"/*.sql; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                echo "  ↳ Processing: $filename"
                if [ "$debug" = true ]; then
                    # Run with debug output for E2E datasets
                    echo "    🔍 Running with debug output"
                    if psql "$DATABASE_URL" -f "$file"; then
                        echo "    ✓ Applied successfully"
                    else
                        echo "    ❌ Failed to apply"
                        exit 1
                    fi
                else
                    # Regular silent run
                    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
                        echo "    ✓ Applied successfully"
                    else
                        echo "    ❌ Failed to apply"
                        exit 1
                    fi
                fi
            fi
        done
    fi
}

# 3. Error handling
handle_error() {
    echo ""
    echo "❌ Error occurred in script at line $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
}

# 4. Script configuration
set -e  # Exit on error
trap 'handle_error $LINENO' ERR

# 5. Main function
main() {
    echo ""
    echo "📦 Initializing Test Database"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    load_env_variables
    wait_for_database
    clean_database
    apply_schema
    apply_sql_files "${SQL_FUNCTIONS_DIR}" "functions"
    apply_sql_files "${SQL_TRIGGERS_DIR}" "triggers"
    apply_sql_files "${SQL_DATASETS_DIR}" "datasets" #true # Enabling debug by uncommenting [true]

    echo ""
    echo "✨ Test database initialized successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# 6. Execution
main