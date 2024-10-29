const DataURIParser = require("datauri/parser");
const path = require("path");

// Function to convert file to data URI
const getDataUri = (file) => {
  const parser = new DataURIParser();
  const extName = path.extname(file.originalname).toString();
  return parser.format(extName, file.buffer);
};

// Function to validate a minimum of 3 images
const validateImageCount = (files) => {
  if (!files || files.length < 3) {
    throw new Error("At least 3 images are required!");
  }
  return files.map(file => getDataUri(file)); // Convert each file to Data URI
};

module.exports = { getDataUri, validateImageCount };
