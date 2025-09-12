const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式: jpeg, jpg, png, gif, webp'));
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

// GPT-4.1 Vision API调用
async function callGPTVisionAPI(imageBase64, originalWidth, originalHeight, mode = 'aesthetic') {
  const axios = require('axios');
  
  const prompts = {
    aesthetic: `你是专业的图片裁剪专家。分析这张图片(${originalWidth}×${originalHeight})，提供最佳美学裁剪方案。

目标：让图片更美观、更有视觉冲击力。

参考案例：
case1: 电影宽银幕
效果：强调孤独与辽阔感，去掉多余沙地与右侧亮点干扰

case2: 方形极简（头像墙/封面友好） 
效果：更克制的极简感，适合正方形平台位

case3: 竖幅海报（强调"向上消散"的雾）
效果：保留上部层层递进的雾，做海报/封面

请返回JSON格式：
{
  "analysis": {
    "方案标题": "简洁的方案名称",
    "效果": "具体的视觉效果描述"
  },
  "crop_params": {
    "x": 起始X坐标（0到${originalWidth-100}之间）,
    "y": 起始Y坐标（0到${originalHeight-100}之间）,
    "width": 裁剪宽度（至少100像素）,
    "height": 裁剪高度（至少100像素）
  }
}

注意：裁剪区域必须完全在原图范围内。`,

    platform: `你是社交媒体平台规范专家。分析图片(${originalWidth}×${originalHeight})，根据指定平台要求提供裁剪建议。

平台规范：
- Instagram帖子: 1080×1080 (1:1)
- Instagram故事: 1080×1920 (9:16)
- TikTok: 1080×1920 (9:16)
- YouTube缩略图: 1280×720 (16:9)
- Twitter头像: 400×400 (1:1)
- LinkedIn头像: 400×400 (1:1)
- Facebook封面: 1200×630 (16:9)

请返回JSON格式裁剪参数，确保在图片范围内。`
  };

  try {
    const response = await axios.post('https://api.apiyi.com/v1/chat/completions', {
      model: 'gpt-4.1-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompts[mode]
            },
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
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'sk-cSkEKdy2yfQ5Lvlq10Db1c83823f4607Bb9a25751bE9Ac37'}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    
    // 尝试提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('无法解析GPT响应中的JSON');
    }
    
  } catch (error) {
    console.error('GPT API调用失败:', error.message);
    // 返回默认的美学裁剪参数
    return generateFallbackCrop(mode);
  }
}

// 备用裁剪算法
function generateFallbackCrop(mode, originalWidth = 1080, originalHeight = 1350) {
  const aestheticCrops = [
    {
      analysis: {
        "方案标题": "经典三分构图",
        "效果": "突出主体，增强画面张力和视觉聚焦效果"
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
        "方案标题": "黄金比例构图",
        "效果": "营造和谐视觉节奏，提升整体美感和艺术性"
      },
      crop_params: {
        x: Math.floor(originalWidth * 0.15),
        y: Math.floor(originalHeight * 0.1),
        width: Math.floor(originalWidth * 0.7),
        height: Math.floor(originalHeight * 0.8)
      }
    }
  ];
  
  return aestheticCrops[Math.floor(Math.random() * aestheticCrops.length)];
}

// 智能裁剪处理
async function performSmartCrop(imageBuffer, cropParams, format = 'png', quality = 95) {
  const { x = 0, y = 0, width, height } = cropParams;
  
  try {
    let sharpImage = sharp(imageBuffer);
    
    // 获取原图信息
    const metadata = await sharpImage.metadata();
    
    // 确保裁剪参数在有效范围内
    const validX = Math.max(0, Math.min(x, metadata.width - 50));
    const validY = Math.max(0, Math.min(y, metadata.height - 50));
    const validWidth = Math.min(width, metadata.width - validX);
    const validHeight = Math.min(height, metadata.height - validY);
    
    // 执行裁剪
    const croppedBuffer = await sharpImage
      .extract({
        left: validX,
        top: validY,
        width: validWidth,
        height: validHeight
      })
      .toFormat(format, { quality })
      .toBuffer();
    
    return {
      success: true,
      buffer: croppedBuffer,
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
    
    // 获取图片尺寸信息
    const metadata = await sharp(req.file.buffer).metadata();
    const { width: originalWidth, height: originalHeight } = metadata;
    
    // 转换为Base64供GPT分析
    const imageBase64 = req.file.buffer.toString('base64');
    
    // 调用GPT-4.1 Vision进行美学分析
    const analysisResult = await callGPTVisionAPI(imageBase64, originalWidth, originalHeight, 'aesthetic');
    
    // 执行智能裁剪 (默认PNG格式，保持原图质量)
    const cropResult = await performSmartCrop(
      req.file.buffer, 
      analysisResult.crop_params,
      'png',
      95
    );
    
    if (!cropResult.success) {
      return res.status(500).json({ error: `裁剪失败: ${cropResult.error}` });
    }
    
    // 保存结果文件
    const outputFileName = `aesthetic_${requestId}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    await fs.writeFile(outputPath, cropResult.buffer);
    
    console.log(`[${requestId}] 美学裁剪完成`);
    
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
        format: 'png',
        quality: 95
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
    
    const results = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const requestId = `${batchId}_${i + 1}`;
      
      try {
        // 获取图片尺寸信息
        const metadata = await sharp(file.buffer).metadata();
        const { width: originalWidth, height: originalHeight } = metadata;
        
        // GPT美学分析
        const imageBase64 = file.buffer.toString('base64');
        const analysisResult = await callGPTVisionAPI(imageBase64, originalWidth, originalHeight, 'aesthetic');
        
        // 执行裁剪
        const cropResult = await performSmartCrop(
          file.buffer, 
          analysisResult.crop_params,
          'png',
          95
        );
        
        if (cropResult.success) {
          const outputFileName = `batch_aesthetic_${requestId}.png`;
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
              download_url: `/api/download/${outputFileName}`
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
    console.log(`📥 文件下载: GET /api/download/:filename`);
    console.log(`🔍 健康检查: GET /api/health`);
    console.log(`📋 处理历史: GET /api/history`);
  });
}

startServer().catch(console.error);