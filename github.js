/**
 * github.js
 * Client for interacting with GitHub REST API.
 * Focuses on reading/writing a single JSON database file.
 */

import { Config } from './config.js';

const API_BASE = 'https://api.github.com/repos';
const DB_FILENAME = 'db.json';
const BRANCH = 'main'; // Target branch, defaults to main

export const GitHub = {
    // Generic fetch wrapper with auth headers
    async request(endpoint, options = {}) {
        const config = Config.get();
        if (!config) throw new Error('并未配置 GitHub 信息');

        const url = `${API_BASE}/${config.owner}/${config.repo}/${endpoint}`;
        const headers = {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            throw new Error('GitHub Token 无效或过期');
        }

        if (response.status === 404) {
            return null; // Resource not found
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`GitHub API Error: ${error.message}`);
        }

        return response.json();
    },

    // Get the database content
    // Returns { content: Object, sha: String } or null if not exists
    async getDB() {
        const data = await this.request(`contents/${DB_FILENAME}?ref=${BRANCH}`);

        if (!data) return null; // File doesn't exist yet

        try {
            // Github API returns content in Base64
            // decodeURIComponent(escape(window.atob(str))) handles UTF-8 correctly
            const content = JSON.parse(decodeURIComponent(escape(window.atob(data.content))));
            return {
                content,
                sha: data.sha
            };
        } catch (e) {
            console.error('Error parsing DB file', e);
            throw new Error('数据库文件损坏或格式错误');
        }
    },

    // Save the database content
    // Requires SHA if updating, null if creating new
    async saveDB(content, sha = null) {
        // Encode content to Base64
        const contentStr = JSON.stringify(content, null, 2);
        // unsed: btoa(unescape(encodeURIComponent(str))) for UTF-8 to Base64
        const contentBase64 = btoa(unescape(encodeURIComponent(contentStr)));

        const body = {
            message: 'Update data via Customer App',
            content: contentBase64,
            branch: BRANCH
        };

        if (sha) {
            body.sha = sha;
        }

        await this.request(`contents/${DB_FILENAME}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    // Initialize DB if it doesn't exist
    async initDB() {
        const exists = await this.getDB();
        if (!exists) {
            const initialData = { customers: [], lastUpdated: new Date().toISOString() };
            await this.saveDB(initialData);
            return initialData;
        }
        return exists.content;
    }
};
