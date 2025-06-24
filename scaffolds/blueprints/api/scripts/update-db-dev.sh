#!/bin/bash

# ===============================
# Database Update Script for Dev
# ===============================

# 1. Configuration
readonly MIGRATIONS_DIR="prisma/migrations"
readonly SQL_FUNCTIONS_DIR="prisma/sql/functions"
readonly SQL_TRIGGERS_DIR="prisma/sql/triggers"
readonly SQL_DATASETS_DIR="prisma/sql/datasets"

# 2. Global variables
MIGRATION_NAME=""
INCLUDE_FUNCTIONS=false
INCLUDE_TRIGGERS=false
INCLUDE_DATASETS=false
DEBUG_MODE=false

# 3. Logging utilities
# Color codes
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✓ INFO:${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠ WARN:${NC} $1"
}

log_error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
}

log_debug() {
    if [ "$DEBUG_MODE" = true ]; then
        echo -e "${BLUE}→ DEBUG:${NC} $1"
    fi
}

log_step() {
    echo -e "\n${GREEN}========== $1 ==========${NC}"
}

# 4. Utility functions
show_usage() {
    echo "Usage: ./update-db-dev.sh <migration-name> [--wf] [--wt] [--wds] [--debug]"
    echo "Options:"
    echo "  --wf     Include functions"
    echo "  --wt     Include triggers"
    echo "  --wds    Include datasets"
    echo "  --debug  Show debug information"
}

check_directory() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        log_debug "Creating directory: $dir"
        mkdir -p "$dir"
    fi
}

parse_arguments() {
    if [ -z "$1" ]; then
        log_error "You must provide a migration name."
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
            --debug) DEBUG_MODE=true ;;
            *) log_warn "Unknown argument: $arg" ;;
        esac
    done

    log_debug "Migration name: $MIGRATION_NAME"
    log_debug "Include functions: $INCLUDE_FUNCTIONS"
    log_debug "Include triggers: $INCLUDE_TRIGGERS"
    log_debug "Include datasets: $INCLUDE_DATASETS"
    log_debug "Debug mode: $DEBUG_MODE"
}

create_migration() {
    local name=$1
    log_step "Creating $name migration"

    # Make sure the migrations directory exists
    check_directory "$MIGRATIONS_DIR"

    # Run Prisma migrate command
    npx prisma migrate dev --create-only --name "$name"

    # Get and verify the latest migration directory
    sleep 1  # Give the filesystem a moment to update
    local latest_dir=$(find "$MIGRATIONS_DIR" -type d -name "[0-9]*_${name}" 2>/dev/null | sort | tail -n 1)
    log_debug "Latest migration directory: $latest_dir"

    # If directory doesn't exist, create it
    if [ -z "$latest_dir" ]; then
        log_warn "Migration directory not found for $name. Creating it manually."
        # Generate timestamp for the migration directory name
        local timestamp=$(date +%Y%m%d%H%M%S)
        latest_dir="$MIGRATIONS_DIR/${timestamp}_${name}"
        mkdir -p "$latest_dir"
        log_debug "Created migration directory: $latest_dir"
    fi

    local migration_file="$latest_dir/migration.sql"
    log_debug "Migration file path: $migration_file"

    # If file doesn't exist, create an empty one
    if [ ! -f "$migration_file" ]; then
        log_warn "migration.sql not found in $latest_dir. Creating an empty file."
        touch "$migration_file"
    fi

    # Remove "This is an empty migration" line if it exists
    if [ -f "$migration_file" ]; then
        # Create a temporary file
        local tmp_file=$(mktemp)
        # Remove the "This is an empty migration" line
        grep -v "This is an empty migration" "$migration_file" > "$tmp_file"
        # Copy the result back to the original file
        cat "$tmp_file" > "$migration_file"
        rm "$tmp_file"
    fi

    # Return the migration directory
    echo "$latest_dir"
}

add_sql_content() {
    local migration_file=$1
    local dir=$2
    local type=$3

    log_debug "Adding $type content from directory: $dir"
    local file_count=0

    # Add a header for this section
    echo -e "\n-- ========== $type Scripts ========== --\n" >> "$migration_file"

    for sql_file in "$dir"/*.sql; do
        log_debug "Processing SQL file: $sql_file"
        if [ -f "$sql_file" ]; then
            log_debug "Adding content from: $sql_file"
            echo -e "-- $type: $(basename "$sql_file")\n" >> "$migration_file"
            cat "$sql_file" >> "$migration_file"
            echo -e "\n\n" >> "$migration_file"
            file_count=$((file_count + 1))
        else
            log_warn "The SQL file pattern did not match any files or $sql_file is not a file"
        fi
    done

    if [ $file_count -eq 0 ]; then
        log_warn "No SQL files found in $dir"
        return 1
    else
        log_debug "Added content from $file_count SQL files of type $type"
        return 0
    fi
}

create_tables_migration() {
    log_step "Creating tables migration"

    # Make sure the migrations directory exists
    check_directory "$MIGRATIONS_DIR"

    # Run Prisma migrate command with the interactive mode
    log_info "Running Prisma migrate dev - Please check the proposed changes"
    log_info "You might be asked to confirm database reset if schema drift is detected"

    # Use Prisma in interactive mode for tables migration
    npx prisma migrate dev --name "${MIGRATION_NAME}_tables"

    if [ $? -ne 0 ]; then
        log_error "Failed to create tables migration. User might have cancelled the operation."
        exit 1
    fi

    # Find the migration directory that was just created
    local migration_dir=$(find "$MIGRATIONS_DIR" -type d -name "[0-9]*_${MIGRATION_NAME}_tables" 2>/dev/null | sort | tail -n 1)

    if [ -z "$migration_dir" ]; then
        log_error "Could not find the tables migration directory after running prisma migrate dev"
        exit 1
    fi

    log_info "Tables migration created successfully at: $migration_dir"
    echo "$migration_dir"
    return 0
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

        # Check if we have content to add
        local has_functions=false
        local has_triggers=false

        if [ "$INCLUDE_FUNCTIONS" = true ] && [ -d "$SQL_FUNCTIONS_DIR" ] && [ "$(ls -A $SQL_FUNCTIONS_DIR 2>/dev/null)" ]; then
            has_functions=true
        fi

        if [ "$INCLUDE_TRIGGERS" = true ] && [ -d "$SQL_TRIGGERS_DIR" ] && [ "$(ls -A $SQL_TRIGGERS_DIR 2>/dev/null)" ]; then
            has_triggers=true
        fi

        if [ "$has_functions" = false ] && [ "$has_triggers" = false ]; then
            log_warn "No functions or triggers content to add"
            log_info "Skipping functions/triggers migration as there's no content to add"
            return 0
        fi

        log_step "Creating functions/triggers migration"

        # Create the migration manually
        local timestamp=$(date +%Y%m%d%H%M%S)
        local migration_dir="$MIGRATIONS_DIR/${timestamp}_${name}"
        mkdir -p "$migration_dir"
        local migration_file="$migration_dir/migration.sql"
        touch "$migration_file"

        log_debug "Created migration directory: $migration_dir"

        # Add a nice header
        echo -e "-- ========== Functions and Triggers Migration ========== --\n" > "$migration_file"

        local added_content=false

        if [ "$INCLUDE_FUNCTIONS" = true ] && [ "$has_functions" = true ]; then
            log_debug "Adding functions from $SQL_FUNCTIONS_DIR"
            add_sql_content "$migration_file" "$SQL_FUNCTIONS_DIR" "Function"
            added_content=true
        else
            log_info "Skipping functions - either disabled or no content"
        fi

        if [ "$INCLUDE_TRIGGERS" = true ] && [ "$has_triggers" = true ]; then
            log_debug "Adding triggers from $SQL_TRIGGERS_DIR"
            add_sql_content "$migration_file" "$SQL_TRIGGERS_DIR" "Trigger"
            added_content=true
        else
            log_info "Skipping triggers - either disabled or no content"
        fi

        # Check if content was added successfully
        if [ -s "$migration_file" ]; then
            log_info "Functions and triggers added to migration successfully"

            # Show content preview in debug mode
            if [ "$DEBUG_MODE" = true ]; then
                echo -e "\n${BLUE}Migration preview (first 5 lines):${NC}"
                head -n 5 "$migration_file" | sed 's/^/  /'
                echo "  ..."
            fi

            # Return the directory name for the later migrations
            echo "$migration_dir"
        else
            log_error "Functions/triggers migration file is empty after adding content"
            rm -rf "$migration_dir"
            exit 1  # Stop the script if we couldn't add content
        fi
    else
        log_info "Skipping functions and triggers migration (use --wf or --wt to include them)"
        return 0
    fi
}

create_datasets_migration() {
    if [ "$INCLUDE_DATASETS" = true ]; then
        local datasets_name="${MIGRATION_NAME}_datasets"

        # Check if datasets directory exists and has content
        if [ ! -d "$SQL_DATASETS_DIR" ] || [ -z "$(ls -A $SQL_DATASETS_DIR 2>/dev/null)" ]; then
            log_warn "Datasets directory is empty or doesn't exist: $SQL_DATASETS_DIR"
            log_info "Skipping datasets migration as there's no content to add"
            return 0
        fi

        log_step "Creating datasets migration"

        # Create the migration manually
        local timestamp=$(date +%Y%m%d%H%M%S)
        local migration_dir="$MIGRATIONS_DIR/${timestamp}_${datasets_name}"
        mkdir -p "$migration_dir"
        local migration_file="$migration_dir/migration.sql"
        touch "$migration_file"

        log_debug "Created datasets migration directory: $migration_dir"

        # Add header
        echo -e "-- ========== Dataset Migration ========== --\n" > "$migration_file"

        # Add special comment to help with error handling
        echo -e "-- Note: Each data insertion is separated to avoid failing the entire migration if one fails\n" >> "$migration_file"

        # Instead of wrapping with DO block, scan the dataset files for existing DO blocks
        local has_do_blocks=false
        for sql_file in "$SQL_DATASETS_DIR"/*.sql; do
            if [ -f "$sql_file" ] && grep -q "DO \$\$" "$sql_file"; then
                has_do_blocks=true
                log_debug "Found DO block in $sql_file"
            fi
        done

        if [ "$has_do_blocks" = true ]; then
            log_debug "Dataset files already contain DO blocks, adding content as is"
            add_sql_content "$migration_file" "$SQL_DATASETS_DIR" "Dataset"
        else
            # Use the simpler approach for each statement
            echo -e "-- Adding error handling for each statement\n" >> "$migration_file"

            # Add the content
            add_sql_content "$migration_file" "$SQL_DATASETS_DIR" "Dataset"

            # Add a comment about error handling
            echo -e "\n-- Note: If you encounter duplicate key errors, you may need to add 'ON CONFLICT DO NOTHING' to your INSERT statements" >> "$migration_file"
        fi

        # Check if content was added successfully
        if [ -s "$migration_file" ]; then
            log_info "Datasets added to migration successfully"

            # Show content preview in debug mode
            if [ "$DEBUG_MODE" = true ]; then
                echo -e "\n${BLUE}Migration preview (first 5 lines):${NC}"
                head -n 5 "$migration_file" | sed 's/^/  /'
                echo "  ..."
            fi

            # Return the directory name for the later migrations
            echo "$migration_dir"
        else
            log_error "Datasets migration file is empty after adding content"
            rm -rf "$migration_dir"
            exit 1  # Stop the script if we couldn't add content
        fi
    else
        log_info "Skipping datasets migration (use --wds to include them)"
        return 0
    fi
}

apply_migrations() {
    log_step "Applying migrations"

    # Note: The tables migration has already been applied by prisma migrate dev
    log_info "Deploying function/trigger and dataset migrations"
    npx prisma migrate deploy

    # Check if the deployment was successful
    if [ $? -ne 0 ]; then
        log_error "Migration deployment failed."
        log_error "This might be due to duplicate data. Check the error message above."
        log_info "You may need to manually fix the migration files or reset the database."
        exit 1  # Stop the script if the migration failed
    fi

    log_info "Generating Prisma Client"
    npx prisma generate

    if [ $? -ne 0 ]; then
        log_error "Prisma Client generation failed"
        exit 1  # Stop the script if client generation failed
    fi
}

# 5. Error handling
handle_error() {
    log_error "Script error occurred at line $1"
    exit 1
}

# 6. Script configuration
set -e  # Exit on error
trap 'handle_error $LINENO' ERR

# 7. Main function
main() {
    parse_arguments "$@"

    log_step "Starting migration process for '$MIGRATION_NAME'"

    # Make sure the migrations directory exists
    check_directory "$MIGRATIONS_DIR"

    # Create and apply the tables migration (interactive)
    create_tables_migration

    # Create the function/trigger and dataset migrations
    local funk_trig_dir=$(create_functions_triggers_migration)
    local dataset_dir=$(create_datasets_migration)

    # Only apply additional migrations if they were created
    if [ -n "$funk_trig_dir" ] || [ -n "$dataset_dir" ]; then
        # Apply all additional migrations
        apply_migrations
    else
        log_info "No additional migrations to apply beyond tables"
    fi

    log_step "Migration completed successfully"
    log_info "All migrations applied and Prisma Client updated!"
}

# 8. Execution
main "$@"