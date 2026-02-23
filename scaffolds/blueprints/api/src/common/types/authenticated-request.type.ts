import { User, Role, RoleModuleLink, Module, RolePermissionLink, ModulePermission, UserRoleLink } from '@/generated/prisma/client'
import { Request } from 'express'

export type AuthenticatedUser = User & {
  rolesLinked: (UserRoleLink & {
    role: Role & {
      modulesLinked: (RoleModuleLink & {
        module: Module
      })[]
      permissionsLinked: (RolePermissionLink & {
        permission: ModulePermission
      })[]
    }
  })[]
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser
}
