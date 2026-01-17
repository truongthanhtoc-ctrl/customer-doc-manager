/**
 * config.js
 * Manages user configuration (GitHub Token, Repo details).
 * Uses LocalStorage to persist sensitive data on the client side only.
 */

const STORAGE_KEY = 'customer_doc_manager_config';

// 预置配置（仅用于个人使用）
// 警告：Token会暴露在前端代码中，仅适用于私有仓库或个人使用
const DEFAULT_CONFIG = {
    token: 'ghp_EO3jdWJvwDmwWoFCYPqjbHZjCqzXJp1hYiDk',
    owner: 'truongthanhtoc-ctrl',
    repo: 'customer-doc-manager'
};

export const Config = {
    // Get default configuration for auto-fill
    getDefaultConfig() {
        return DEFAULT_CONFIG;
    },
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
