"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getCurrentUser = getCurrentUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const config_1 = require("../config");
/**
 * Register a new user
 */
async function register(req, res) {
    try {
        const { username, email, password, displayName } = req.body;
        // Check if user already exists
        const existingUser = await user_model_1.UserModel.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'User with this email or username already exists',
                },
            });
        }
        // Create new user
        const user = new user_model_1.UserModel({
            username,
            email,
            password, // Will be hashed by the pre-save hook
            displayName: displayName || username,
        });
        await user.save();
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, config_1.config.jwtSecret, { expiresIn: '7d' });
        // Return user data (without password) and token
        return res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    isAdmin: user.isAdmin,
                },
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'An error occurred during registration',
            },
        });
    }
}
/**
 * Login user
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await user_model_1.UserModel.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or password',
                },
            });
        }
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or password',
                },
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, config_1.config.jwtSecret, { expiresIn: '7d' });
        // Return user data (without password) and token
        return res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    isAdmin: user.isAdmin,
                },
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'An error occurred during login',
            },
        });
    }
}
/**
 * Get current user
 */
async function getCurrentUser(req, res) {
    try {
        // User should be attached to request by auth middleware
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Not authenticated',
                },
            });
        }
        const user = await user_model_1.UserModel.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                },
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                isAdmin: user.isAdmin,
            },
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'An error occurred while fetching user data',
            },
        });
    }
}
//# sourceMappingURL=auth.controller.js.map