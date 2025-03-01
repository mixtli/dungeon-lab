"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.deepClone = deepClone;
exports.isEqual = isEqual;
exports.formatDate = formatDate;
exports.parseDate = parseDate;
/**
 * Generate a random ID
 * @returns A random ID string
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
/**
 * Deep clone an object
 * @param obj The object to clone
 * @returns A deep clone of the object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Check if two objects are equal
 * @param obj1 The first object
 * @param obj2 The second object
 * @returns True if the objects are equal, false otherwise
 */
function isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}
/**
 * Format a date as a string
 * @param date The date to format
 * @returns The formatted date string
 */
function formatDate(date) {
    return date.toISOString();
}
/**
 * Parse a date string
 * @param dateString The date string to parse
 * @returns The parsed date
 */
function parseDate(dateString) {
    return new Date(dateString);
}
//# sourceMappingURL=utils.js.map