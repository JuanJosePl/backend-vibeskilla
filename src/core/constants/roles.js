/**
 * @constant ROLES
 * @description Roles disponibles en el sistema
 */
const ROLES = {
  CUSTOMER: 'customer',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

/**
 * @constant ROLE_PERMISSIONS
 * @description Permisos disponibles por cada rol
 */
const ROLE_PERMISSIONS = {
  [ROLES.CUSTOMER]: [
    'read:own',
    'read:products',
    'read:categories',
    'update:own',
    'create:cart',
    'create:review',
    'read:reviews',
    'create:contact',
    'read:wishlist', // 👈 Para módulo wishlist
    'create:wishlist',
    'update:wishlist',
    'delete:wishlist'
  ],
  [ROLES.MODERATOR]: [
    'read:all',
    'update:products',
    'update:categories',
    'delete:reviews',
    'read:contacts',
    'update:contacts',
    'read:users', // 👈 Para módulo admin
    'read:activity' // 👈 Para módulo userActivity
  ],
  [ROLES.ADMIN]: ['*']
};

/**
 * @function hasPermission
 * @description Verifica si un rol tiene un permiso específico
 */
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  // El admin tiene todos los permisos
  if (permissions.includes('*')) {
    return true;
  }
  
  // Verificar permiso exacto
  if (permissions.includes(permission)) {
    return true;
  }
  
  // Verificar permisos con wildcard (ej: 'read:*')
  const [action, resource] = permission.split(':');
  const wildcardPermission = `${action}:*`;
  
  return permissions.includes(wildcardPermission);
};

/**
 * @function isAdmin
 * @description Verifica si un rol es admin o super_admin
 */
const isAdmin = (role) => {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
};

/**
 * @function canAccessResource
 * @description Verifica si un usuario puede acceder a un recurso específico
 */
const canAccessResource = (userRole, userId, resourceOwnerId, permission) => {
  // Admins pueden acceder a todo
  if (isAdmin(userRole)) {
    return true;
  }
  
  // Si el recurso es propio y tiene permiso 'read:own', permitir
  if (userId.toString() === resourceOwnerId.toString() && hasPermission(userRole, 'read:own')) {
    return true;
  }
  
  // Verificar permiso específico
  return hasPermission(userRole, permission);
};

module.exports = {
  ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
  isAdmin,
  canAccessResource
};