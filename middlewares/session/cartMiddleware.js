// Middleware to initialize cart in session
const cartMiddleware = (req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = {
            items: [],
            cartTotal: 0, // Initialize with zero total
        };
    }
    next();
};

module.exports = cartMiddleware;
