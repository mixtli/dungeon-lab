import mongoose from 'mongoose';
import { config } from './config/index.js';
import { configurePassport } from './config/passport.js';
import { createApp } from './app.js';
async function startServer() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');
        // Configure Passport
        configurePassport();
        console.log('Passport configured');
        // Create and configure Express app
        const app = await createApp();
        // Start server
        const PORT = config.port;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
startServer().catch(error => {
    console.error('Unhandled server startup error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map