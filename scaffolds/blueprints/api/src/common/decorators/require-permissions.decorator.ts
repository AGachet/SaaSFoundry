import { SetMetadata } from '@nestjs/common'

export const PERMISSIONS_KEY = 'permissions'
export const MODULE_KEY = 'required_module'
export const REQUIRE_ALL_KEY = 'require_all_permissions'

// Special permission to indicate full access without specific permissions
export const FULL_ACCESS = '$_FULL_ACCESS'

export interface PermissionRequirement {
  module: string
  permissions: string[]
  requireAll?: boolean
}

export interface PermissionOptions {
  requireAll?: boolean
}

export const RequirePermissions = (permissions: string[], module: string, options?: PermissionOptions) => {
  const requireAll = options?.requireAll !== undefined ? options.requireAll : true

  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key!, descriptor!)
    SetMetadata(MODULE_KEY, module)(target, key!, descriptor!)
    SetMetadata(REQUIRE_ALL_KEY, requireAll)(target, key!, descriptor!)
    return descriptor
  }
}
