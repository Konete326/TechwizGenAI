export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? "AI service is temporarily busy. Please try again in a moment."
      : (err.message || "Service is currently unavailable. Please try again.")
  });
};

export default errorHandler;
