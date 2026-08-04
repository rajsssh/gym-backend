// function errorHandler(err, req, res, next) {
//   console.error(err);
//   res.status(err.status || 500).json({
//     error: err.message || 'Internal Server Error'
//   });
// }

// module.exports = errorHandler;


export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    success: false,
    message,
  });
}
