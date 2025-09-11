// AI图片裁剪工具 - 主要功能入口
// 注意：这是前端框架，核心AI功能和GPT集成需要在后续开发中实现

class AIImageCropper {
    constructor() {
        this.currentImage = null;
        this.currentScene = null;
        this.cropResult = null;
        this.init();
    }

    init() {
        console.log('🤖 AI图片裁剪工具初始化');
        console.log('⚠️ 当前版本：前端框架，AI功能待实现');
        
        this.bindEvents();
        this.detectMobileDevice();
    }

    detectMobileDevice() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            document.body.classList.add('mobile-device');
            console.log('📱 检测到移动设备，启用移动端优化');
        }
    }

    bindEvents() {
        // 文件上传事件
        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-btn');
        const uploadArea = document.getElementById('upload-area');

        uploadBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // 拖拽上传
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload({ target: { files: e.dataTransfer.files } });
            }
        });

        // 场景选择事件
        this.bindSceneEvents();
        
        // 解释展开事件
        const explanationToggle = document.getElementById('explanation-toggle');
        explanationToggle?.addEventListener('click', () => this.toggleExplanationDetails());
    }

    bindSceneEvents() {
        // 场景标签切换
        document.querySelectorAll('.scene-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.scene-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.scene-category').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                const category = e.target.dataset.category;
                document.querySelector(`[data-category="${category}"].scene-category`)?.classList.add('active');
            });
        });

        // 场景选择
        document.querySelectorAll('.scene-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const scene = e.currentTarget.dataset.scene;
                this.selectScene(scene);
            });
        });
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) return;

        // 验证文件
        const validFiles = files.filter(file => this.validateFile(file));
        if (validFiles.length === 0) {
            alert('请上传有效的图片文件（JPG、PNG、GIF，小于10MB）');
            return;
        }

        // 处理第一个有效文件
        const file = validFiles[0];
        console.log(`📁 上传文件: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

        try {
            this.showLoading('正在加载图片...');
            
            // 读取图片
            const imageData = await this.readFileAsDataURL(file);
            this.currentImage = {
                file: file,
                dataURL: imageData,
                name: file.name
            };

            // 显示场景选择
            this.showSceneSelection();
            
            // 🤖 TODO: 这里应该调用AI分析API，自动推荐最佳场景
            console.log('🚧 AI场景推荐功能待实现');
            
        } catch (error) {
            console.error('文件处理错误:', error);
            alert('图片处理失败，请重试');
        } finally {
            this.hideLoading();
        }
    }

    validateFile(file) {
        // 检查文件类型
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return false;
        }

        // 检查文件大小 (10MB = 10 * 1024 * 1024)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return false;
        }

        return true;
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showSceneSelection() {
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('scene-selection').style.display = 'block';
        console.log('🎯 显示场景选择界面');
    }

    async selectScene(scene) {
        this.currentScene = scene;
        console.log(`🎬 选择场景: ${scene}`);

        try {
            this.showLoading('AI正在分析图片并生成裁剪方案...');
            
            // 🤖 TODO: 调用AI裁剪API
            await this.performAICrop(scene);
            
        } catch (error) {
            console.error('AI裁剪失败:', error);
            alert('AI处理失败，请重试');
        } finally {
            this.hideLoading();
        }
    }

    async performAICrop(scene) {
        // 🚧 模拟AI处理延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🚧 AI裁剪功能待实现');
        console.log('需要实现的功能:');
        console.log('1. 图像内容分析（人脸检测、物体识别、构图分析）');
        console.log('2. 基于场景的智能裁剪算法');
        console.log('3. GPT-4.1集成生成解释文案');
        console.log('4. 95%美学准确度评判');

        // 显示模拟结果
        this.showMockCropResult(scene);
    }

    showMockCropResult(scene) {
        // 隐藏场景选择，显示裁剪结果
        document.getElementById('scene-selection').style.display = 'none';
        document.getElementById('crop-result').style.display = 'block';

        // 模拟AI解释内容
        const mockExplanation = this.getMockExplanation(scene);
        document.getElementById('explanation-reason').innerHTML = mockExplanation.reason;
        document.getElementById('explanation-details').innerHTML = mockExplanation.details;

        console.log('🎨 显示模拟裁剪结果');
        console.log('⚠️ 实际AI分析和GPT解释功能需要后续开发实现');
    }

    getMockExplanation(scene) {
        // 🚧 这里是模拟内容，实际应该由GPT-4.1动态生成
        const explanations = {
            'instagram-post': {
                reason: '方形社交（Instagram完美适配）<br>效果：突出主体人物，去掉边缘干扰元素，营造简洁现代的社交媒体风格。',
                details: '我按「方形社交」完成了裁剪（仅裁切，无生成/拉伸）：<br><br>目标比例：1:1（Instagram帖子标准）<br>裁切框：左右各约12%，保留中心主体区域<br>导出尺寸：1080×1080<br><br>⚠️ 这是模拟内容，实际解释由GPT-4.1动态生成'
            },
            'instagram-story': {
                reason: '竖屏故事（强调纵向延展感）<br>效果：保留完整人物比例，强化垂直视觉冲击，适合全屏观看体验。',
                details: '我按「竖屏故事」完成了裁剪（仅裁切，无生成/拉伸）：<br><br>目标比例：9:16（Instagram故事标准）<br>裁切框：上下保留，左右约裁切25%<br>导出尺寸：1080×1920'
            }
        };

        return explanations[scene] || {
            reason: 'AI智能裁剪<br>效果：基于摄影美学原理优化构图，突出画面重点。',
            details: '裁剪详细信息将由AI分析后显示...'
        };
    }

    toggleExplanationDetails() {
        const details = document.getElementById('explanation-details');
        const toggle = document.getElementById('explanation-toggle');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            toggle.textContent = '收起详细';
        } else {
            details.style.display = 'none';
            toggle.textContent = '详细说明';
        }
    }

    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        
        if (text) text.textContent = message;
        if (overlay) overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
}

// 🚧 开发提醒
console.log('=' .repeat(60));
console.log('🚧 AI图片裁剪工具 - 开发框架版本');
console.log('=' .repeat(60));
console.log('当前状态: 前端交互框架已完成');
console.log('待实现功能:');
console.log('1. 🤖 AI图像分析算法 (95%美学准确度)');
console.log('2. 🧠 GPT-4.1集成 (可解释性文案生成)');
console.log('3. 📱 移动端性能优化 (<2秒处理)');
console.log('4. 🔒 隐私保护策略 (客户端vs服务端)');
console.log('5. 📊 平台格式数据库 (100%格式准确度)');
console.log('=' .repeat(60));

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.aiImageCropper = new AIImageCropper();
});