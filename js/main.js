// 工具数据配置
const tools = [
    {
        id: 'base64-encoder',
        title: 'Base64编码/解码',
        description: '将文本进行Base64编码或解码',
        category: 'text'
    },
    {
        id: 'url-encoder',
        title: 'URL编码/解码',
        description: '对URL进行编码或解码处理',
        category: 'text'
    },
    {
        id: 'md5-hash',
        title: 'MD5加密',
        description: '生成文本的MD5哈希值',
        category: 'crypto'
    },
    {
        id: 'json-formatter',
        title: 'JSON格式化',
        description: '格式化和验证JSON数据',
        category: 'format'
    },
    {
        id: 'qr-generator',
        title: '二维码生成器',
        description: '生成各种内容的二维码',
        category: 'generator'
    },
    {
        id: 'password-generator',
        title: '密码生成器',
        description: '生成安全的随机密码',
        category: 'generator'
    }
];

// 工具实现类
class ToolManager {
    constructor() {
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
        this.renderTools();
        this.bindEvents();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <div class="modal-body">
                    <h2 id="modal-title"></h2>
                    <div id="modal-tool-interface"></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    renderTools() {
        const toolsGrid = document.querySelector('.tools-grid');
        toolsGrid.innerHTML = '';

        tools.forEach(tool => {
            const toolCard = document.createElement('div');
            toolCard.className = 'tool-card';
            toolCard.innerHTML = `
                <h4>${tool.title}</h4>
                <p>${tool.description}</p>
                <button class="tool-btn" data-tool-id="${tool.id}">使用工具</button>
            `;
            toolsGrid.appendChild(toolCard);
        });
    }

    bindEvents() {
        // 工具按钮点击事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tool-btn')) {
                const toolId = e.target.getAttribute('data-tool-id');
                this.openTool(toolId);
            }
        });

        // 模态框关闭事件
        this.modal.querySelector('.close').addEventListener('click', () => {
            this.modal.style.display = 'none';
        });

        // 点击模态框外部关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.style.display = 'none';
            }
        });

        // 导航菜单平滑滚动
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    openTool(toolId) {
        const tool = tools.find(t => t.id === toolId);
        if (!tool) return;

        const modalTitle = this.modal.querySelector('#modal-title');
        const modalInterface = this.modal.querySelector('#modal-tool-interface');

        modalTitle.textContent = tool.title;
        modalInterface.innerHTML = this.getToolInterface(toolId);

        this.modal.style.display = 'block';
        this.bindToolEvents(toolId);
    }

    getToolInterface(toolId) {
        switch (toolId) {
            case 'base64-encoder':
                return `
                    <div class="tool-interface">
                        <div class="input-group">
                            <label>选择操作:</label>
                            <select id="base64-mode">
                                <option value="encode">编码</option>
                                <option value="decode">解码</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>输入文本:</label>
                            <textarea id="base64-input" placeholder="请输入要处理的文本..."></textarea>
                        </div>
                        <button class="tool-btn" onclick="toolManager.processBase64()">处理</button>
                        <div class="result-area" id="base64-result" style="display:none;"></div>
                    </div>
                `;

            case 'url-encoder':
                return `
                    <div class="tool-interface">
                        <div class="input-group">
                            <label>选择操作:</label>
                            <select id="url-mode">
                                <option value="encode">编码</option>
                                <option value="decode">解码</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>输入URL:</label>
                            <textarea id="url-input" placeholder="请输入要处理的URL..."></textarea>
                        </div>
                        <button class="tool-btn" onclick="toolManager.processURL()">处理</button>
                        <div class="result-area" id="url-result" style="display:none;"></div>
                    </div>
                `;

            case 'md5-hash':
                return `
                    <div class="tool-interface">
                        <div class="input-group">
                            <label>输入文本:</label>
                            <textarea id="md5-input" placeholder="请输入要加密的文本..."></textarea>
                        </div>
                        <button class="tool-btn" onclick="toolManager.processMD5()">生成MD5</button>
                        <div class="result-area" id="md5-result" style="display:none;"></div>
                    </div>
                `;

            case 'json-formatter':
                return `
                    <div class="tool-interface">
                        <div class="input-group">
                            <label>输入JSON:</label>
                            <textarea id="json-input" placeholder="请输入JSON数据..."></textarea>
                        </div>
                        <button class="tool-btn" onclick="toolManager.processJSON()">格式化</button>
                        <div class="result-area" id="json-result" style="display:none;"></div>
                    </div>
                `;

            case 'password-generator':
                return `
                    <div class="tool-interface">
                        <div class="input-group">
                            <label>密码长度:</label>
                            <input type="number" id="pwd-length" value="12" min="4" max="64">
                        </div>
                        <div class="input-group">
                            <label>
                                <input type="checkbox" id="pwd-uppercase" checked> 包含大写字母
                            </label>
                        </div>
                        <div class="input-group">
                            <label>
                                <input type="checkbox" id="pwd-lowercase" checked> 包含小写字母
                            </label>
                        </div>
                        <div class="input-group">
                            <label>
                                <input type="checkbox" id="pwd-numbers" checked> 包含数字
                            </label>
                        </div>
                        <div class="input-group">
                            <label>
                                <input type="checkbox" id="pwd-symbols"> 包含特殊字符
                            </label>
                        </div>
                        <button class="tool-btn" onclick="toolManager.generatePassword()">生成密码</button>
                        <div class="result-area" id="pwd-result" style="display:none;"></div>
                    </div>
                `;

            default:
                return '<p>工具开发中...</p>';
        }
    }

    bindToolEvents(toolId) {
        // 这里可以绑定特定工具的事件
    }

    // Base64处理
    processBase64() {
        const mode = document.getElementById('base64-mode').value;
        const input = document.getElementById('base64-input').value.trim();
        const resultDiv = document.getElementById('base64-result');

        if (!input) {
            alert('请输入要处理的文本');
            return;
        }

        try {
            let result;
            if (mode === 'encode') {
                result = btoa(unescape(encodeURIComponent(input)));
            } else {
                result = decodeURIComponent(escape(atob(input)));
            }

            resultDiv.innerHTML = `
                <h4>处理结果:</h4>
                <textarea readonly style="width:100%;min-height:80px;">${result}</textarea>
                <button class="tool-btn" onclick="navigator.clipboard.writeText('${result.replace(/'/g, "\\'")}')">复制结果</button>
            `;
            resultDiv.style.display = 'block';
        } catch (error) {
            resultDiv.innerHTML = `<p style="color:red;">处理失败: ${error.message}</p>`;
            resultDiv.style.display = 'block';
        }
    }

    // URL处理
    processURL() {
        const mode = document.getElementById('url-mode').value;
        const input = document.getElementById('url-input').value.trim();
        const resultDiv = document.getElementById('url-result');

        if (!input) {
            alert('请输入要处理的URL');
            return;
        }

        try {
            let result;
            if (mode === 'encode') {
                result = encodeURIComponent(input);
            } else {
                result = decodeURIComponent(input);
            }

            resultDiv.innerHTML = `
                <h4>处理结果:</h4>
                <textarea readonly style="width:100%;min-height:80px;">${result}</textarea>
                <button class="tool-btn" onclick="navigator.clipboard.writeText('${result.replace(/'/g, "\\'")}')">复制结果</button>
            `;
            resultDiv.style.display = 'block';
        } catch (error) {
            resultDiv.innerHTML = `<p style="color:red;">处理失败: ${error.message}</p>`;
            resultDiv.style.display = 'block';
        }
    }

    // MD5处理（简单实现，实际应用建议使用专业加密库）
    async processMD5() {
        const input = document.getElementById('md5-input').value.trim();
        const resultDiv = document.getElementById('md5-result');

        if (!input) {
            alert('请输入要加密的文本');
            return;
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(input);
            const hashBuffer = await crypto.subtle.digest('MD5', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            resultDiv.innerHTML = `
                <h4>MD5哈希值:</h4>
                <textarea readonly style="width:100%;min-height:50px;">${hashHex}</textarea>
                <button class="tool-btn" onclick="navigator.clipboard.writeText('${hashHex}')">复制结果</button>
            `;
            resultDiv.style.display = 'block';
        } catch (error) {
            // Fallback: 使用简单的哈希实现
            const result = this.simpleHash(input);
            resultDiv.innerHTML = `
                <h4>哈希值 (简化版):</h4>
                <textarea readonly style="width:100%;min-height:50px;">${result}</textarea>
                <button class="tool-btn" onclick="navigator.clipboard.writeText('${result}')">复制结果</button>
                <p style="color:orange;font-size:12px;">注: 这是简化版哈希，仅供演示使用</p>
            `;
            resultDiv.style.display = 'block';
        }
    }

    // 简单哈希函数（仅供演示）
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    // JSON格式化
    processJSON() {
        const input = document.getElementById('json-input').value.trim();
        const resultDiv = document.getElementById('json-result');

        if (!input) {
            alert('请输入JSON数据');
            return;
        }

        try {
            const parsed = JSON.parse(input);
            const formatted = JSON.stringify(parsed, null, 2);

            resultDiv.innerHTML = `
                <h4>格式化结果:</h4>
                <pre style="background:#f8f9fa;padding:15px;border-radius:5px;overflow:auto;max-height:300px;">${formatted}</pre>
                <button class="tool-btn" onclick="navigator.clipboard.writeText('${formatted.replace(/'/g, "\\'")}')">复制结果</button>
            `;
            resultDiv.style.display = 'block';
        } catch (error) {
            resultDiv.innerHTML = `<p style="color:red;">JSON格式错误: ${error.message}</p>`;
            resultDiv.style.display = 'block';
        }
    }

    // 密码生成
    generatePassword() {
        const length = parseInt(document.getElementById('pwd-length').value);
        const uppercase = document.getElementById('pwd-uppercase').checked;
        const lowercase = document.getElementById('pwd-lowercase').checked;
        const numbers = document.getElementById('pwd-numbers').checked;
        const symbols = document.getElementById('pwd-symbols').checked;
        const resultDiv = document.getElementById('pwd-result');

        if (!uppercase && !lowercase && !numbers && !symbols) {
            alert('请至少选择一种字符类型');
            return;
        }

        let charset = '';
        if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) charset += '0123456789';
        if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        resultDiv.innerHTML = `
            <h4>生成的密码:</h4>
            <div style="background:#f8f9fa;padding:15px;border-radius:5px;font-family:monospace;font-size:16px;word-break:break-all;">${password}</div>
            <button class="tool-btn" onclick="navigator.clipboard.writeText('${password}')">复制密码</button>
            <button class="tool-btn" onclick="toolManager.generatePassword()">重新生成</button>
        `;
        resultDiv.style.display = 'block';
    }
}

// 初始化应用
let toolManager;
document.addEventListener('DOMContentLoaded', () => {
    toolManager = new ToolManager();
});