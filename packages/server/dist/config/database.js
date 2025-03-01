import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab';
/**
 * Connect to MongoDB
 */
export async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
}
/**
 * Disconnect from MongoDB
 */
export async function disconnectFromDatabase() {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
    catch (error) {
        console.error('Failed to disconnect from MongoDB', error);
    }
}
/**
 * Get the MongoDB connection
 */
export function getConnection() {
    return mongoose.connection;
}
//# sourceMappingURL=database.js.map