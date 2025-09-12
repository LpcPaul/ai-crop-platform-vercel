// 客户端图片裁剪引擎
// 负责解析GPT-4.1返回的JSON并执行Canvas裁剪

class ImageCropEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.originalImage = null;
        this.currentCropSolution = null;
    }

    /**
     * 加载图片到引擎
     * @param {File|string} imageSource - 图片文件或base64字符串
     * @returns {Promise<HTMLImageElement>} 加载的图片元素
     */
    async loadImage(imageSource) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.originalImage = img;
                console.log(`🖼️ 图片已加载: ${img.width}×${img.height}`);
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };

            if (imageSource instanceof File) {
                img.src = URL.createObjectURL(imageSource);
            } else if (typeof imageSource === 'string') {
                img.src = imageSource;
            } else {
                reject(new Error('不支持的图片格式'));
            }
        });
    }

    /**
     * 根据GPT-4.1的JSON方案执行裁剪
     * @param {Object} cropSolution - GPT-4.1返回的完整裁剪方案
     * @param {string} scene - 使用场景（用于验证）
     * @returns {Promise<Object>} 裁剪结果
     */
    async executeCropFromJSON(cropSolution, scene) {
        if (!this.originalImage) {
            throw new Error('请先加载图片');
        }

        this.currentCropSolution = cropSolution;
        const { crop_params } = cropSolution;

        console.log('✂️ 开始执行裁剪...');
        console.log('裁剪参数:', crop_params);

        try {
            // 1. 验证裁剪参数
            this.validateCropParams(crop_params, scene);

            // 2. 执行Canvas裁剪
            const croppedImageData = this.performCanvasCrop(crop_params);

            // 3. 验证输出规格
            const validationResult = this.validateOutputSpecs(crop_params, scene);

            console.log('✅ 裁剪执行完成');
            
            return {
                success: true,
                croppedImage: croppedImageData,
                cropParams: crop_params,
                validation: validationResult,
                solution: cropSolution
            };

        } catch (error) {
            console.error('❌ 裁剪执行失败:', error);
            throw error;
        }
    }

    /**
     * 验证裁剪参数的有效性
     * @param {Object} cropParams - 裁剪参数
     * @param {string} scene - 使用场景
     */
    validateCropParams(cropParams, scene) {
        const required = ['original_size', 'crop_box', 'output_size', 'crop_ratio'];
        
        for (const field of required) {
            if (!cropParams[field]) {
                throw new Error(`裁剪参数缺少必需字段: ${field}`);
            }
        }

        const { original_size, crop_box, output_size } = cropParams;

        // 验证原始尺寸是否匹配实际图片
        if (original_size[0] !== this.originalImage.width || 
            original_size[1] !== this.originalImage.height) {
            console.warn(`⚠️ 原始尺寸不匹配: GPT认为是${original_size[0]}×${original_size[1]}, 实际是${this.originalImage.width}×${this.originalImage.height}`);
            
            // 自动修正原始尺寸
            cropParams.original_size = [this.originalImage.width, this.originalImage.height];
        }

        // 验证裁剪框是否在图片范围内
        if (crop_box.x < 0 || crop_box.y < 0 || 
            crop_box.x + crop_box.width > this.originalImage.width ||
            crop_box.y + crop_box.height > this.originalImage.height) {
            
            console.warn('⚠️ 裁剪框超出图片边界，将自动调整');
            this.adjustCropBoxBounds(crop_box);
        }

        // 验证输出尺寸比例
        const expectedRatio = parseRatio(cropParams.crop_ratio);
        const actualRatio = output_size[0] / output_size[1];
        
        if (Math.abs(actualRatio - expectedRatio) > 0.001) {
            throw new Error(`输出比例不正确: 期望${cropParams.crop_ratio}, 实际${actualRatio.toFixed(3)}`);
        }
    }

    /**
     * 调整裁剪框使其在图片边界内
     * @param {Object} cropBox - 裁剪框参数
     */
    adjustCropBoxBounds(cropBox) {
        const imgWidth = this.originalImage.width;
        const imgHeight = this.originalImage.height;

        // 调整起始位置
        cropBox.x = Math.max(0, Math.min(cropBox.x, imgWidth - 1));
        cropBox.y = Math.max(0, Math.min(cropBox.y, imgHeight - 1));

        // 调整尺寸
        cropBox.width = Math.min(cropBox.width, imgWidth - cropBox.x);
        cropBox.height = Math.min(cropBox.height, imgHeight - cropBox.y);

        console.log('🔧 裁剪框已调整到边界内:', cropBox);
    }

    /**
     * 执行Canvas裁剪操作
     * @param {Object} cropParams - 裁剪参数
     * @returns {Object} 裁剪后的图片数据
     */
    performCanvasCrop(cropParams) {
        const { crop_box, output_size } = cropParams;

        // 设置Canvas输出尺寸
        this.canvas.width = output_size[0];
        this.canvas.height = output_size[1];

        // 清空Canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 执行裁剪绘制
        this.ctx.drawImage(
            this.originalImage,
            crop_box.x,           // 源图裁剪起始X
            crop_box.y,           // 源图裁剪起始Y
            crop_box.width,       // 源图裁剪宽度
            crop_box.height,      // 源图裁剪高度
            0,                    // 目标Canvas X
            0,                    // 目标Canvas Y  
            output_size[0],       // 目标Canvas宽度
            output_size[1]        // 目标Canvas高度
        );

        // 生成各种格式的输出数据
        return {
            canvas: this.canvas,
            dataURL: this.canvas.toDataURL('image/png', 1.0),
            blob: null, // 将在需要时生成
            size: {
                width: output_size[0],
                height: output_size[1]
            }
        };
    }

    /**
     * 验证输出规格是否符合平台要求
     * @param {Object} cropParams - 裁剪参数
     * @param {string} scene - 使用场景
     * @returns {Object} 验证结果
     */
    validateOutputSpecs(cropParams, scene) {
        const validationResult = validateOutputSize(cropParams.output_size, scene);
        
        if (!validationResult.valid) {
            throw new Error(`格式验证失败: ${validationResult.error}`);
        }

        console.log('✅ 格式验证通过:', validationResult);
        return validationResult;
    }

    /**
     * 生成Blob格式的图片数据（用于下载）
     * @param {string} format - 图片格式 ('png', 'jpeg', 'webp')
     * @param {number} quality - 图片质量 (0-1)
     * @returns {Promise<Blob>} 图片Blob
     */
    async generateBlob(format = 'png', quality = 0.9) {
        return new Promise((resolve, reject) => {
            const mimeType = `image/${format}`;
            
            this.canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('生成Blob失败'));
                }
            }, mimeType, quality);
        });
    }

    /**
     * 获取裁剪预览图（小尺寸用于UI显示）
     * @param {number} maxSize - 预览图最大尺寸
     * @returns {string} 预览图的DataURL
     */
    getPreviewDataURL(maxSize = 300) {
        if (!this.canvas) {
            return null;
        }

        const { width, height } = this.canvas;
        const scale = Math.min(maxSize / width, maxSize / height);
        
        if (scale >= 1) {
            return this.canvas.toDataURL('image/jpeg', 0.8);
        }

        // 生成缩小版预览
        const previewCanvas = document.createElement('canvas');
        const previewCtx = previewCanvas.getContext('2d');
        
        previewCanvas.width = width * scale;
        previewCanvas.height = height * scale;
        
        previewCtx.drawImage(this.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        
        return previewCanvas.toDataURL('image/jpeg', 0.8);
    }

    /**
     * 重置引擎状态
     */
    reset() {
        this.originalImage = null;
        this.currentCropSolution = null;
        
        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        console.log('🔄 图片裁剪引擎已重置');
    }

    /**
     * 获取当前裁剪的统计信息
     * @returns {Object|null} 裁剪统计
     */
    getCropStatistics() {
        if (!this.originalImage || !this.currentCropSolution) {
            return null;
        }

        const { crop_params } = this.currentCropSolution;
        const { crop_box, output_size } = crop_params;
        
        const originalArea = this.originalImage.width * this.originalImage.height;
        const croppedArea = crop_box.width * crop_box.height;
        const retainedPercentage = (croppedArea / originalArea) * 100;

        return {
            original_size: [this.originalImage.width, this.originalImage.height],
            cropped_area: [crop_box.width, crop_box.height],
            output_size: output_size,
            retained_percentage: Math.round(retainedPercentage * 100) / 100,
            compression_ratio: Math.round((originalArea / (output_size[0] * output_size[1])) * 100) / 100
        };
    }
}

/**
 * 工具函数：下载裁剪后的图片
 * @param {Blob} blob - 图片Blob数据
 * @param {string} filename - 文件名
 */
function downloadCroppedImage(blob, filename = 'cropped-image.png') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理URL对象
    URL.revokeObjectURL(url);
    
    console.log('💾 图片下载已启动:', filename);
}

/**
 * 工具函数：生成建议的文件名
 * @param {string} scene - 使用场景
 * @param {Object} cropParams - 裁剪参数  
 * @returns {string} 建议的文件名
 */
function generateSuggestedFilename(scene, cropParams) {
    const specs = getSpecsByScene(scene);
    const sceneName = specs ? specs.name.replace(/\s+/g, '-') : scene;
    const size = `${cropParams.output_size[0]}x${cropParams.output_size[1]}`;
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    return `${sceneName}-${size}-${timestamp}.png`;
}

// 导出供全局使用
window.ImageCropEngine = ImageCropEngine;
window.downloadCroppedImage = downloadCroppedImage;
window.generateSuggestedFilename = generateSuggestedFilename;

console.log('✂️ 图片裁剪引擎已加载');