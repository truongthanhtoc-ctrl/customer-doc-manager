/**
 * app.js
 * Main application logic.
 */

import { Config } from './config.js';
import { GitHub } from './github.js';
import { FileUtils } from './fileUtils.js';

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


// --- Modal Functions ---

function showCustomerModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn';
    modal.id = 'customerModal';

    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md transform animate-slideUp">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">新建客户</h2>
            <form id="customerForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">客户名称</label>
                    <input 
                        type="text" 
                        id="customerNameInput" 
                        required 
                        autofocus
                        class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                        placeholder="请输入客户名称"
                    >
                </div>
                <div class="flex space-x-3 pt-4">
                    <button 
                        type="button" 
                        id="cancelBtn"
                        class="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium"
                    >
                        取消
                    </button>
                    <button 
                        type="submit"
                        class="flex-1 px-4 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition font-medium shadow-lg shadow-brand-500/30"
                    >
                        确认创建
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Focus input
    const input = document.getElementById('customerNameInput');
    setTimeout(() => input.focus(), 100);

    // Close modal function
    const closeModal = () => {
        modal.classList.add('animate-fadeOut');
        setTimeout(() => document.body.removeChild(modal), 200);
    };

    // Handle form submit
    document.getElementById('customerForm').onsubmit = (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (name) {
            const newCustomer = {
                id: crypto.randomUUID(),
                name,
                contact: '',
                documents: [],
                files: [],
                createdAt: new Date().toISOString()
            };
            State.customers.unshift(newCustomer);
            closeModal();
            syncData();
        }
    };

    // Handle cancel
    document.getElementById('cancelBtn').onclick = closeModal;

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Close on ESC key
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
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
        <div class="flex items-center justify-center min-h-screen bg-slate-100">
            <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-slate-200">
                <div class="mb-6">
                    <h1 class="text-2xl font-bold text-slate-800 mb-1">客户管理系统</h1>
                    <p class="text-sm text-slate-500">连接到 GitHub 仓库</p>
                </div>
                <form id="loginForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">GitHub Token (PAT)</label>
                        <input type="password" id="token" required class="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm" placeholder="ghp_...">
                        <p class="text-xs text-slate-400 mt-1">Token 仅保存在本地浏览器中</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                         <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">用户名</label>
                            <input type="text" id="owner" required class="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm" placeholder="Username">
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">仓库名</label>
                            <input type="text" id="repo" required class="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm" placeholder="Repository">
                        </div>
                    </div>
                   
                    <button type="submit" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-md transition">
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

    // Auto-fill with default configuration
    const defaultConfig = Config.getDefaultConfig();
    if (defaultConfig) {
        setTimeout(() => {
            document.getElementById('token').value = defaultConfig.token;
            document.getElementById('owner').value = defaultConfig.owner;
            document.getElementById('repo').value = defaultConfig.repo;
        }, 100);
    }
}

function renderDashboard() {
    const filteredCustomers = State.customers.filter(c =>
        c.name.toLowerCase().includes(State.searchQuery.toLowerCase())
    );

    appDiv.innerHTML = `
        <div class="desktop-layout">
            <!-- Sidebar -->
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2 class="text-lg font-bold">客户管理系统</h2>
                    <p class="text-xs text-slate-400 mt-1">Customer Manager</p>
                </div>
                
                <nav class="sidebar-nav">
                    <div class="nav-item active">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <span>客户列表</span>
                    </div>
                </nav>
                
                <div class="sidebar-footer">
                    <button id="btnLogout" class="nav-item w-full text-left text-slate-400 hover:text-red-400">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        <span>退出登录</span>
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="main-content">
                <!-- Top Bar -->
                <div class="top-bar">
                    <div>
                        <h1 class="text-lg font-bold text-slate-800">客户列表</h1>
                        <p class="text-sm text-slate-500">共 ${State.customers.length} 位客户</p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <input 
                            type="text" 
                            id="searchInput" 
                            placeholder="搜索客户..." 
                            class="search-input w-64"
                            value="${State.searchQuery}"
                        >
                        <button id="btnAddCustomer" class="btn btn-primary flex items-center space-x-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            <span>新建客户</span>
                        </button>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="content-area">
                    ${filteredCustomers.length === 0 ? `
                        <div class="flex flex-col items-center justify-center h-full text-slate-400">
                            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                            </svg>
                            <p class="text-lg font-medium">暂无客户数据</p>
                            <p class="text-sm mt-1">点击右上角"新建客户"开始添加</p>
                        </div>
                    ` : `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 30%">客户名称</th>
                                    <th style="width: 25%">联系方式</th>
                                    <th style="width: 15%">单据数量</th>
                                    <th style="width: 20%">创建时间</th>
                                    <th style="width: 10%">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredCustomers.map(c => `
                                    <tr class="cursor-pointer" onclick="viewCustomer('${c.id}')">
                                        <td>
                                            <div class="flex items-center">
                                                <div class="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mr-3 font-semibold text-sm">
                                                    ${c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span class="font-medium">${c.name}</span>
                                            </div>
                                        </td>
                                        <td class="text-slate-600">${c.contact || '-'}</td>
                                        <td>
                                            <span class="badge badge-blue">${c.documents ? c.documents.length : 0} 个</span>
                                        </td>
                                        <td class="text-slate-600">${new Date(c.createdAt).toLocaleDateString('zh-CN')}</td>
                                        <td>
                                            <button class="text-brand-600 hover:text-brand-700 font-medium text-sm">查看详情</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
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
        renderDashboard();
        // Restore focus
        const input = document.getElementById('searchInput');
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    };

    document.getElementById('btnAddCustomer').onclick = () => {
        showCustomerModal();
    };

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
    // Ctrl+N: New customer
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const btn = document.getElementById('btnAddCustomer');
        if (btn) btn.click();
    }
    // Ctrl+F: Focus search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const search = document.getElementById('searchInput');
        if (search) search.focus();
    }
}

function renderCustomerDetail() {
    const customer = State.customers.find(c => c.id === State.selectedCustomerId);
    if (!customer) return renderDashboard();

    appDiv.innerHTML = `
        <div class="desktop-layout">
            <!-- Sidebar -->
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2 class="text-lg font-bold">客户管理系统</h2>
                    <p class="text-xs text-slate-400 mt-1">Customer Manager</p>
                </div>
                
                <nav class="sidebar-nav">
                    <div class="nav-item" onclick="backToDashboard()">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span>返回列表</span>
                    </div>
                </nav>
                
                <div class="sidebar-footer">
                    <button id="btnLogout" class="nav-item w-full text-left text-slate-400 hover:text-red-400">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        <span>退出登录</span>
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="main-content">
                <!-- Top Bar -->
                <div class="top-bar">
                    <div>
                        <h1 class="text-lg font-bold text-slate-800">${customer.name}</h1>
                        <p class="text-sm text-slate-500">客户详情</p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button onclick="deleteCustomer()" class="btn btn-secondary text-red-600 hover:bg-red-50 flex items-center space-x-2">
                            ${Icons.trash}
                            <span>删除客户</span>
                        </button>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="content-area">
                    <div style="display: grid; grid-template-columns: 350px 1fr; gap: 24px; height: 100%;">
                        <!-- Left Column: Customer Info -->
                        <div>
                            <div class="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">客户信息</h3>
                                
                                <div class="mb-4">
                                    <label class="block text-xs font-medium text-slate-600 mb-2">客户名称</label>
                                    <div class="px-3 py-2 bg-slate-50 rounded-md text-sm font-medium">${customer.name}</div>
                                </div>

                                <div class="mb-4">
                                    <label class="block text-xs font-medium text-slate-600 mb-2">联系方式</label>
                                    <input 
                                        type="text" 
                                        id="contactInput" 
                                        value="${customer.contact}" 
                                        placeholder="添加联系方式..." 
                                        class="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    >
                                    <button onclick="saveContact()" class="mt-2 text-brand-600 text-xs font-medium hover:underline">保存</button>
                                </div>

                                <div class="mb-4">
                                    <label class="block text-xs font-medium text-slate-600 mb-2">创建时间</label>
                                    <div class="px-3 py-2 bg-slate-50 rounded-md text-sm text-slate-600">
                                        ${new Date(customer.createdAt).toLocaleString('zh-CN')}
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-medium text-slate-600 mb-2">统计信息</label>
                                    <div class="grid grid-cols-2 gap-2">
                                        <div class="px-3 py-2 bg-blue-50 rounded-md text-center">
                                            <div class="text-lg font-bold text-blue-600">${(customer.documents || []).length}</div>
                                            <div class="text-xs text-blue-600">单据</div>
                                        </div>
                                        <div class="px-3 py-2 bg-green-50 rounded-md text-center">
                                            <div class="text-lg font-bold text-green-600">${(customer.files || []).length}</div>
                                            <div class="text-xs text-green-600">文件</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Documents & Files -->
                        <div style="overflow-y: auto;">
                            <!-- Documents Section -->
                            <div class="mb-6">
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="text-sm font-semibold text-slate-700">单据记录</h3>
                                    <button onclick="addDocument()" class="btn btn-primary btn-sm text-xs">添加单据</button>
                                </div>

                                ${(customer.documents || []).length === 0 ? `
                                    <div class="bg-white rounded-lg p-8 text-center text-slate-400 border border-slate-200">
                                        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        <p class="text-sm">暂无单据</p>
                                    </div>
                                ` : `
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>单据名称</th>
                                                <th>日期</th>
                                                <th>状态</th>
                                                <th style="width: 80px">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(customer.documents || []).map((doc, idx) => `
                                                <tr>
                                                    <td class="font-medium">${doc.title}</td>
                                                    <td class="text-slate-600">${doc.date}</td>
                                                    <td><span class="badge badge-blue">${doc.status || 'Draft'}</span></td>
                                                    <td>
                                                        <button onclick="deleteDocument(${idx})" class="text-red-500 hover:text-red-700 text-sm">删除</button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                `}
                            </div>

                                            <!-- Files Section -->
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="text-sm font-semibold text-slate-700">客户资料 (${(customer.files || []).length} 个文件)</h3>
                                    <button id="uploadBtn" class="btn btn-primary btn-sm text-xs">上传文件</button>
                                    <input type="file" id="fileInput" class="hidden" multiple>
                                </div>

                                ${(customer.files || []).length === 0 ? `
                                    <div class="bg-white rounded-lg p-8 text-center text-slate-400 border border-slate-200">
                                        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                        <p class="text-sm">暂无文件</p>
                                        <p class="text-xs mt-1">点击上方"上传文件"按钮添加</p>
                                    </div>
                                ` : `
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th style="width: 40%">文件名</th>
                                                <th style="width: 15%">大小</th>
                                                <th style="width: 20%">上传时间</th>
                                                <th style="width: 25%">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(customer.files || []).map((file, idx) => `
                                                <tr>
                                                    <td>
                                                        <div class="flex items-center">
                                                            <span class="text-2xl mr-3">${FileUtils.getFileIcon(file.name)}</span>
                                                            <span class="font-medium text-sm">${file.name}</span>
                                                        </div>
                                                    </td>
                                                    <td class="text-slate-600">
                                                        ${FileUtils.formatSize(file.compressedSize)}
                                                        ${file.originalSize !== file.compressedSize ? `<span class="badge badge-green ml-1">-${Math.round((1 - file.compressedSize / file.originalSize) * 100)}%</span>` : ''}
                                                    </td>
                                                    <td class="text-slate-600 text-sm">${new Date(file.uploadDate).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td>
                                                        <div class="flex items-center space-x-2">
                                                            ${FileUtils.canPreview(file.name) ? `<button onclick="previewFile(${idx})" class="text-brand-600 hover:text-brand-700 text-sm">预览</button>` : ''}
                                                            <button onclick="downloadFile(${idx})" class="text-brand-600 hover:text-brand-700 text-sm">下载</button>
                                                            <button onclick="deleteFile(${idx})" class="text-red-500 hover:text-red-700 text-sm">删除</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
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
        if (confirm(`确定要删除 ${customer.name} 及其所有单据吗 ? `)) {
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

    // File Management Functions
    if (!customer.files) customer.files = [];

    // Setup upload button
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (uploadBtn) {
        uploadBtn.onclick = () => fileInput.click();
    }

    // File input change
    fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        await handleFileUpload(files);
        fileInput.value = ''; // Reset
    };

    // Handle file upload
    async function handleFileUpload(files) {
        for (const file of files) {
            try {
                renderLoading(`正在压缩 ${file.name}...`);

                // Compress file
                const { file: compressedFile, originalSize, compressedSize } = await FileUtils.autoCompress(file);

                // Check size limit (100MB)
                if (compressedSize > 100 * 1024 * 1024) {
                    alert(`文件 ${file.name} 压缩后仍超过 100MB，无法上传`);
                    continue;
                }

                renderLoading(`正在上传 ${file.name} 到 GitHub...`);

                // Convert to Base64
                const base64Content = await FileUtils.fileToBase64(compressedFile);

                // Upload to GitHub
                const filePath = `files / customer - ${customer.id}/${compressedFile.name}`;
                await GitHub.uploadFile(filePath, base64Content, `Upload ${compressedFile.name}`);

                // Add to customer files
                customer.files.push({
                    id: crypto.randomUUID(),
                    name: compressedFile.name,
                    originalSize,
                    compressedSize,
                    path: filePath,
                    uploadDate: new Date().toISOString(),
                    type: compressedFile.type
                });

                // Save metadata
                await syncData();
            } catch (error) {
                alert(`上传失败: ${error.message}`);
                renderCustomerDetail();
            }
        }
    }

    // Download file
    window.downloadFile = async (idx) => {
        const file = customer.files[idx];
        try {
            renderLoading(`正在下载 ${file.name}...`);
            const base64Content = await GitHub.downloadFile(file.path);
            const blob = FileUtils.base64ToBlob(base64Content, file.type);

            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);

            renderCustomerDetail();
        } catch (error) {
            alert(`下载失败: ${error.message}`);
            renderCustomerDetail();
        }
    };

    // Delete file
    window.deleteFile = async (idx) => {
        const file = customer.files[idx];
        if (confirm(`确定要删除 ${file.name}？`)) {
            try {
                renderLoading(`正在删除 ${file.name}...`);
                await GitHub.deleteFile(file.path, `Delete ${file.name}`);
                customer.files.splice(idx, 1);
                await syncData();
            } catch (error) {
                alert(`删除失败: ${error.message}`);
                renderCustomerDetail();
            }
        }
    };

    // Preview file
    window.previewFile = async (idx) => {
        const file = customer.files[idx];
        try {
            renderLoading(`正在加载预览...`);
            const base64Content = await GitHub.downloadFile(file.path);
            const blob = FileUtils.base64ToBlob(base64Content, file.type);
            const url = URL.createObjectURL(blob);

            // Create modal for preview
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
            modal.onclick = () => {
                document.body.removeChild(modal);
                URL.revokeObjectURL(url);
            };

            const isImage = file.type.startsWith('image/');
            const content = isImage
                ? `<img src="${url}" class="max-w-full max-h-full rounded-lg shadow-2xl">`
                : `<iframe src="${url}" class="w-full h-full rounded-lg shadow-2xl"></iframe>`;

            modal.innerHTML = `
                <div class="relative max-w-6xl max-h-full" onclick="event.stopPropagation()">
                    <button onclick="this.parentElement.parentElement.click()" class="absolute -top-12 right-0 text-white hover:text-red-400 text-2xl">✕ 关闭</button>
                    ${content}
                </div>
            `;

            document.body.appendChild(modal);
            renderCustomerDetail();
        } catch (error) {
            alert(`预览失败: ${error.message}`);
            renderCustomerDetail();
        }
    };
}

// Start
init();
