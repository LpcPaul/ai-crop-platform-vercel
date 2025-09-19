const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { createCanvas, loadImage } = require('canvas');
require('dotenv').config();

// Format configuration for different image types
const FORMAT_CONFIG = {
  // Standard formats - preserve original
  'jpeg': { sharpFormat: 'jpeg', mimeType: 'image/jpeg', quality: 95 },
  'jpg': { sharpFormat: 'jpeg', mimeType: 'image/jpeg', quality: 95 },
  'png': { sharpFormat: 'png', mimeType: 'image/png', quality: 100 },
  'webp': { sharpFormat: 'webp', mimeType: 'image/webp', quality: 90 },
  'gif': { sharpFormat: 'gif', mimeType: 'image/gif', quality: 100 },
  'avif': { sharpFormat: 'avif', mimeType: 'image/avif', quality: 85 },

  // HEIC/HEIF formats - convert to JPEG
  'heic': { sharpFormat: 'jpeg', outputExtension: 'jpg', mimeType: 'image/jpeg', quality: 85 },
  'heif': { sharpFormat: 'jpeg', outputExtension: 'jpg', mimeType: 'image/jpeg', quality: 85 },

  // BMP/TIFF formats - convert to PNG
  'bmp': { sharpFormat: 'png', outputExtension: 'png', mimeType: 'image/png', quality: 100 },
  'tiff': { sharpFormat: 'png', outputExtension: 'png', mimeType: 'image/png', quality: 100 },
  'tif': { sharpFormat: 'png', outputExtension: 'png', mimeType: 'image/png', quality: 100 }
};

// Helper function to get format configuration
function getFormatConfig(originalFilename, mimeType) {
  // Extract extension from filename (preserve original case and exact extension)
  const fileExtension = path.extname(originalFilename).toLowerCase().slice(1);

  // Check if we have configuration for this extension
  if (FORMAT_CONFIG[fileExtension]) {
    const config = FORMAT_CONFIG[fileExtension];
    return {
      format: config.sharpFormat,
      // Use outputExtension if specified (for format conversions), otherwise preserve original
      extension: config.outputExtension || fileExtension,
      config: config
    };
  }

  // Fallback to mime type detection with new formats
  const mimeMap = {
    'image/jpeg': { format: 'jpeg', extension: 'jpg' },
    'image/png': { format: 'png', extension: 'png' },
    'image/webp': { format: 'webp', extension: 'webp' },
    'image/gif': { format: 'gif', extension: 'gif' },
    'image/avif': { format: 'avif', extension: 'avif' },
    'image/heic': { format: 'heic', extension: 'heic' },
    'image/heif': { format: 'heif', extension: 'heif' },
    'image/bmp': { format: 'bmp', extension: 'bmp' },
    'image/tiff': { format: 'tiff', extension: 'tiff' }
  };

  const mimeMapping = mimeMap[mimeType];
  if (mimeMapping && FORMAT_CONFIG[mimeMapping.extension]) {
    const config = FORMAT_CONFIG[mimeMapping.extension];
    return {
      format: config.sharpFormat,
      extension: config.outputExtension || mimeMapping.extension,
      config: config
    };
  }

  // Ultimate fallback to PNG
  return {
    format: 'png',
    extension: 'png',
    config: FORMAT_CONFIG['png']
  };
}

// BMP preprocessing function - convert unsupported BMP formats to PNG using Canvas
async function preprocessBMP(imageBuffer) {
  try {
    console.log('预处理BMP图像 - 使用Canvas转换为PNG格式');

    // Load image using Canvas
    const image = await loadImage(imageBuffer);

    // Create canvas with image dimensions
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw image to canvas
    ctx.drawImage(image, 0, 0);

    // Convert to PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');

    console.log(`BMP转PNG成功 - 原始大小: ${imageBuffer.length} bytes, PNG大小: ${pngBuffer.length} bytes`);

    return {
      buffer: pngBuffer,
      processed: true,
      originalFormat: 'bmp',
      convertedFormat: 'png'
    };
  } catch (error) {
    console.error('BMP预处理失败:', error.message);
    throw new Error(`BMP format preprocessing failed: ${error.message}`);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// 当服务部署在代理（如Next.js或反向代理）之后时，需要开启trust proxy以正确识别客户端IP
app.set('trust proxy', 1);

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(__dirname));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api/', limiter);

// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|avif|heic|heif|bmp|tiff|tif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式: jpeg, jpg, png, gif, webp, avif, heic, heif, bmp, tiff'));
    }
  }
});

// 确保输出目录存在
const TEMP_DIR = path.join(__dirname, 'temp');
const OUTPUT_DIR = path.join(__dirname, 'output');

async function ensureDirectories() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.error('创建目录失败:', error);
  }
}

// 参数验证和修正函数
function validateAndFixCropParams(cropParams, originalWidth, originalHeight) {
  const errors = [];
  let fixed = { ...cropParams };
  
  // 检查数据类型
  if (!Number.isInteger(fixed.x) || !Number.isInteger(fixed.y) || 
      !Number.isInteger(fixed.width) || !Number.isInteger(fixed.height)) {
    errors.push('坐标参数必须是整数');
    fixed.x = Math.floor(Number(fixed.x) || 0);
    fixed.y = Math.floor(Number(fixed.y) || 0);
    fixed.width = Math.floor(Number(fixed.width) || 100);
    fixed.height = Math.floor(Number(fixed.height) || 100);
  }
  
  // 检查最小尺寸约束
  if (fixed.width < 100) {
    errors.push('宽度必须至少100像素');
    fixed.width = 100;
  }
  if (fixed.height < 100) {
    errors.push('高度必须至少100像素');
    fixed.height = 100;
  }
  
  // 检查坐标范围
  if (fixed.x < 0) {
    errors.push('x坐标不能小于0');
    fixed.x = 0;
  }
  if (fixed.y < 0) {
    errors.push('y坐标不能小于0');
    fixed.y = 0;
  }
  if (fixed.x > originalWidth - 100) {
    errors.push('x坐标超出安全范围');
    fixed.x = Math.max(0, originalWidth - 100);
  }
  if (fixed.y > originalHeight - 100) {
    errors.push('y坐标超出安全范围');
    fixed.y = Math.max(0, originalHeight - 100);
  }
  
  // 检查越界问题
  if (fixed.x + fixed.width > originalWidth) {
    errors.push('裁剪区域宽度越界');
    fixed.width = originalWidth - fixed.x;
  }
  if (fixed.y + fixed.height > originalHeight) {
    errors.push('裁剪区域高度越界');
    fixed.height = originalHeight - fixed.y;
  }
  
  // 确保修正后仍满足最小尺寸
  if (fixed.width < 100 || fixed.height < 100) {
    errors.push('修正后尺寸仍然过小，使用默认居中裁剪');
    const defaultSize = Math.min(originalWidth, originalHeight) * 0.8;
    fixed.x = Math.floor((originalWidth - defaultSize) / 2);
    fixed.y = Math.floor((originalHeight - defaultSize) / 2);
    fixed.width = Math.floor(defaultSize);
    fixed.height = Math.floor(defaultSize);
  }
  
  return { fixed, errors };
}

// 注意：v0.5版本已移除subject_anchor_hint字段

// GPT-4.1 Vision API调用（带参数验证和二次请求）
async function callGPTVisionAPI(
  imageBase64,
  originalWidth,
  originalHeight,
  mode = 'aesthetic',
  language = 'zh',
  mimeType = 'image/jpeg'
) {
  const axios = require('axios');
  const fs = require('fs').promises;
  
  // 语言映射表
  const languageMap = {
    'en': 'English',
    'zh': '',  // 中文版本不需要后缀
    'es': 'Spanish',
    'ja': 'Japanese'
  };

  // 根据语言生成prompt文件名后缀
  const languageSuffix = languageMap[language] ? `_${languageMap[language]}` : '';

  // 加载多语言prompt模板（优先使用v1.1版本）
  let promptTemplate;
  try {
    const promptFileName = `v1.1-${mode}${languageSuffix}.txt`;
    promptTemplate = await fs.readFile(
      path.join(__dirname, 'prompts', promptFileName),
      'utf-8'
    );
    console.log(`[GPT] 使用 ${promptFileName} prompt版本 (语言: ${language})`);
  } catch (error) {
    console.warn('无法加载v1.1 prompt文件，尝试v0.5版本');
    try {
      promptTemplate = await fs.readFile(
        path.join(__dirname, 'prompts', `v0.5-${mode}.txt`),
        'utf-8'
      );
      console.log(`[GPT] 使用 v0.5-${mode}.txt prompt版本`);
    } catch (error2) {
      console.warn('无法加载v0.5 prompt文件，尝试v0.4版本');
      try {
        promptTemplate = await fs.readFile(
          path.join(__dirname, 'prompts', `v0.4-${mode}.txt`),
          'utf-8'
        );
        console.log(`[GPT] 使用 v0.4-${mode}.txt prompt版本`);
      } catch (error3) {
        console.warn('无法加载v0.4 prompt文件，尝试v0.3版本');
        try {
          promptTemplate = await fs.readFile(
            path.join(__dirname, 'prompts', `v0.3-${mode}.txt`),
            'utf-8'
          );
          console.log(`[GPT] 使用 v0.3-${mode}.txt prompt版本`);
        } catch (error4) {
          console.warn('无法加载v0.3 prompt文件，尝试v0.2版本');
          try {
            promptTemplate = await fs.readFile(
              path.join(__dirname, 'prompts', `v0.2-${mode}.txt`),
              'utf-8'
            );
            console.log(`[GPT] 使用 v0.2-${mode}.txt prompt版本`);
          } catch (error5) {
            console.warn('无法加载v0.2 prompt文件，使用内置模板');
            console.log(`[GPT] 使用内置 prompt模板`);
            promptTemplate = `你是专业的图片裁剪专家。坐标原点为左上角，单位为像素。
**输入：** 原图尺寸 (${originalWidth}×${originalHeight})。
**目标：** 让图片更美观、更有视觉冲击力。

请返回JSON格式：
{
  "analysis": {
    "title": "简洁的方案名称",
    "effection": "具体的视觉效果描述"
  },
  "crop_params": {
    "x": 起始X坐标,
    "y": 起始Y坐标,
    "width": 裁剪宽度,
    "height": 裁剪高度
  },
  "subject_anchor_hint": {
    "x_norm": 0.50,
    "y_norm": 0.50
  }
}`;
          }
        }
      }
    }
  }
  
  const prompt = promptTemplate
    .replace(/\$\{originalWidth\}/g, originalWidth)
    .replace(/\$\{originalHeight\}/g, originalHeight);

  // 最多尝试2次请求
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[GPT-4.1] 第${attempt}次请求 - 图片尺寸: ${originalWidth}×${originalHeight}`);
      
      const response = await axios.post('https://api.apiyi.com/v1/chat/completions', {
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer sk-cSkEKdy2yfQ5Lvlq10Db1c83823f4607Bb9a25751bE9Ac37`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`[GPT-4.1] HTTP状态码:`, response.status);
      console.log(`[GPT-4.1] 完整响应:`, JSON.stringify(response.data, null, 2));

      // 检查响应结构
      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error(`GPT API响应结构异常: ${JSON.stringify(response.data)}`);
      }

      const content = response.data.choices[0].message.content;
      console.log(`[GPT-4.1] 原始响应长度: ${content ? content.length : 0}字符`);
      console.log(`[GPT-4.1] 原始响应内容:`, content);

      if (!content || content.length === 0) {
        throw new Error('GPT API返回空内容');
      }
      
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析GPT-4.1响应中的JSON');
      }
      
      console.log(`[GPT-4.1] 提取的JSON:`, jsonMatch[0]);
      const parsedResult = JSON.parse(jsonMatch[0]);
      console.log(`[GPT-4.1] 解析后的对象:`, JSON.stringify(parsedResult, null, 2));
      
      // 验证必要字段是否存在
      if (!parsedResult.analysis || !parsedResult.crop_params) {
        throw new Error('GPT-4.1响应缺少必要字段');
      }
      
      // 验证并修正crop_params
      const cropValidation = validateAndFixCropParams(
        parsedResult.crop_params, 
        originalWidth, 
        originalHeight
      );
      
      // 如果第一次请求参数有问题且尝试次数小于2，进行二次请求
      if (cropValidation.errors.length > 0 && attempt === 1) {
        console.warn(`[GPT] 第${attempt}次请求参数有问题:`, cropValidation.errors);
        console.log(`[GPT] 进行第二次请求尝试...`);
        continue; // 继续下一次循环
      }
      
      // 记录修正情况
      if (cropValidation.errors.length > 0) {
        console.warn(`[GPT] 裁剪参数已修正:`, cropValidation.errors);
      }
      
      // 返回修正后的结果（移除subject_anchor_hint字段）
      return {
        analysis: parsedResult.analysis,
        crop_params: cropValidation.fixed,
        validation_info: {
          crop_errors: cropValidation.errors,
          attempt_count: attempt
        }
      };
      
    } catch (error) {
      console.error(`[GPT] 第${attempt}次请求失败:`, error.message);
      
      // 如果是最后一次尝试，返回备用方案
      if (attempt === 2) {
        console.log(`[GPT] 所有尝试失败，使用备用算法`);
        return generateFallbackCrop(mode, originalWidth, originalHeight);
      }
    }
  }
}

// 备用裁剪算法（v0.5版本，移除subject_anchor_hint）
function generateFallbackCrop(mode, originalWidth = 1080, originalHeight = 1350) {
  const aestheticCrops = [
    {
      analysis: {
        "title": "上方留白聚焦",
        "effection": "强化前景主体故事感。去除上方干扰元素，增加下方主体权重，远近对比更加明显。"
      },
      crop_params: {
        x: Math.floor(originalWidth * 0.1),
        y: Math.floor(originalHeight * 0.15),
        width: Math.floor(originalWidth * 0.8),
        height: Math.floor(originalHeight * 0.7)
      }
    },
    {
      analysis: {
        "title": "紧密框架突出",
        "effection": "突出中心主体的细节表达。裁掉边缘分散注意力的元素，主体占据画面核心区域，情绪传达更直接。"
      },
      crop_params: {
        x: Math.floor(originalWidth * 0.15),
        y: Math.floor(originalHeight * 0.1),
        width: Math.floor(originalWidth * 0.7),
        height: Math.floor(originalHeight * 0.8)
      }
    },
    {
      analysis: {
        "title": "方形平衡取景",
        "effection": "营造稳定的视觉节奏感。保持主体居中位置，去除多余边缘内容，整体画面更加紧凑统一。"
      },
      crop_params: {
        x: Math.floor(originalWidth * 0.2),
        y: Math.floor(originalHeight * 0.2),
        width: Math.floor(originalWidth * 0.6),
        height: Math.floor(originalHeight * 0.6)
      }
    }
  ];
  
  const result = aestheticCrops[Math.floor(Math.random() * aestheticCrops.length)];

  const validation = validateAndFixCropParams(
    result.crop_params,
    originalWidth,
    originalHeight
  );

  // 添加验证信息标识这是备用算法
  result.validation_info = {
    crop_errors: validation.errors,
    attempt_count: 0,
    fallback_used: true
  };

  return {
    analysis: result.analysis,
    crop_params: validation.fixed,
    validation_info: result.validation_info
  };
}

// 智能裁剪处理 - 支持格式保持
async function performSmartCrop(imageBuffer, cropParams, originalFilename, mimeType) {
  const { x = 0, y = 0, width, height } = cropParams;

  try {
    // 获取格式配置
    const { format, extension, config } = getFormatConfig(originalFilename, mimeType);

    let sharpImage = sharp(imageBuffer);

    // 获取原图信息
    const metadata = await sharpImage.metadata();

    // sRGB色彩空间转换 - 如果色彩空间不是sRGB，转换到sRGB
    if (metadata.colorSpace && metadata.colorSpace !== 'srgb') {
      console.log(`Converting color space from ${metadata.colorSpace} to sRGB`);
      sharpImage = sharpImage.colorspace('srgb');
    }

    // 确保裁剪参数在有效范围内
    const validX = Math.max(0, Math.min(x, metadata.width - 50));
    const validY = Math.max(0, Math.min(y, metadata.height - 50));
    const validWidth = Math.min(width, metadata.width - validX);
    const validHeight = Math.min(height, metadata.height - validY);

    // 根据格式设置Sharp选项
    const formatOptions = { quality: config.quality };

    // 对于GIF格式，需要特殊处理
    if (format === 'gif') {
      // GIF处理：保持动画或转换为静态图
      const croppedBuffer = await sharpImage
        .extract({
          left: validX,
          top: validY,
          width: validWidth,
          height: validHeight
        })
        .gif()
        .toBuffer();

      return {
        success: true,
        buffer: croppedBuffer,
        format: format,
        extension: extension,
        mimeType: config.mimeType,
        config: config,
        metadata: {
          original: { width: metadata.width, height: metadata.height },
          cropped: { width: validWidth, height: validHeight },
          crop_area: { x: validX, y: validY, width: validWidth, height: validHeight }
        }
      };
    }

    // 执行裁剪
    const croppedBuffer = await sharpImage
      .extract({
        left: validX,
        top: validY,
        width: validWidth,
        height: validHeight
      })
      .toFormat(format, formatOptions)
      .toBuffer();

    return {
      success: true,
      buffer: croppedBuffer,
      format: format,
      extension: extension,
      mimeType: config.mimeType,
      config: config,
      metadata: {
        original: { width: metadata.width, height: metadata.height },
        cropped: { width: validWidth, height: validHeight },
        crop_area: { x: validX, y: validY, width: validWidth, height: validHeight }
      }
    };

  } catch (error) {
    console.error('图片裁剪失败:', error);
    return { success: false, error: error.message };
  }
}

// API路由

// 1. 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Crop Service v2.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 2. 美学优先裁剪
app.post('/api/crop/aesthetic', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件' });
    }
    
    const requestId = uuidv4();
    console.log(`[${requestId}] 开始美学裁剪处理: ${req.file.originalname}`);
    
    // 获取图片尺寸信息 - 支持BMP预处理
    let imageBuffer = req.file.buffer;
    let preprocessed = false;
    let analysisMimeType = req.file.mimetype;

    try {
      // 尝试直接使用Sharp获取metadata
      const metadata = await sharp(imageBuffer).metadata();
      var { width: originalWidth, height: originalHeight } = metadata;
    } catch (sharpError) {
      // 如果Sharp失败且是BMP格式，使用Canvas预处理
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const isBMP = fileExtension === '.bmp' || req.file.mimetype === 'image/bmp';

      if (isBMP) {
        console.log('Sharp无法处理BMP格式，尝试Canvas预处理...');
        const bmpResult = await preprocessBMP(req.file.buffer);
        imageBuffer = bmpResult.buffer;
        preprocessed = true;
        analysisMimeType = 'image/png';

        // 使用预处理后的PNG获取metadata
        const metadata = await sharp(imageBuffer).metadata();
        var { width: originalWidth, height: originalHeight } = metadata;
        console.log(`BMP预处理成功 - 图片尺寸: ${originalWidth}×${originalHeight}`);
      } else {
        // 非BMP格式的Sharp错误，直接抛出
        throw sharpError;
      }
    }
    
    // 转换为Base64供GPT分析
    const analysisBuffer = preprocessed ? imageBuffer : req.file.buffer;
    const imageBase64 = analysisBuffer.toString('base64');

    // 获取语言参数
    const language = req.body.language || 'zh'; // 默认中文

    // 调用GPT-4.1 Vision进行美学分析
    const analysisResult = await callGPTVisionAPI(
      imageBase64,
      originalWidth,
      originalHeight,
      'aesthetic',
      language,
      analysisMimeType
    );
    
    // 执行智能裁剪 (保持原图格式)
    const cropResult = await performSmartCrop(
      imageBuffer,
      analysisResult.crop_params,
      req.file.originalname,
      req.file.mimetype
    );

    if (!cropResult.success) {
      return res.status(500).json({ error: `裁剪失败: ${cropResult.error}` });
    }

    // 保存结果文件（使用原始格式扩展名）
    const outputFileName = `aesthetic_${requestId}.${cropResult.extension}`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    await fs.writeFile(outputPath, cropResult.buffer);

    console.log(`[${requestId}] 美学裁剪完成 - 格式: ${cropResult.format}`);

    res.json({
      success: true,
      request_id: requestId,
      original_filename: req.file.originalname,
      analysis: analysisResult.analysis,
      crop_params: analysisResult.crop_params,
      metadata: cropResult.metadata,
      output: {
        filename: outputFileName,
        download_url: `/api/download/${outputFileName}`,
        format: cropResult.format,
        extension: cropResult.extension,
        mimeType: cropResult.mimeType,
        quality: cropResult.config.quality
      }
    });
    
  } catch (error) {
    console.error('美学裁剪API错误:', error);
    res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
});

// 3. 批量美学裁剪
app.post('/api/crop/batch-aesthetic', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传至少一张图片' });
    }
    
    const batchId = uuidv4();
    console.log(`[${batchId}] 开始批量美学裁剪: ${req.files.length}张图片`);
    
    const language = req.body.language || 'zh';
    const results = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const requestId = `${batchId}_${i + 1}`;
      
      try {
        // 获取图片尺寸信息 - 支持BMP预处理
        let imageBuffer = file.buffer;
        let preprocessed = false;
        let analysisMimeType = file.mimetype;

        try {
          // 尝试直接使用Sharp获取metadata
          const metadata = await sharp(imageBuffer).metadata();
          var { width: originalWidth, height: originalHeight } = metadata;
        } catch (sharpError) {
          // 如果Sharp失败且是BMP格式，使用Canvas预处理
          const fileExtension = path.extname(file.originalname).toLowerCase();
          const isBMP = fileExtension === '.bmp' || file.mimetype === 'image/bmp';

          if (isBMP) {
            console.log(`[${requestId}] Sharp无法处理BMP格式，尝试Canvas预处理...`);
            const bmpResult = await preprocessBMP(file.buffer);
            imageBuffer = bmpResult.buffer;
            preprocessed = true;
            analysisMimeType = 'image/png';

            // 使用预处理后的PNG获取metadata
            const metadata = await sharp(imageBuffer).metadata();
            var { width: originalWidth, height: originalHeight } = metadata;
            console.log(`[${requestId}] BMP预处理成功 - 图片尺寸: ${originalWidth}×${originalHeight}`);
          } else {
            // 非BMP格式的Sharp错误，直接抛出
            throw sharpError;
          }
        }
        
        // GPT美学分析
        const analysisBuffer = preprocessed ? imageBuffer : file.buffer;
        const imageBase64 = analysisBuffer.toString('base64');
        const analysisResult = await callGPTVisionAPI(
          imageBase64,
          originalWidth,
          originalHeight,
          'aesthetic',
          language,
          analysisMimeType
        );
        
        // 执行裁剪 (保持原格式)
        const cropResult = await performSmartCrop(
          imageBuffer,
          analysisResult.crop_params,
          file.originalname,
          file.mimetype
        );

        if (cropResult.success) {
          const outputFileName = `batch_aesthetic_${requestId}.${cropResult.extension}`;
          const outputPath = path.join(OUTPUT_DIR, outputFileName);
          await fs.writeFile(outputPath, cropResult.buffer);

          results.push({
            success: true,
            original_filename: file.originalname,
            request_id: requestId,
            analysis: analysisResult.analysis,
            crop_params: analysisResult.crop_params,
            metadata: cropResult.metadata,
            output: {
              filename: outputFileName,
              download_url: `/api/download/${outputFileName}`,
              format: cropResult.format,
              extension: cropResult.extension,
              mimeType: cropResult.mimeType
            }
          });
        } else {
          results.push({
            success: false,
            original_filename: file.originalname,
            error: cropResult.error
          });
        }
        
      } catch (error) {
        console.error(`处理文件 ${file.originalname} 失败:`, error);
        results.push({
          success: false,
          original_filename: file.originalname,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[${batchId}] 批量处理完成: ${successCount}/${req.files.length} 成功`);
    
    res.json({
      success: true,
      batch_id: batchId,
      total: req.files.length,
      success_count: successCount,
      results: results
    });
    
  } catch (error) {
    console.error('批量裁剪API错误:', error);
    res.status(500).json({ error: '批量处理失败', details: error.message });
  }
});

// 4. 文件下载
app.get('/api/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(OUTPUT_DIR, filename);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.download(filePath, filename);
    
  } catch (error) {
    console.error('下载文件错误:', error);
    res.status(500).json({ error: '下载失败' });
  }
});

// 5. 获取处理历史
app.get('/api/history', async (req, res) => {
  try {
    const files = await fs.readdir(OUTPUT_DIR);
    const history = [];
    
    for (const file of files) {
      const filePath = path.join(OUTPUT_DIR, file);
      const stats = await fs.stat(filePath);
      
      history.push({
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        download_url: `/api/download/${file}`
      });
    }
    
    // 按创建时间倒序
    history.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ history });
    
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({ error: '获取历史失败' });
  }
});

// 调试接口 - 支持自定义模型和提示词
app.post('/api/analyze-debug', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传图片文件' });
    }

    const { model, prompt } = req.body;
    if (!model || !prompt) {
      return res.status(400).json({ success: false, error: '缺少模型或提示词参数' });
    }

    console.log(`[调试模式] 使用模型: ${model}`);
    console.log(`[调试模式] 提示词长度: ${prompt.length} 字符`);

    // 获取图片信息 - 支持BMP预处理
    let imageBuffer = req.file.buffer;
    let preprocessed = false;

    try {
      // 尝试直接使用Sharp获取metadata
      const imageMetadata = await sharp(imageBuffer).metadata();
      var { width: originalWidth, height: originalHeight } = imageMetadata;
    } catch (sharpError) {
      // 如果Sharp失败且是BMP格式，使用Canvas预处理
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const isBMP = fileExtension === '.bmp' || req.file.mimetype === 'image/bmp';

      if (isBMP) {
        console.log('[调试模式] Sharp无法处理BMP格式，尝试Canvas预处理...');
        const bmpResult = await preprocessBMP(req.file.buffer);
        imageBuffer = bmpResult.buffer;
        preprocessed = true;

        // 使用预处理后的PNG获取metadata
        const imageMetadata = await sharp(imageBuffer).metadata();
        var { width: originalWidth, height: originalHeight } = imageMetadata;
        console.log(`[调试模式] BMP预处理成功 - 图片尺寸: ${originalWidth}×${originalHeight}`);
      } else {
        // 非BMP格式的Sharp错误，直接抛出
        throw sharpError;
      }
    }
    
    console.log(`[调试模式] 图片尺寸: ${originalWidth}×${originalHeight}`);

    // 转换为base64
    const imageBase64 = imageBuffer.toString('base64');
    
    // 替换提示词中的模板变量
    const processedPrompt = prompt
      .replace(/\$\{originalWidth\}/g, originalWidth)
      .replace(/\$\{originalHeight\}/g, originalHeight);

    // 调用AI分析
    const result = await analyzeImageWithModel(imageBase64, processedPrompt, model, originalWidth, originalHeight);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        metadata: {
          model: model,
          originalWidth,
          originalHeight,
          promptLength: processedPrompt.length
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        metadata: {
          model: model,
          originalWidth,
          originalHeight
        }
      });
    }
  } catch (error) {
    console.error('[调试模式] 错误:', error);
    res.status(500).json({
      success: false,
      error: `调试分析失败: ${error.message}`
    });
  }
});

// 通用AI分析函数
async function analyzeImageWithModel(imageBase64, prompt, model, originalWidth, originalHeight) {
  const axios = require('axios');
  
  // 最多尝试2次请求
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[${model}] 第${attempt}次请求 - 图片尺寸: ${originalWidth}×${originalHeight}`);
      
      const response = await axios.post('https://api.apiyi.com/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer sk-cSkEKdy2yfQ5Lvlq10Db1c83823f4607Bb9a25751bE9Ac37`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const content = response.data.choices[0].message.content;
      console.log(`[${model}] 原始响应长度: ${content.length}字符`);

      // 提取JSON
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        // 尝试直接解析整个内容
        try {
          const result = JSON.parse(content.trim());
          return validateAndReturnResult(result, originalWidth, originalHeight, model);
        } catch {
          throw new Error('AI响应中未找到有效的JSON格式数据');
        }
      }

      const jsonStr = jsonMatch[1];
      console.log(`[${model}] 提取的JSON: ${jsonStr.substring(0, 200)}...`);

      const result = JSON.parse(jsonStr);
      return validateAndReturnResult(result, originalWidth, originalHeight, model);

    } catch (error) {
      console.error(`[${model}] 第${attempt}次请求失败:`, error.message);
      if (attempt === 2) {
        return {
          success: false,
          error: `模型 ${model} 分析失败: ${error.message}`,
          fallback: false
        };
      }
    }
  }
}

// 验证并返回结果
function validateAndReturnResult(result, originalWidth, originalHeight, model) {
  if (!result.crop_params || !result.analysis) {
    throw new Error('响应格式不完整，缺少必要字段');
  }

  const { x, y, width, height } = result.crop_params;
  
  // 验证坐标
  if (x < 0 || y < 0 || width < 100 || height < 100) {
    throw new Error('裁剪参数无效：坐标或尺寸不符合要求');
  }
  
  if (x + width > originalWidth || y + height > originalHeight) {
    throw new Error('裁剪参数越界：超出原图范围');
  }

  console.log(`[${model}] 分析成功 - 方案: ${result.analysis.title}`);
  
  return {
    success: true,
    data: result
  };
}

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('全局错误处理:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件过大，最大支持50MB' });
    }
    return res.status(400).json({ error: `文件上传错误: ${error.message}` });
  }
  
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API接口不存在' });
});

// 启动服务器
async function startServer() {
  await ensureDirectories();
  
  app.listen(PORT, () => {
    console.log(`🚀 AI裁剪服务已启动`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🎨 美学裁剪: POST /api/crop/aesthetic`);
    console.log(`📦 批量处理: POST /api/crop/batch-aesthetic`);
    console.log(`🐛 调试模式: POST /api/analyze-debug`);
    console.log(`📥 文件下载: GET /api/download/:filename`);
    console.log(`🔍 健康检查: GET /api/health`);
    console.log(`📋 处理历史: GET /api/history`);
  });
}

startServer().catch(console.error);
