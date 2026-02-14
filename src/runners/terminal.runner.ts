import chalk from 'chalk'
import ora from 'ora'
import { exec } from 'shelljs'

/**
 * Opens a new terminal tab or window with contextual directory and optional command
 * @param directory The directory to open the terminal in
 * @param options Optional command and description
 * @returns Promise<boolean> indicating success or failure
 */
export async function openTerminal(directory: string, options?: { command?: string; description?: string }): Promise<boolean> {
  const { command, description } = options || {}
  const spinnerText = description || (command ? `Running command in terminal...` : `Opening terminal...`)
  const spinner = ora(spinnerText).start()

  try {
    // Get the absolute path
    const absolutePath = `${process.cwd()}/${directory}`
    let success = false

    // Check if we're in WSL
    const isWsl = process.platform === 'linux' && process.env.WSL_DISTRO_NAME
    const platform = isWsl ? 'wsl' : process.platform

    // Use different commands based on the operating system
    switch (platform) {
      case 'darwin': {
        // macOS - try iTerm2 first, then fallback to Terminal.app
        try {
          // Check if iTerm2 is installed
          await exec('osascript -e "tell application \\"iTerm\\" to version"', { silent: true })

          // iTerm2 is installed, use a more permissive approach for new tab
          const script = `
          tell application "iTerm"
            tell current window
              create tab with default profile
              tell current session
                write text "cd ${absolutePath}${command ? ` && ${command}` : ''}"
              end tell
            end tell
          end tell
        `
          await exec(`osascript -e '${script}'`)
          success = true
        } catch {
          // iTerm2 not found or error, use Terminal.app
          await exec(
            `osascript -e 'tell application "Terminal" to tell application "System Events" to keystroke "t" using {command down}' -e 'tell application "Terminal" to do script "cd ${absolutePath}${command ? ` && ${command}` : ''}" in front window'`
          )
          success = true
        }
        break
      }
      case 'win32': {
        // Windows - check for Windows Terminal
        const hasWindowsTerminal = (await exec('where wt.exe', { silent: true }).code) === 0

        if (hasWindowsTerminal) {
          // Windows Terminal
          if (command) {
            await exec(`wt.exe -w 0 nt -d "${absolutePath}" cmd /k ${command}`)
          } else {
            await exec(`wt.exe -w 0 nt -d "${absolutePath}"`)
          }
          success = true
        } else {
          // Fallback to cmd
          await exec(`start cmd.exe /K "cd ${absolutePath}${command ? ` && ${command}` : ''}"`)
          success = true
        }
        break
      }
      case 'wsl': {
        // WSL - use the default shell
        if (command) await exec(`cd ${absolutePath} && ${command}`)
        else await exec(`cd ${absolutePath}`)
        success = true
        break
      }
      default: {
        // Linux - try to detect current terminal
        const terminals = [
          {
            name: 'gnome-terminal',
            command: (path: string, cmd?: string) =>
              cmd ? `gnome-terminal --tab --working-directory="${path}" -- bash -c "${cmd}; bash"` : `gnome-terminal --tab --working-directory="${path}" -- bash`
          },
          { name: 'konsole', command: (path: string, cmd?: string) => (cmd ? `konsole --new-tab --workdir "${path}" -e bash -c "${cmd}; bash"` : `konsole --new-tab --workdir "${path}"`) },
          { name: 'xterm', command: (path: string, cmd?: string) => (cmd ? `xterm -e "cd ${path} && ${cmd}; bash"` : `xterm -e "cd ${path} && bash"`) }
        ]

        for (const terminal of terminals) {
          try {
            if (command) {
              await exec(terminal.command(absolutePath, command))
            } else {
              await exec(terminal.command(absolutePath))
            }
            success = true
            break
          } catch {
            // Try next terminal
            continue
          }
        }
      }
    }

    if (success) {
      spinner.succeed(chalk.green(command ? `Command started in new terminal tab` : `Terminal opened successfully`))
    } else {
      spinner.fail(chalk.red(`Failed to open terminal`))
    }

    return success
  } catch (error) {
    spinner.fail(chalk.red(`Failed to open terminal`))
    console.error('Failed to open terminal', error)
    return false
  }
}

/**
 * Generates a shell command for initializing Husky and setting up script permissions
 * Uses semicolons instead of && for better AppleScript compatibility
 * @returns A shell command string that handles Husky installation and script permissions
 */
export function getHuskySetupCommand(extraCommand: string = ''): string {
  const huskyCommand = ['npx husky install', 'chmod -R +x .husky 2>/dev/null || true', 'chmod -R +x ./scripts/*.sh 2>/dev/null || true']

  if (extraCommand) {
    huskyCommand.push(extraCommand)
  }

  return huskyCommand.join('; ')
}
