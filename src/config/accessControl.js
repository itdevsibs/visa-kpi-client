// Shared configuration for role-based access control across routes

export const ROLE_PERMISSIONS = {
  ADMINISTRATOR: ["/dashboard", "/performance", "/settings"],
  OPERATIONS_MANAGER: ["/dashboard", "/performance"],
  TEAM_LEADER: ["/dashboard", "/performance"],
  EMPLOYEE: ["/dashboard"],
};

export const hasAccess = (role, path) => {
  const normalizedRole = role.toUpperCase().replace(" ", "_");
  const allowedPaths = ROLE_PERMISSIONS[normalizedRole];
  
  if (!allowedPaths) return false;
  return allowedPaths.some(allowed => path.startsWith(allowed));
};
