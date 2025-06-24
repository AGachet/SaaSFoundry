/**
 * Resources
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

/**
 * Dependencies
 */
import { FULL_ACCESS, MODULE_KEY, PERMISSIONS_KEY, REQUIRE_ALL_KEY } from '@common/decorators/require-permissions.decorator'
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'

/**
 * Declaration
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private logger: Logger
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()])
    const requiredModule = this.reflector.getAllAndOverride<string>(MODULE_KEY, [context.getHandler(), context.getClass()])
    const requireAll = this.reflector.getAllAndOverride<boolean>(REQUIRE_ALL_KEY, [context.getHandler(), context.getClass()])

    // If no module required, allow access
    if (!requiredModule) return true

    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id

    if (!userId) {
      this.logger.warn('Access denied: No user ID found in request', 'PermissionsGuard')
      throw new UnauthorizedException('Authentication required')
    }

    // Get user with roles, modules, and permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        rolesLinked: {
          where: {
            role: {
              isActive: true
            }
          },
          include: {
            role: {
              include: {
                modulesLinked: {
                  where: {
                    module: {
                      name: requiredModule,
                      isActive: true
                    }
                  }
                },
                permissionsLinked: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      this.logger.warn(`Access denied: User not found: ${userId}`, 'PermissionsGuard')
      throw new UnauthorizedException('User not found')
    }

    // Verify if user has access to the required module
    const hasModuleAccess = user.rolesLinked.some((userRole) => userRole.role.modulesLinked.length > 0)

    if (!hasModuleAccess) {
      this.logger.warn(`Access denied: User ${userId} does not have access to ${requiredModule} module`, 'PermissionsGuard')
      throw new UnauthorizedException(`You do not have access to ${requiredModule.toLowerCase().replace('_', ' ')}`)
    }

    // If no permissions required, it's a read-only access
    if (!requiredPermissions || requiredPermissions.length === 0) return true

    // If FULL_ACCESS is required, just check module access (already done above)
    if (requiredPermissions.includes(FULL_ACCESS)) return true

    // Check if user has all required permissions
    const userPermissions = user.rolesLinked.flatMap((userRole) => userRole.role.permissionsLinked.map((permissionLink) => permissionLink.permission.name))

    // If requireAll is false, check if user has at least one required permission
    // Otherwise, check if user has all required permissions (default behavior)
    const hasRequiredPermissions =
      requireAll === false ? requiredPermissions.some((permission) => userPermissions.includes(permission)) : requiredPermissions.every((permission) => userPermissions.includes(permission))

    if (!hasRequiredPermissions) {
      const requiredText = requireAll === false ? 'at least one of' : 'all of'
      this.logger.warn(`Access denied: User ${userId} does not have ${requiredText} required permissions: ${requiredPermissions.join(', ')}`, 'PermissionsGuard')
      throw new UnauthorizedException('You do not have the required permissions')
    }

    return true
  }
}
