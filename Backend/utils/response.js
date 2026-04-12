const sendResponse = (res, statusCode, success, data = null, message = '') => {
  return res.status(statusCode).json({
    success,
    data,
    message
  });
};

// Wrappers for Dev 2's code
const error = (res, message, statusCode = 500) => sendResponse(res, statusCode, false, null, message);
const success = (res, data, message, statusCode = 200) => sendResponse(res, statusCode, true, data, message);

module.exports = { sendResponse, success, error };
