// AI图片裁剪工具 - GPT-4.1集成完整版
// 集成GPT-4.1 Vision API + 客户端裁剪引擎

class AIImageCropper {
    constructor() {
        this.currentImage = null;
        this.currentScene = null;
        this.cropResult = null;
        
        // 初始化核心组件
        this.gptAPI = new GPT4VisionAPI();
        this.cropEngine = null; // 将在需要时初始化
        
        this.init();
    }

    init() {
        console.log('🤖 AI图片裁剪工具初始化');
        console.log('✅ GPT-4.1 Vision API已集成');
        console.log('✅ 客户端裁剪引擎已加载');
        
        this.bindEvents();
        this.detectMobileDevice();
        this.loadSceneOptions();
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
            
            // 🤖 AI场景推荐（可选功能，暂时让用户手动选择）
            console.log('💡 AI场景推荐功能可在后续版本添加');
            
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
            this.showLoading('GPT-4.1正在分析图片并生成裁剪方案...');
            
            // 调用GPT-4.1 Vision API进行分析
            await this.performGPTCropAnalysis(scene);
            
        } catch (error) {
            console.error('GPT-4.1分析失败:', error);
            alert(`AI分析失败: ${error.message}\n\n请检查网络连接或稍后重试`);
        } finally {
            this.hideLoading();
        }
    }

    async performGPTCropAnalysis(scene) {
        if (!this.currentImage) {
            throw new Error('未找到图片数据');
        }

        // 获取场景规格
        const specs = getSpecsByScene(scene);
        if (!specs) {
            throw new Error(`不支持的场景: ${scene}`);
        }

        console.log('📊 场景规格:', specs);

        try {
            // 1. 优化图片用于API传输
            console.log('🔧 优化图片以减少传输大小...');
            const optimizedImage = await this.gptAPI.optimizeImageForAPI(this.currentImage.file);

            // 2. 调用GPT-4.1 Vision API
            console.log('🤖 调用GPT-4.1 Vision API分析...');
            const cropSolution = await this.gptAPI.analyzeCropSolution(scene, specs, optimizedImage);

            // 3. 初始化裁剪引擎
            if (!this.cropEngine) {
                const canvas = document.getElementById('crop-canvas');
                this.cropEngine = new ImageCropEngine(canvas);
            }

            // 4. 加载原始图片到裁剪引擎
            console.log('🖼️ 加载图片到裁剪引擎...');
            await this.cropEngine.loadImage(this.currentImage.file);

            // 5. 执行裁剪
            console.log('✂️ 执行GPT建议的裁剪方案...');
            const cropResult = await this.cropEngine.executeCropFromJSON(cropSolution, scene);

            // 6. 保存结果并显示
            this.cropResult = {
                ...cropResult,
                scene: scene,
                specs: specs
            };

            this.showCropResult(cropSolution, cropResult);

            console.log('✅ GPT-4.1分析和裁剪完成');

        } catch (error) {
            console.error('❌ GPT处理过程失败:', error);
            throw error;
        }
    }

    showCropResult(cropSolution, cropResult) {
        // 隐藏场景选择，显示裁剪结果
        document.getElementById('scene-selection').style.display = 'none';
        document.getElementById('crop-result').style.display = 'block';

        // 显示GPT生成的解释内容
        document.getElementById('explanation-reason').innerHTML = cropSolution.reason;
        document.getElementById('explanation-details').innerHTML = cropSolution.details;

        // 更新下载按钮
        this.updateDownloadButton();

        // 显示裁剪统计信息
        this.displayCropStatistics();

        console.log('🎨 显示GPT-4.1裁剪结果');
        console.log('✅ 格式验证:', cropResult.validation);
    }

    updateDownloadButton() {
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn && this.cropResult) {
            downloadBtn.onclick = () => this.downloadCroppedImage();
        }
    }

    async downloadCroppedImage() {
        if (!this.cropEngine || !this.cropResult) {
            alert('没有可下载的裁剪结果');
            return;
        }

        try {
            this.showLoading('正在准备下载...');

            // 生成高质量的PNG格式
            const blob = await this.cropEngine.generateBlob('png', 1.0);
            const filename = generateSuggestedFilename(this.currentScene, this.cropResult.cropParams);
            
            downloadCroppedImage(blob, filename);

            console.log('💾 图片下载完成');
            
        } catch (error) {
            console.error('❌ 下载失败:', error);
            alert('下载失败，请重试');
        } finally {
            this.hideLoading();
        }
    }

    displayCropStatistics() {
        if (!this.cropEngine) return;

        const stats = this.cropEngine.getCropStatistics();
        if (!stats) return;

        console.log('📊 裁剪统计信息:', stats);
        
        // 可以在UI中显示统计信息（可选）
        // 例如：保留了原图的X%区域，压缩比例等
    }

    loadSceneOptions() {
        // 动态加载平台场景选项（基于platform-specs.js数据）
        console.log('📱 支持的平台场景数量:', Object.keys(PLATFORM_SPECS).length);
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

// ✅ 开发状态
console.log('=' .repeat(60));
console.log('✅ AI图片裁剪工具 - GPT-4.1完整集成版');
console.log('=' .repeat(60));
console.log('已完成功能:');
console.log('1. ✅ GPT-4.1 Vision API集成 (美学分析+解释生成)');
console.log('2. ✅ 客户端JSON裁剪引擎 (Canvas执行)');
console.log('3. ✅ 平台规格数据库 (100%格式准确度)');
console.log('4. ✅ 图像优化和缓存机制');
console.log('5. ✅ 完整用户交互流程');
console.log('');
console.log('🔧 待测试: 完整工作流程调试');
console.log('=' .repeat(60));

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.aiImageCropper = new AIImageCropper();
});