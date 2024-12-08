// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging
  
    // Check if the error has a status code, otherwise set to 500
    const statusCode = err.status || 500;
  
   
      res.status(statusCode).render('error', { errorMessage: err.message || 'Server Error' });
   
  };
  
  module.exports = errorHandler;
  