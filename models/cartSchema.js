const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                productName: {
                    type: String,
                    
                },
                quantity: {
                    type: Number,
                    default: 1,
                },
                regularPrice: {
                    type: Number,
                    
                },
                price: {
                    type: Number,
                    required: true,
                },
                totalPrice: {
                    type: Number,
                    required: true,
                },
                status: {
                    type: String,
                    default: "placed",
                },
                cancellationReason: {
                    type: String,
                    default: "none",
                },
            },
        ],
        cartTotal: {
            type: Number,
            required: true,
            default: 0, // Defaulting cartTotal to 0 initially
        },
    },
    { timestamps: true }
);

// Pre-save hook to calculate totalPrice for each item and cartTotal
cartSchema.pre("save", function (next) {
    this.items.forEach((item) => {
        item.totalPrice = item.quantity * item.price;
    });

    this.cartTotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
    next();
});

// Hook for updates to recalculate totalPrice and cartTotal when items are modified
cartSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.items) {
        update.$set.items.forEach(item => {
            item.totalPrice = item.quantity * item.price;
        });
    }

    if (update.$set && update.$set.items) {
        const updatedItems = update.$set.items;
        update.$set.cartTotal = updatedItems.reduce((total, item) => total + item.totalPrice, 0);
    }

    next();
});

// Hook for updates using `updateOne` or other update methods
cartSchema.pre('updateOne', function(next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.items) {
        update.$set.items.forEach(item => {
            item.totalPrice = item.quantity * item.price;
        });
        update.$set.cartTotal = update.$set.items.reduce((total, item) => total + item.totalPrice, 0);
    }
    next();
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
