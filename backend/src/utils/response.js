/**
 * Utility helper untuk menyeragamkan format respon JSON ke Front-End
 */

export const sendSuccess = (res, message = "Success", data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res, message = "An error occurred", error = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};

