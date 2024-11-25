// utils/errorHandler.js
const renderAdminErrorPage = (res, errorMessage = "An error occurred.") => {
    res.status(500).render("admin-error", { errorMessage });
  };
  
  module.exports = { renderAdminErrorPage };
  