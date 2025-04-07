#!/bin/bash

# 1. Define configuration constants
readonly REQUIRED_CONFIRMATION="yes"

# 2. Utility functions
show_usage() {
    echo "Usage: ./update-db-prod.sh <migration-name>"
}

check_arguments() {
    if [ -z "$1" ]; then
        echo "❌ Error: You must provide a migration name."
        show_usage
        exit 1
    fi
}

confirm_production_deployment() {
    echo "⚠️  WARNING: You are about to apply a database migration in PRODUCTION!"
    read -p "❓ Are you sure you want to continue? (yes/no): " confirm

    if [[ "$confirm" != "${REQUIRED_CONFIRMATION}" ]]; then
        echo "❌ Operation cancelled."
        exit 1
    fi
}

deploy_migration() {
    echo "🚀 Deploying migration in production..."
    npx prisma migrate deploy

    echo "⚙️ Generating Prisma Client..."
    npx prisma generate
}

# 3. Error handling
handle_error() {
    echo "❌ Error occurred in script at line $1"
    exit 1
}

# 4. Script configuration
set -e  # Exit on error
trap 'handle_error $LINENO' ERR

# 5. Main function
main() {
    check_arguments "$1"
    confirm_production_deployment
    deploy_migration
    echo "✅ Production database updated and Prisma Client ready!"
}

# 6. Execution
main "$@"