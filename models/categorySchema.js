
const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    categoryOffer: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collation: { locale: "en", strength: 1 } } // Case-sensitive collation
);

// Create an index on 'name' for uniqueness with case-sensitivity
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 1 } });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
