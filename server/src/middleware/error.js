export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal Server Error" : (err.message || "Internal Server Error")
  });
};

export default errorHandler;
