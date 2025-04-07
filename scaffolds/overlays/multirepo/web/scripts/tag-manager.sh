#!/bin/bash

# =============================
# Tag Manager - A script to manage package versions and git tags
# Used by the .husky/pre-push hook
# =============================

# 1. Define configuration constants
readonly RC_BRANCH_PREFIX="rc-"
readonly VERSION_PATTERN="^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$"

# 2. Global variables declaration
current_branch=""
version=""
remote_tag_exists="false"
local_tag_exists="false"
update_decision="no"
bump_type=""
prerelease=""
custom_version=""
new_version=""

# 3. Utility functions
show_usage() {
  echo "Usage: ./tag-manager.sh <branch-name>"
  echo "Optional: Add 'skip' as second argument to skip prompts (for CI/CD)"
}

wait_for_input() {
  echo ""
  echo "Press Enter to continue..." > /dev/tty
  read dummy < /dev/tty
}

get_user_input() {
  local prompt="$1"
  local var_name="$2"
  local default="$3"

  # Display prompt without extra line break
  printf "%s " "$prompt" > /dev/tty

  # Handle default value if provided
  if [ -n "$default" ]; then
    printf "[default: %s]: " "$default" > /dev/tty
  fi

  # Read user input
  read user_input < /dev/tty

  # Use default if input is empty and default is provided
  if [ -z "$user_input" ] && [ -n "$default" ]; then
    user_input="$default"
  fi

  # Return the input via a variable name
  eval "$var_name='$user_input'"
}

check_arguments() {
  if [ -z "$1" ]; then
    echo "❌ Error: Branch name not provided"
    show_usage
    exit 1
  fi

  current_branch="$1"

  # Check if we're on a release candidate branch
  if [[ ! "$current_branch" =~ ^${RC_BRANCH_PREFIX} ]]; then
    echo "This is not a release candidate branch."
    echo "NOTE: To use automatic version and tag management, name your branches with '${RC_BRANCH_PREFIX}' prefix"
    echo "      (e.g., '${RC_BRANCH_PREFIX}feature', '${RC_BRANCH_PREFIX}bugfix', etc.)"
    exit 0
  fi

  clear
  echo "┌────────────────────────────────────────────────┐"
  echo "│ 🚀 Tag Manager                                 │"
  echo "└────────────────────────────────────────────────┘"
  echo ""
  echo "Branch: $(tput bold)$current_branch$(tput sgr0)"
  echo ""
}

check_state_version() {
  local check_stage=$1
  # Get current version from package.json
  version=$(node -p "require('./package.json').version")

  # Check if tag exists on remote
  remote_tag_exists="false"
  if git ls-remote --tags origin "refs/tags/v$version" 2>/dev/null | grep -q "refs/tags/v$version"; then
    remote_tag_exists="true"
  fi

  # Check if tag exists locally
  local_tag_exists="false"
  if git rev-parse "v$version" >/dev/null 2>&1; then
    local_tag_exists="true"
  fi

  # Display version state section
  echo "┌────────────────────────────────────────────────┐"
  if [ "$check_stage" = "before_update" ]; then
    echo "│ 📋 Current Version Status                      │"
  else
    echo "│ 📋 Updated Version Status                      │"
  fi
  echo "└────────────────────────────────────────────────┘"
  echo ""
  echo "📦 Version: $(tput bold)v$version$(tput sgr0)"

  if [ "$remote_tag_exists" != "true" ]; then
    echo "$(tput setaf 2)✓$(tput sgr0) Remote: Tag does not exist yet"
  else
    echo "$(tput setaf 3)⚠$(tput sgr0) Remote: Tag already exists"
    if [ "$check_stage" = "after_update" ]; then
      echo "  $(tput setaf 3)⚠$(tput sgr0) WARNING: Pushing will overwrite the existing remote tag"
    fi
  fi
  echo ""
}

propose_version_update() {
  update_decision="no"
  bump_type=""
  prerelease=""
  custom_version=""

  # Version decision section
  echo "┌────────────────────────────────────────────────┐"
  echo "│ 🔄 Version Management                          │"
  echo "└────────────────────────────────────────────────┘"
  echo ""

  # Ask if user wants to update version
  if [ "$version" = "0.0.0" ]; then
    echo "$(tput setaf 3)⚠$(tput sgr0) Version 0.0.0 detected. It's recommended to update this version as it should not be tagged."
    echo ""
    get_user_input "Do you want to update the package version? (y/n)" update_decision
  elif [ "$remote_tag_exists" = "true" ]; then
    echo "$(tput setaf 3)⚠$(tput sgr0) WARNING: This tag already exists on the remote repository."
    echo "  If you continue without updating the version, the existing tag data will be overwritten."
    echo ""
    get_user_input "Do you want to update the package version? (y/n)" update_decision
  else
    echo "ℹ️  The remote tag will be created and updated on merge"
    echo ""
    get_user_input "Do you want to update the package version? (y/n)" update_decision
  fi

  # If user doesn't want to update, check if we need to confirm overwrite
  if [ "$update_decision" != "y" ]; then
    if [ "$remote_tag_exists" = "true" ]; then
      echo ""
      echo "$(tput setaf 3)⚠$(tput sgr0) WARNING: Continuing with existing version v$version will overwrite the remote tag data."
      echo ""
      get_user_input "Do you want to proceed and overwrite the remote tag? (y/n)" confirm_overwrite
      if [ "$confirm_overwrite" != "y" ]; then
        echo "$(tput setaf 1)❌ Push aborted. Please update the version before pushing.$(tput sgr0)"
        exit 1
      fi
    fi
    return 0
  fi

  # Show version selection menu
  echo ""
  echo "$(tput bold)Select version update type:$(tput sgr0)"
  echo "───────────────────────────────────────────────────"
  echo "1) $(tput bold)patch$(tput sgr0): Bug fixes and minor changes [e.g. 1.0.0 → 1.0.1]"
  echo "2) $(tput bold)minor$(tput sgr0): New features backward compatible [e.g. 1.0.0 → 1.1.0]"
  echo "3) $(tput bold)major$(tput sgr0): Breaking changes [e.g. 1.0.0 → 2.0.0]"
  echo "4) $(tput bold)custom$(tput sgr0): Specify a custom version [e.g. 0.0.1]"
  echo ""

  # If version is 0.0.0, suggest starting with 0.1.0 as default
  if [ "$version" = "0.0.0" ]; then
    echo "$(tput setaf 4)ℹ$(tput sgr0) For initial release, minor version (option 2) is recommended."
    echo ""
  fi

  get_user_input "Enter choice (1-4)" version_type

  case $version_type in
    1) bump_type="patch" ;;
    2) bump_type="minor" ;;
    3) bump_type="major" ;;
    4) bump_type="custom" ;;
    *)
      echo "Invalid choice. Continuing with existing version."
      update_decision="no"
      return 0
      ;;
  esac

  # If custom version is selected
  if [ "$bump_type" = "custom" ]; then
    echo ""
    get_user_input "Enter custom version (without the 'v' prefix, e.g., 0.0.1)" custom_version

    if [[ ! "$custom_version" =~ $VERSION_PATTERN ]]; then
      echo "$(tput setaf 1)❌ Invalid version format. Must be in format like 1.2.3 or 1.2.3-alpha$(tput sgr0)"
      update_decision="no"
      return 1
    fi
  # Otherwise ask for pre-release status for non-custom versions
  else
    echo ""
    echo "$(tput bold)Select pre-release status:$(tput sgr0)"
    echo "───────────────────────────────────────────────────"
    echo "0) $(tput bold)none$(tput sgr0): Not a pre-release version (DEFAULT)"
    echo "1) $(tput bold)alpha$(tput sgr0): Early internal testing"
    echo "2) $(tput bold)beta$(tput sgr0): Public testing but still unstable"
    echo "3) $(tput bold)rc$(tput sgr0): Release candidate, ready to be published publicly"
    echo ""
    get_user_input "Enter choice (0-3)" prerelease_type "0"

    case $prerelease_type in
      0) prerelease="" ;;
      1) prerelease="alpha" ;;
      2) prerelease="beta" ;;
      3) prerelease="rc" ;;
      *) prerelease="" ;;
    esac
  fi

  # Show a summary of what will happen
  if [ "$bump_type" = "custom" ]; then
    echo "$(tput setaf 2)✅ Package.json will be updated to version $(tput bold)v$custom_version$(tput sgr0)$(tput setaf 2) and committed on branch $(tput sgr0)$(tput bold)$current_branch$(tput sgr0)"
  elif [ -z "$prerelease" ]; then
    # Calculate the expected version based on bump_type for display purposes
    case $bump_type in
      "patch") display_version=$(echo $version | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g') ;;
      "minor") display_version=$(echo $version | awk -F. '{$(NF-1) = $(NF-1) + 1; $NF = 0;} 1' | sed 's/ /./g') ;;
      "major") display_version=$(echo $version | awk -F. '{$1 = $1 + 1; $(NF-1) = 0; $NF = 0;} 1' | sed 's/ /./g') ;;
      *) display_version="unknown" ;;
    esac
    echo "$(tput setaf 2)✅ Package.json will be updated to version $(tput bold)v$display_version$(tput sgr0)$(tput setaf 2) and committed on branch $(tput sgr0)$(tput bold)$current_branch$(tput sgr0)"
  else
    # Calculate the expected version based on bump_type for display purposes
    case $bump_type in
      "patch") display_version=$(echo $version | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g') ;;
      "minor") display_version=$(echo $version | awk -F. '{$(NF-1) = $(NF-1) + 1; $NF = 0;} 1' | sed 's/ /./g') ;;
      "major") display_version=$(echo $version | awk -F. '{$1 = $1 + 1; $(NF-1) = 0; $NF = 0;} 1' | sed 's/ /./g') ;;
      *) display_version="unknown" ;;
    esac
    echo "$(tput setaf 2)✅ Package.json will be updated to version $(tput bold)v$display_version-$prerelease$(tput sgr0)$(tput setaf 2) and committed on branch $(tput sgr0)$(tput bold)$current_branch$(tput sgr0)"
  fi
}

update_version() {
  if [ "$update_decision" != "y" ]; then
    if [ "$remote_tag_exists" = "true" ]; then
      echo "$(tput setaf 2)✅ User confirmation to overwrite tag data for tag v$version$(tput sgr0)"
      echo ""
      echo "$(tput setaf 2)✅ Tag management complete$(tput sgr0)"
      wait_for_input
      exit 0  # Exit immediately after user confirms to keep version
    else
      echo "$(tput setaf 4)ℹ$(tput sgr0) Continuing with existing version v$version..."
    fi
    return 0
  fi

  echo ""
  echo "┌────────────────────────────────────────────────┐"
  echo "│ 📝 Updating version...                         │"
  echo "└────────────────────────────────────────────────┘"
  echo ""

  # Update package.json version
  if [ "$bump_type" = "custom" ]; then
    npm --no-git-tag-version version "$custom_version"
  elif [ -z "$prerelease" ]; then
    npm --no-git-tag-version version "$bump_type"
  else
    # Method to correctly update to a prerelease version without numeric suffix
    # First, if we already have a prerelease, revert to stable version
    if [[ $version == *"-"* ]]; then
      clean_version=$(echo $version | cut -d'-' -f1)
      npm --no-git-tag-version version "$clean_version"
    fi

    # Then increment the version according to type (major, minor, patch)
    npm --no-git-tag-version version "$bump_type"

    # Then add the prerelease suffix directly without a number
    current_version=$(node -p "require('./package.json').version")
    echo "Version before adding prefix: $current_version"

    # Directly modify package.json to avoid npm adding a numeric suffix
    # The sed syntax differs on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/\"version\": \"$current_version\"/\"version\": \"$current_version-$prerelease\"/" package.json
    else
      sed -i "s/\"version\": \"$current_version\"/\"version\": \"$current_version-$prerelease\"/" package.json
    fi

    # Verification to ensure the version has been updated correctly
    updated_version=$(node -p "require('./package.json').version")
    echo "Version after adding prefix: $updated_version"

    # If the version was not updated correctly, display an error message
    if [[ "$updated_version" != "$current_version-$prerelease" ]]; then
      echo "$(tput setaf 1)❌ Error updating version. Expected: $current_version-$prerelease, Got: $updated_version$(tput sgr0)"
      # Alternative correction attempt
      echo "Attempting correction..."
      npm version "$current_version-$prerelease" --no-git-tag-version --allow-same-version
    fi
  fi

  # Get new version after update
  new_version=$(node -p "require('./package.json').version")

  # Add package.json to staging
  git add package.json
  if [ -f "package-lock.json" ]; then
    git add package-lock.json
  fi

  # Check if there are changes to commit
  if ! git diff --cached --quiet; then
    # Commit the updated package.json with --no-verify to skip hooks
    git commit --no-verify -m "chore: bump version to v$new_version"
    echo "$(tput setaf 2)✅ Updated version to $(tput bold)v$new_version$(tput sgr0)"
  else
    echo "$(tput setaf 3)⚠ No changes to commit. Version might be already at v$new_version$(tput sgr0)"
    # Force update of the new_version variable
    new_version=$(node -p "require('./package.json').version")
  fi

  echo ""

  # Update global version variable
  version=$new_version
}

confirm_update() {
  # Create tag if it doesn't exist locally (silently)
  if ! git rev-parse "v$version" >/dev/null 2>&1; then
    git tag -a "v$version" -m "Release version $version" >/dev/null 2>&1
  fi

  # Tag pushing section
  echo "┌────────────────────────────────────────────────┐"
  echo "│ 🏷️  Tag Management                             │"
  echo "└────────────────────────────────────────────────┘"
  echo ""

  # Ask user if they want to push tags
  get_user_input "Do you want to push this tag to the remote repository? (y/n)" push_tags

  if [ "$push_tags" = "y" ]; then
    echo "$(tput setaf 4)🚀 Pushing tag v$version to remote repository...$(tput sgr0)"
    # Use --no-verify to bypass the pre-push hook and avoid recursion
    git push --no-verify origin "v$version"
    echo "$(tput setaf 2)✅ Tag v$version pushed to remote repository successfully$(tput sgr0)"
  else
    echo "$(tput setaf 4)ℹ$(tput sgr0) Tag will not be pushed automatically. You can push it later with:"
    echo "    $(tput bold)git push --no-verify origin v$version$(tput sgr0)"
  fi

  echo ""
  echo "$(tput setaf 2)✅ Tag management complete$(tput sgr0)"
  wait_for_input
  exit 0  # Exit script after tag management to avoid additional sections
}

# 4. Error handling
handle_error() {
  echo "❌ Error occurred in script at line $1"
  wait_for_input
  exit 1
}

# 5. Script configuration
set -e  # Exit on error
trap 'handle_error $LINENO' ERR

# 6. Main function with clear steps
main() {
  check_arguments "$@" # Step 1: Check arguments and branch
  check_state_version "before_update" # Step 2: Check current version state
  propose_version_update # Step 3: Propose version update
  update_version # Step 4: Update version if requested

  # Only continue if version was updated or no remote tag exists
  if [ "$update_decision" = "y" ] || [ "$remote_tag_exists" != "true" ]; then
    check_state_version "after_update" # Step 5: Check new version state
    confirm_update # Step 6: Confirm update and tag management
  fi
}

# 7. Execution
main "$@"