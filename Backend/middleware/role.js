const { sendResponse } = require('../utils/response');

const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendResponse(res, 403, false, null, 'Access denied. No role found.');
    }

    // specific admin rule -> Admin is GET-only everywhere, any PATCH=403
    if (req.user.role === 'admin' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return sendResponse(res, 403, false, null, 'Admins have read-only access.');
    }

    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      return sendResponse(res, 403, false, null, 'Access denied for this role.');
    }
  };
};

module.exports = roleGuard;
