// js/balanceManager.js

import { getAuthenticatedUser } from './auth.js';

let userBalance = null;

/**
 * Fetches the user's balance from the server and stores it.
 * @param {boolean} forceRefresh - If true, fetches data from the server even if cached.
 * @returns {Promise<object>} - A promise that resolves with the user's balance object.
 */
export const getBalance = async (forceRefresh = false) => {
    if (userBalance && !forceRefresh) {
        return userBalance;
    }

    try {
        const user = await getAuthenticatedUser(forceRefresh);
        if (user && user.balances) {
            userBalance = user.balances;
            // Optionally, dispatch an event to notify other parts of the app about the update
            document.dispatchEvent(new CustomEvent('balanceUpdated', { detail: userBalance }));
            return userBalance;
        }
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return null;
    }
};

/**
 * Updates the local balance cache.
 * @param {object} newBalance - The new balance object.
 */
export const updateBalance = (newBalance) => {
    userBalance = newBalance;
    document.dispatchEvent(new CustomEvent('balanceUpdated', { detail: userBalance }));
};

/**
 * Retrieves the currently stored balance without fetching.
 * @returns {object|null} - The current balance object or null if not set.
 */
export const getCurrentBalance = () => {
    return userBalance;
};
