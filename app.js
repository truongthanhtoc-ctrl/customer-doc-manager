/**
 * app.js
 * Main application logic.
 */

import { Config } from './config.js';
import { GitHub } from './github.js';

// --- State ---
const State = {
    customers: [],
    currentView: 'loading', // loading, login, dashboard, customer
    selectedCustomerId: null,
    dbSha: null, // SHA for concurrency
    searchQuery: ''
};

// --- DOM Cache ---
const appDiv = document.getElementById('app');

// --- Icons (SVG Templates) ---
const Icons = {
    user: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`,
    document: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
    plus: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`,
    trash: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
    logout: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>`,
    back: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>`
};

// --- Initialization ---
async function init() {
    if (Config.isConfigured()) {
        await loadData();
    } else {
        renderLogin();
    }
}

async function loadData() {
    renderLoading('正在从 GitHub 同步数据...');
    try {
        const result = await GitHub.getDB();
        if (result) {
            State.customers = result.content.customers || [];
            State.dbSha = result.sha;
        } else {
            // First time, empty DB
            State.customers = [];
            State.dbSha = null;
        }
        renderDashboard();
    } catch (err) {
        alert('无法加载数据: ' + err.message);
        renderLogin(); // Fallback to login in case of token issues
    }
}

async function syncData() {
    const data = {
        customers: State.customers,
        lastUpdated: new Date().toISOString()
    };
    try {
        renderLoading('正在保存到 GitHub...');
        await GitHub.saveDB(data, State.dbSha);
        // Re-fetch to update SHA and ensure consistency
        const result = await GitHub.getDB();
        State.dbSha = result.sha;
        renderDashboard();
    } catch (err) {
        alert('保存失败: ' + err.message);
        renderDashboard(); // Recover UI
    }
}

// --- Views ---

function renderLoading(msg = '加载中...') {
    appDiv.innerHTML = `
        <div class="flex-1 flex items-center justify-center h-screen">
            <div class="flex flex-col items-center space-y-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                <p class="text-slate-500 font-medium">${msg}</p>
            </div>
        </div>
    `;
}

function renderLogin() {
    appDiv.innerHTML = `
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md glass border border-white-400">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">欢迎使用</h1>
                    <p class="text-slate-500">客户单据管理系统 (GitHub 版)</p>
                </div>
                <form id="loginForm" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">GitHub Token (PAT)</label>
                        <input type="password" id="token" required class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition" placeholder="ghp_...">
                        <p class="text-xs text-slate-400 mt-1">Token 仅保存在本地浏览器中</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                         <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                            <input type="text" id="owner" required class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 transition" placeholder="Username">
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">仓库名</label>
                            <input type="text" id="repo" required class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 transition" placeholder="Repository">
                        </div>
                    </div>
                   
                    <button type="submit" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-lg shadow-brand-500/30">
                        连接仓库
                    </button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = document.getElementById('token').value;
        const owner = document.getElementById('owner').value;
        const repo = document.getElementById('repo').value;

        Config.save(token, owner, repo);
        await loadData();
    });
}

function renderDashboard() {
    const filteredCustomers = State.customers.filter(c =>
        c.name.toLowerCase().includes(State.searchQuery.toLowerCase())
    );

    appDiv.innerHTML = `
        <div class="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <!-- Header -->
            <header class="flex justify-between items-center mb-8">
                <div>
                    <h1 class="text-2xl font-bold text-slate-800">客户列表</h1>
                    <p class="text-slate-500 text-sm mt-1">共 ${State.customers.length} 位客户</p>
                </div>
                <div class="flex items-center space-x-3">
                    <button id="btnLogout" class="p-2 text-slate-400 hover:text-red-500 transition" title="退出">${Icons.logout}</button>
                    <button id="btnAddCustomer" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-md shadow-brand-500/20 flex items-center space-x-2 transition">
                        ${Icons.plus} <span>新建客户</span>
                    </button>
                </div>
            </header>

            <!-- Search -->
            <div class="mb-6">
                <input type="text" id="searchInput" placeholder="搜索客户..." 
                    class="w-full px-5 py-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-brand-500 text-slate-700 outline-none"
                    value="${State.searchQuery}">
            </div>

            <!-- List -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${filteredCustomers.map(c => `
                    <div class="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer border border-slate-100 group" onclick="viewCustomer('${c.id}')">
                        <div class="flex justify-between items-start mb-4">
                            <div class="bg-brand-50 text-brand-600 p-3 rounded-lg group-hover:bg-brand-100 transition">
                                ${Icons.user}
                            </div>
                            <span class="text-xs font-mono text-slate-300">ID: ${c.id.slice(0, 4)}</span>
                        </div>
                        <h3 class="text-lg font-bold text-slate-800 mb-1">${c.name}</h3>
                        <p class="text-slate-500 text-sm mb-4">${c.contact || 'No contact info'}</p>
                        <div class="flex items-center justify-between text-sm text-slate-400 border-t border-slate-50 pt-3">
                            <span class="flex items-center space-x-1">
                                ${Icons.document}
                                <span>${c.documents ? c.documents.length : 0} 个单据</span>
                            </span>
                            <span class="text-xs">查看详情 &rarr;</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Helpers
    window.viewCustomer = (id) => {
        State.selectedCustomerId = id;
        renderCustomerDetail();
    };

    document.getElementById('btnLogout').onclick = () => {
        if (confirm('确定要清除本地配置并退出吗？')) {
            Config.clear();
            renderLogin();
        }
    };

    document.getElementById('searchInput').oninput = (e) => {
        State.searchQuery = e.target.value;
        const container = document.querySelector('.grid'); // hacky re-render of just list? nah simple full re-render for KISS
        renderDashboard(); // re-render inputs focus is lost...
        // Restore focus
        const input = document.getElementById('searchInput');
        input.focus();
        // Move cursor to end
        const val = input.value;
        input.value = '';
        input.value = val;
    };

    document.getElementById('btnAddCustomer').onclick = () => {
        const name = prompt('请输入客户名称:');
        if (name) {
            const newCustomer = {
                id: crypto.randomUUID(),
                name,
                contact: '',
                documents: [],
                createdAt: new Date().toISOString()
            };
            State.customers.unshift(newCustomer); // Add to top
            syncData();
        }
    };
}

function renderCustomerDetail() {
    const customer = State.customers.find(c => c.id === State.selectedCustomerId);
    if (!customer) return renderDashboard();

    appDiv.innerHTML = `
        <div class="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
            <!-- Header -->
            <button onclick="backToDashboard()" class="text-slate-500 hover:text-brand-600 flex items-center space-x-1 mb-6 transition">
                ${Icons.back} <span>返回列表</span>
            </button>

            <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10 text-brand-500 pointer-events-none">
                    <svg class="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
                </div>
                
                <div class="relative z-10">
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">${customer.name}</h1>
                    <div class="flex items-center space-x-4 mb-6">
                        <input type="text" id="contactInput" value="${customer.contact}" placeholder="添加联系方式..." 
                            class="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-sm text-slate-600 w-64 focus:ring-2 focus:ring-brand-500 outline-none">
                        <button onclick="saveContact()" class="text-brand-600 text-sm font-medium hover:underline">保存联系人</button>
                    </div>
                    <button onclick="deleteCustomer()" class="text-red-400 hover:text-red-600 text-sm flex items-center space-x-1">
                        ${Icons.trash} <span>删除客户</span>
                    </button>
                </div>
            </div>

            <!-- Documents -->
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-slate-700">单据记录</h2>
                <button onclick="addDocument()" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm shadow-md shadow-brand-500/20 transition">
                    添加单据
                </button>
            </div>

            <div class="space-y-3">
                ${(customer.documents || []).length === 0 ? `<div class="text-center py-10 text-slate-400">暂无单据</div>` : ''}
                ${(customer.documents || []).map((doc, idx) => `
                    <div class="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:shadow-md transition group">
                        <div class="flex items-center space-x-4">
                            <div class="bg-slate-100 text-slate-500 p-2 rounded-lg">
                                ${Icons.document}
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800">${doc.title}</h4>
                                <p class="text-xs text-slate-400">${doc.date}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="bg-brand-50 text-brand-700 px-2 py-1 rounded text-xs font-semibold">${doc.status || 'Draft'}</span>
                            <button onclick="deleteDocument(${idx})" class="text-slate-300 hover:text-red-500 p-2 transition">
                                ${Icons.trash}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Helpers
    window.backToDashboard = () => {
        State.selectedCustomerId = null;
        renderDashboard();
    };

    window.saveContact = () => {
        const val = document.getElementById('contactInput').value;
        customer.contact = val;
        syncData();
    };

    window.deleteCustomer = () => {
        if (confirm(`确定要删除 ${customer.name} 及其所有单据吗?`)) {
            State.customers = State.customers.filter(c => c.id !== customer.id);
            syncData();
        }
    };

    window.addDocument = () => {
        const title = prompt('单据名称 (e.g. 2024-01 发票):');
        if (title) {
            if (!customer.documents) customer.documents = [];
            customer.documents.push({
                id: crypto.randomUUID(),
                title,
                date: new Date().toLocaleDateString(),
                status: '进行中'
            });
            syncData();
        }
    };

    window.deleteDocument = (idx) => {
        if (confirm('删除此单据?')) {
            customer.documents.splice(idx, 1);
            syncData();
        }
    };
}

// Start
init();
