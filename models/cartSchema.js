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
                    min: [1, 'Quantity cannot be less than 1'],
                },
                regularPrice: {
                    type: Number,
                },
                price: {
                    type: Number,
                    required: true,
                    min: [0, 'Price must be a positive number'],
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
        coupon: {
            applied: {
                type: Boolean,
                default: false,
            },
            code: {
                type: String,
                default: "", // Store the coupon code if applied
            },
            discount: {
                type: Number,
                default: 0, // Store the discount value (as a percentage or fixed amount)
            },
        }, wallet: {
            used: {
                type: Number,
                default: 0, // Amount of wallet balance used for the current cart
            },
            remaining: {
                type: Number,
                default: 0, // Remaining wallet balance after usage
            },
        },
    },
    { timestamps: true }
);
// Pre-save hook to calculate totalPrice for each item and cartTotal
cartSchema.pre("save", function (next) {
    this.items.forEach((item) => {
        // Validate the price and quantity
        if (item.price <= 0) {
            return next(new Error('Price must be a positive number.'));
        }
        if (item.quantity < 1) {
            return next(new Error('Quantity must be at least 1.'));
        }

        item.totalPrice = item.quantity * item.price;
    });

    // Recalculate cart total based on item prices
    this.cartTotal = this.items.reduce((total, item) => total + item.totalPrice, 0);

    // Apply coupon discount if any
    if (this.coupon.applied) {
        if (this.coupon.discountType === 'percentage') {
            // Apply percentage discount
            const discountAmount = (this.coupon.discount / 100) * this.cartTotal;
            this.cartTotal -= discountAmount; // Reduce the cart total by the discount amount
        } else if (this.coupon.discountType === 'fixed') {
            // Apply fixed discount
            this.cartTotal -= this.coupon.discount;
        }
    }

    next();
});

// Hook for updates to recalculate totalPrice and cartTotal when items are modified
cartSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.items) {
        update.$set.items.forEach(item => {
            // Ensure valid price and quantity before recalculating
            if (item.price <= 0) {
                return next(new Error('Price must be a positive number.'));
            }
            if (item.quantity < 1) {
                return next(new Error('Quantity must be at least 1.'));
            }
            item.totalPrice = item.quantity * item.price;
        });
    }

    if (update.$set && update.$set.items) {
        const updatedItems = update.$set.items;
        update.$set.cartTotal = updatedItems.reduce((total, item) => total + item.totalPrice, 0);

        // Apply coupon discount if any
        if (update.$set.coupon && update.$set.coupon.applied) {
            if (update.$set.coupon.discountType === 'percentage') {
                // Apply percentage discount
                const discountAmount = (update.$set.coupon.discount / 100) * update.$set.cartTotal;
                update.$set.cartTotal -= discountAmount;
            } else if (update.$set.coupon.discountType === 'fixed') {
                // Apply fixed discount
                update.$set.cartTotal -= update.$set.coupon.discount;
            }
        }
    }

    next();
});

// Hook for updates using `updateOne` or other update methods
cartSchema.pre('updateOne', function(next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.items) {
        update.$set.items.forEach(item => {
            // Ensure valid price and quantity before recalculating
            if (item.price <= 0) {
                return next(new Error('Price must be a positive number.'));
            }
            if (item.quantity < 1) {
                return next(new Error('Quantity must be at least 1.'));
            }
            item.totalPrice = item.quantity * item.price;
        });
        update.$set.cartTotal = update.$set.items.reduce((total, item) => total + item.totalPrice, 0);

        // Apply coupon discount if any
        if (update.$set.coupon && update.$set.coupon.applied) {
            if (update.$set.coupon.discountType === 'percentage') {
                // Apply percentage discount
                const discountAmount = (update.$set.coupon.discount / 100) * update.$set.cartTotal;
                update.$set.cartTotal -= discountAmount;
            } else if (update.$set.coupon.discountType === 'fixed') {
                // Apply fixed discount
                update.$set.cartTotal -= update.$set.coupon.discount;
            }
        }
    }
    next();
});


const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
