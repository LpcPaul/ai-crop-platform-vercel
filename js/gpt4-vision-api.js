// GPT-4.1 Vision API 集成模块
// API地址: https://api.apiyi.com

class GPT4VisionAPI {
    constructor() {
        this.apiBase = 'https://api.apiyi.com';
        this.apiKey = 'sk-cSkEKdy2yfQ5Lvlq10Db1c83823f4607Bb9a25751bE9Ac37';
        this.model = 'gpt-4-vision-preview'; // 使用vision模型
        this.maxRetries = 3;
        this.cache = new Map(); // 本地缓存
    }

    /**
     * 压缩图片以优化API传输
     * @param {File|HTMLImageElement} image - 原始图片
     * @param {Object} options - 压缩选项
     * @returns {Promise<string>} base64编码的压缩图片
     */
    async optimizeImageForAPI(image, options = {}) {
        const defaultOptions = {
            maxWidth: 1024,      // GPT-4V 建议最大宽度
            maxHeight: 1024,     // GPT-4V 建议最大高度
            quality: 0.8,        // 压缩质量
            format: 'jpeg'       // 输出格式
        };
        
        const config = { ...defaultOptions, ...options };
        
        return new Promise((resolve, reject) => {
            // 检查Canvas API支持
            if (!document || !document.createElement) {
                return reject(new Error('Canvas API not available'));
            }
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 如果是File对象，先转换为Image
            if (image instanceof File) {
                const img = new Image();
                img.onload = () => processImage(img);
                img.onerror = reject;
                img.src = URL.createObjectURL(image);
            } else {
                processImage(image);
            }
            
            function processImage(img) {
                // 计算压缩后的尺寸
                const { width, height } = calculateOptimalSize(
                    img.width, img.height, config.maxWidth, config.maxHeight
                );
                
                // 设置canvas尺寸并绘制
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // 转换为base64
                const base64 = canvas.toDataURL(`image/${config.format}`, config.quality);
                resolve(base64);
            }
        });
    }

    /**
     * 生成缓存键
     * @param {string} imageBase64 - 图片的base64数据
     * @param {string} scene - 使用场景
     * @param {Object} specs - 规格要求
     * @returns {string} 缓存键
     */
    generateCacheKey(imageBase64, scene, specs) {
        // 使用图片前100字符 + 场景 + 规格生成简单hash
        const imageHash = imageBase64.substring(0, 100);
        const specsStr = JSON.stringify(specs);
        return `${scene}_${btoa(imageHash + specsStr).substring(0, 32)}`;
    }

    /**
     * 构建GPT-4V的系统提示词
     * @returns {string} 系统提示词
     */
    buildSystemPrompt() {
        return `你是一个专业的图片裁剪AI助手，具备以下能力：

1. **美学分析**：基于摄影构图原理（三分构图法、黄金比例、视觉平衡）分析图片
2. **智能裁剪**：根据用户指定的场景和规格要求，生成最佳裁剪方案
3. **可解释性**：提供清晰的裁剪理由和技术说明

**输出格式要求**：
必须返回标准JSON格式，包含以下字段：
- reason: 情感化裁剪理由（例如："电影宽银幕效果：强调孤独与辽阔感"）
- details: 技术化操作说明（例如："左约4%、右约10%，导出尺寸1080×1080"）
- crop_params: 具体裁剪参数对象

**重要原则**：
1. 严格按照用户指定的目标比例进行裁剪
2. 优先保护画面主体（人脸、重要物体）
3. 去除边缘干扰元素，突出核心内容
4. 确保输出尺寸精确匹配规格要求`;
    }

    /**
     * 构建用户请求内容
     * @param {string} scene - 使用场景
     * @param {Object} specs - 规格要求
     * @param {string} imageBase64 - 图片base64数据
     * @returns {Array} 用户消息内容
     */
    buildUserPrompt(scene, specs, imageBase64) {
        const sceneDescriptions = {
            'instagram-post': 'Instagram帖子 (1:1正方形)',
            'instagram-story': 'Instagram故事 (9:16竖屏)',
            'tiktok': 'TikTok视频 (9:16竖屏)',
            'wechat-avatar': '微信头像 (1:1正方形)',
            'linkedin-avatar': 'LinkedIn头像 (1:1正方形)',
            'resume-photo': '简历照片 (3:4竖向)'
        };

        const sceneDesc = sceneDescriptions[scene] || scene;
        
        return [
            {
                "type": "text", 
                "text": `请分析这张图片并生成智能裁剪方案：

**用户场景**: ${sceneDesc}
**目标规格**: ${specs.ratio} 比例，推荐尺寸 ${specs.recommended_size[0]}×${specs.recommended_size[1]}
**最小尺寸**: ${specs.min_size ? specs.min_size[0] + '×' + specs.min_size[1] : '无限制'}

请返回JSON格式的裁剪方案，格式如下：
{
  "reason": "裁剪风格名称\\n效果：情感化描述，说明视觉效果和适用场景",
  "details": "我按「裁剪风格名称」完成了裁剪：\\n\\n目标比例：具体比例\\n裁切框：具体裁切说明\\n导出尺寸：宽×高",
  "crop_params": {
    "original_size": [原图宽度, 原图高度],
    "crop_box": {
      "x": 裁剪起始X坐标,
      "y": 裁剪起始Y坐标,
      "width": 裁剪宽度,
      "height": 裁剪高度
    },
    "output_size": [输出宽度, 输出高度],
    "crop_ratio": "${specs.ratio}"
  }
}`
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": imageBase64
                }
            }
        ];
    }

    /**
     * 调用GPT-4V API进行图片分析和裁剪方案生成
     * @param {string} scene - 使用场景
     * @param {Object} specs - 规格要求  
     * @param {string} imageBase64 - 图片base64数据
     * @returns {Promise<Object>} 裁剪方案
     */
    async analyzeCropSolution(scene, specs, imageBase64) {
        // 检查缓存
        const cacheKey = this.generateCacheKey(imageBase64, scene, specs);
        if (this.cache.has(cacheKey)) {
            console.log('🎯 使用缓存的裁剪方案');
            return this.cache.get(cacheKey);
        }

        console.log('🤖 调用GPT-4V分析图片...');
        console.log(`场景: ${scene}, 规格: ${specs.ratio}`);

        const requestBody = {
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: this.buildSystemPrompt()
                },
                {
                    role: "user", 
                    content: this.buildUserPrompt(scene, specs, imageBase64)
                }
            ],
            max_tokens: 1000,
            temperature: 0.1 // 较低温度确保一致性
        };

        let lastError = null;
        
        // 重试机制
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔄 API调用尝试 ${attempt}/${this.maxRetries}`);
                
                const response = await fetch(`${this.apiBase}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                
                if (result.error) {
                    throw new Error(`API返回错误: ${result.error.message}`);
                }

                const content = result.choices?.[0]?.message?.content;
                if (!content) {
                    throw new Error('API返回内容为空');
                }

                // 解析JSON响应
                const cropSolution = this.parseGPTResponse(content);
                
                // 验证响应格式
                this.validateCropSolution(cropSolution, specs);
                
                // 缓存结果
                this.cache.set(cacheKey, cropSolution);
                
                console.log('✅ GPT-4V分析完成');
                return cropSolution;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ 尝试 ${attempt} 失败:`, error.message);
                
                if (attempt < this.maxRetries) {
                    // 指数退避
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`⏱️ ${delay}ms后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // 所有重试都失败，返回降级方案
        console.error('❌ GPT-4V调用失败，启用降级方案');
        return this.generateFallbackSolution(scene, specs);
    }

    /**
     * 解析GPT响应的JSON内容
     * @param {string} content - GPT返回的文本内容
     * @returns {Object} 解析后的裁剪方案
     */
    parseGPTResponse(content) {
        try {
            // 尝试直接解析JSON
            return JSON.parse(content);
        } catch (error) {
            // 如果直接解析失败，尝试提取JSON块
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    throw new Error('无法解析GPT返回的JSON内容');
                }
            }
            throw new Error('GPT响应中未找到有效的JSON');
        }
    }

    /**
     * 验证裁剪方案的有效性
     * @param {Object} solution - 裁剪方案
     * @param {Object} specs - 规格要求
     */
    validateCropSolution(solution, specs) {
        const required = ['reason', 'details', 'crop_params'];
        for (const field of required) {
            if (!solution[field]) {
                throw new Error(`裁剪方案缺少必需字段: ${field}`);
            }
        }

        const { crop_params } = solution;
        const requiredParams = ['original_size', 'crop_box', 'output_size', 'crop_ratio'];
        for (const param of requiredParams) {
            if (!crop_params[param]) {
                throw new Error(`裁剪参数缺少必需字段: ${param}`);
            }
        }

        // 验证比例是否匹配
        if (crop_params.crop_ratio !== specs.ratio) {
            console.warn(`⚠️ 比例不匹配: 期望${specs.ratio}, 实际${crop_params.crop_ratio}`);
        }
    }

    /**
     * 生成降级裁剪方案
     * @param {string} scene - 使用场景
     * @param {Object} specs - 规格要求
     * @returns {Object} 降级裁剪方案
     */
    generateFallbackSolution(scene, specs) {
        console.log('🔧 生成本地降级方案...');
        
        return {
            reason: `${scene}标准裁剪\n效果：采用预设方案，确保符合平台规格要求。`,
            details: `降级处理完成：\n\n目标比例：${specs.ratio}\n裁切方式：居中裁剪\n导出尺寸：${specs.recommended_size[0]}×${specs.recommended_size[1]}\n\n⚠️ 网络异常，使用本地预设方案`,
            crop_params: {
                original_size: [1920, 1080], // 默认假设尺寸
                crop_box: {
                    x: 0,
                    y: 0, 
                    width: specs.recommended_size[0],
                    height: specs.recommended_size[1]
                },
                output_size: specs.recommended_size,
                crop_ratio: specs.ratio
            }
        };
    }

    /**
     * 清除过期缓存
     */
    clearExpiredCache() {
        // 简单实现：定期清空所有缓存
        if (this.cache.size > 50) {
            console.log('🧹 清理缓存...');
            this.cache.clear();
        }
    }
}

/**
 * 计算最优压缩尺寸
 * @param {number} originalWidth - 原始宽度
 * @param {number} originalHeight - 原始高度  
 * @param {number} maxWidth - 最大宽度
 * @param {number} maxHeight - 最大高度
 * @returns {Object} 压缩后的尺寸
 */
function calculateOptimalSize(originalWidth, originalHeight, maxWidth, maxHeight) {
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);
    
    return {
        width: Math.round(originalWidth * ratio),
        height: Math.round(originalHeight * ratio)
    };
}

// 导出供主应用使用
window.GPT4VisionAPI = GPT4VisionAPI;