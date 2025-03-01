"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.disconnectFromDatabase = disconnectFromDatabase;
exports.getConnection = getConnection;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab';
/**
 * Connect to MongoDB
 */
async function connectToDatabase() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
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
async function disconnectFromDatabase() {
    try {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
    catch (error) {
        console.error('Failed to disconnect from MongoDB', error);
    }
}
/**
 * Get the MongoDB connection
 */
function getConnection() {
    return mongoose_1.default.connection;
}
//# sourceMappingURL=database.js.map