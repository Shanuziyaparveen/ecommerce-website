const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging purposes

  // Default status code to 500 if not provided
  const statusCode = err.status || 500;

  // Map of status codes to user-friendly messages
  const errorMessages = {
      400: 'Bad Request: The server could not understand the request.',
      401: 'Unauthorized: Access is denied due to invalid credentials.',
      403: 'Forbidden: You don’t have permission to access this resource.',
      404: 'Not Found: The requested resource could not be found.',
      500: 'Internal Server Error: Something went wrong on our end.',
      502: 'Bad Gateway: The server received an invalid response from the upstream server.',
      503: 'Service Unavailable: The server is temporarily unable to handle the request.',
      504: 'Gateway Timeout: The server did not receive a timely response.'
  };

  // Select the message based on the status code, or default to a generic one
  const userFriendlyMessage = errorMessages[statusCode] || 'An unexpected error occurred.';

  res.status(statusCode).render('error', { 
    errorMessage: userFriendlyMessage,
    statusCode 
});

};

module.exports = errorHandler;
