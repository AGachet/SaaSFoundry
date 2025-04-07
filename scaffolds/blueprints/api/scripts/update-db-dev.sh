#!/bin/bash

# 1. Define configuration constants
readonly MIGRATIONS_DIR="prisma/migrations"
readonly SQL_FUNCTIONS_DIR="prisma/sql/functions"
readonly SQL_TRIGGERS_DIR="prisma/sql/triggers"
readonly SQL_DATASETS_DIR="prisma/sql/datasets"

# 2. Global variables (initialized by parse_arguments)
MIGRATION_NAME=""
INCLUDE_FUNCTIONS=false
INCLUDE_TRIGGERS=false
INCLUDE_DATASETS=false

# 3. Utility functions
show_usage() {
    echo "Usage: ./update-db-dev.sh <migration-name> [--wf] [--wt] [--wds]"
    echo "Options:"
    echo "  --wf   Include functions"
    echo "  --wt   Include triggers"
    echo "  --wds  Include datasets"
}

parse_arguments() {
    if [ -z "$1" ]; then
        echo "❌ Error: You must provide a migration name."
        show_usage
        exit 1
    fi

    MIGRATION_NAME="$1"
    shift

    # Parse remaining arguments
    for arg in "$@"; do
        case "$arg" in
            --wf) INCLUDE_FUNCTIONS=true ;;
            --wt) INCLUDE_TRIGGERS=true ;;
            --wds) INCLUDE_DATASETS=true ;;
            *) echo "⚠️ Warning: Unknown argument: $arg" ;;
        esac
    done
}

create_migration() {
    local name=$1
    echo "🚀 Creating migration: $name"
    npx prisma migrate dev --create-only --name "$name"

    # Get and verify the latest migration
    local latest_dir=$(ls -d "$MIGRATIONS_DIR"/*/ | sort | tail -n 1)
    local migration_file="$latest_dir/migration.sql"

    if [ ! -f "$migration_file" ]; then
        echo "❌ Error: migration.sql not found after migration creation."
        exit 1
    fi

    echo "$migration_file"
}

add_sql_content() {
    local migration_file=$1
    local dir=$2
    local type=$3

    for sql_file in "$dir"/*.sql; do
        if [ -f "$sql_file" ]; then
            echo "-- $type: $(basename "$sql_file")" >> "$migration_file"
            cat "$sql_file" >> "$migration_file"
            echo "" >> "$migration_file"
        fi
    done
}

create_tables_migration() {
    local tables_name="${MIGRATION_NAME}_tables"
    create_migration "$tables_name"
}

create_functions_triggers_migration() {
    if [ "$INCLUDE_FUNCTIONS" = true ] || [ "$INCLUDE_TRIGGERS" = true ]; then
        local name="${MIGRATION_NAME}"
        if [ "$INCLUDE_FUNCTIONS" = true ] && [ "$INCLUDE_TRIGGERS" = true ]; then
            name+="_func_trigger"
        elif [ "$INCLUDE_FUNCTIONS" = true ]; then
            name+="_func"
        else
            name+="_trigger"
        fi

        local migration_file=$(create_migration "$name")
        echo "🔍 Adding SQL functions/triggers to: $migration_file"

        if [ "$INCLUDE_FUNCTIONS" = true ]; then
            add_sql_content "$migration_file" "$SQL_FUNCTIONS_DIR" "Function"
        fi

        if [ "$INCLUDE_TRIGGERS" = true ]; then
            add_sql_content "$migration_file" "$SQL_TRIGGERS_DIR" "Trigger"
        fi

        echo "✅ Functions and triggers added to migration."
    fi
}

create_datasets_migration() {
    if [ "$INCLUDE_DATASETS" = true ]; then
        local datasets_name="${MIGRATION_NAME}_datasets"
        local migration_file=$(create_migration "$datasets_name")

        echo "🔍 Adding SQL datasets to: $migration_file"
        add_sql_content "$migration_file" "$SQL_DATASETS_DIR" "Dataset"
        echo "✅ Datasets added to migration."
    fi
}

apply_migrations() {
    echo "🚀 Running Prisma migrations..."
    npx prisma migrate deploy

    echo "⚙️ Generating Prisma Client..."
    npx prisma generate
}

# 4. Error handling
handle_error() {
    echo "❌ Error occurred in script at line $1"
    exit 1
}

# 5. Script configuration
set -e  # Exit on error
trap 'handle_error $LINENO' ERR

# 6. Main function
main() {
    parse_arguments "$@"

    create_tables_migration
    create_functions_triggers_migration
    create_datasets_migration
    apply_migrations

    echo "✅ All migrations applied and Prisma Client updated!"
}

# 7. Execution
main "$@"