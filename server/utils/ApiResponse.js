const success = ({ res, statusCode = 200, message, data = null, meta = {} }) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...meta,
  });
};

const error = ({ res, statusCode = 500, message, errors = null }) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = {
  success,
  error,
};
