"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
// Initialize express app
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigin,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Connect to MongoDB
mongoose_1.default.connect(config_1.config.mongoUri)
    .then(() => {
    console.log('Connected to MongoDB');
})
    .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
});
// Routes
app.use('/api/auth', auth_routes_1.default);
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: {
            message: 'An unexpected error occurred',
        },
    });
});
// Start server
const PORT = config_1.config.port;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${config_1.config.environment}`);
});
//# sourceMappingURL=index.js.map