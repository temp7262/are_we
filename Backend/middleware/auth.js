const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response');

const verifyToken = (req, res, next) => {
  let token = req.headers.authorization || req.query.token;

  if (!token) {
    return sendResponse(res, 403, false, null, 'A token is required for authentication');
  }

  try {
    token = token.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, ... }
  } catch (err) {
    return sendResponse(res, 401, false, null, 'Invalid Token');
  }
  return next();
};

module.exports = verifyToken;
