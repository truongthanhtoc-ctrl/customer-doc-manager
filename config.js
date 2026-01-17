/**
 * config.js
 * Manages user configuration (GitHub Token, Repo details).
 * Uses LocalStorage to persist sensitive data on the client side only.
 */

const STORAGE_KEY = 'customer_doc_manager_config';

export const Config = {
    // Get current configuration
    get() {
        const data = localStorage.getItem(STORAGE_KEY);
        try {
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Config parse error', e);
            return null;
        }
    },

    // Save configuration
    save(token, owner, repo) {
        // Basic validation
        if (!token || !owner || !repo) {
            throw new Error('All fields (Token, Owner, Repo) are required.');
        }
        const config = { token, owner, repo };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return config;
    },

    // Clear configuration (Logout)
    clear() {
        localStorage.removeItem(STORAGE_KEY);
    },

    // Check if configured
    isConfigured() {
        const config = this.get();
        return config && config.token && config.owner && config.repo;
    }
};
