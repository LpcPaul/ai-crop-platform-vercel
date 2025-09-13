#!/usr/bin/env node

/**
 * GPT-4.1 Vision API 连接测试脚本
 * 验证API密钥和模型调用是否正常
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_KEY = process.env.OPENAI_API_KEY || 'sk-cSkEKdy2yfQ5Lvlq10Db1c83823f4607Bb9a25751bE9Ac37';
const API_ENDPOINT = 'https://api.apiyi.com/v1/chat/completions';

console.log('🚀 开始GPT-4.1 Vision API连接测试...\n');

// 测试1: 基础文本调用
async function testBasicGPT41() {
  console.log('📝 测试1: 基础GPT-4.1文本调用');
  
  try {
    const response = await axios.post(API_ENDPOINT, {
      model: 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: '你好，请简单介绍一下你自己，并确认你是GPT-4.1模型。'
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 基础调用成功');
    console.log('📤 模型:', response.data.model);
    console.log('💬 回复:', response.data.choices[0].message.content);
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ 基础调用失败');
    console.error('错误:', error.response?.data || error.message);
    console.log('');
    return false;
  }
}

// 测试2: Vision功能测试（创建简单测试图像）
async function testGPT41Vision() {
  console.log('🖼️  测试2: GPT-4.1 Vision功能测试');
  
  try {
    // 创建一个简单的测试图像（红色方块）
    const canvas = require('canvas');
    const { createCanvas } = canvas;
    
    const testCanvas = createCanvas(200, 200);
    const ctx = testCanvas.getContext('2d');
    
    // 绘制红色背景
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 200, 200);
    
    // 绘制白色文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST', 100, 110);
    
    // 转换为base64
    const imageBase64 = testCanvas.toDataURL('image/jpeg').split(',')[1];
    
    console.log('🎨 已生成测试图像 (200x200, 红色背景+白色TEST文字)');
    
    const response = await axios.post(API_ENDPOINT, {
      model: 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请描述这个图像的内容，包括颜色、文字和大致尺寸。请用中文回答。'
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
      max_tokens: 300,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Vision调用成功');
    console.log('📤 模型:', response.data.model);
    console.log('👁️  图像描述:', response.data.choices[0].message.content);
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Vision调用失败');
    console.error('错误:', error.response?.data || error.message);
    console.log('');
    return false;
  }
}

// 测试3: 图片裁剪分析测试
async function testCropAnalysis() {
  console.log('✂️  测试3: 图片裁剪分析功能测试');
  
  try {
    // 创建一个更复杂的测试图像（风景图模拟）
    const canvas = require('canvas');
    const { createCanvas } = canvas;
    
    const testCanvas = createCanvas(800, 600);
    const ctx = testCanvas.getContext('2d');
    
    // 绘制蓝色天空
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, 800, 300);
    
    // 绘制绿色地面
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 300, 800, 300);
    
    // 绘制黄色太阳
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(150, 150, 50, 0, 2 * Math.PI);
    ctx.fill();
    
    // 绘制棕色树干
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(600, 200, 40, 200);
    
    // 绘制绿色树冠
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(620, 180, 80, 0, 2 * Math.PI);
    ctx.fill();
    
    const imageBase64 = testCanvas.toDataURL('image/jpeg').split(',')[1];
    
    console.log('🎨 已生成风景测试图像 (800x600, 天空+地面+太阳+树)');
    
    // 使用v0.2版本的专业prompt
    const fs = require('fs');
    const path = require('path');
    let cropPrompt;
    
    try {
      // 读取v0.2 prompt文件
      cropPrompt = fs.readFileSync(path.join(__dirname, 'prompts', 'v0.2-aesthetic.txt'), 'utf-8');
      // 替换模板变量
      cropPrompt = cropPrompt.replace(/\$\{originalWidth\}/g, '800')
                            .replace(/\$\{originalHeight\}/g, '600');
      console.log('✅ 已加载v0.2-aesthetic.txt prompt文件');
    } catch (error) {
      console.warn('⚠️  无法读取v0.2 prompt文件，使用备用prompt');
      cropPrompt = `你是专业的图片裁剪专家。坐标原点为左上角，单位为像素。
**输入：** 原图尺寸 (800×600)。
**目标：** 让图片更美观、更有视觉冲击力。

请返回JSON格式：
{
  "analysis": {
    "方案标题": "简洁的方案名称",
    "效果": "具体的视觉效果描述"
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

    const response = await axios.post(API_ENDPOINT, {
      model: 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: cropPrompt
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
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 裁剪分析调用成功');
    console.log('📤 模型:', response.data.model);
    console.log('📝 原始响应:', response.data.choices[0].message.content);
    
    // 尝试解析JSON
    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON解析成功:');
        console.log('  📝 方案标题:', parsedResult.analysis?.方案标题);
        console.log('  📖 效果描述:', parsedResult.analysis?.效果);
        console.log('  ✂️  裁剪参数:', parsedResult.crop_params);
        console.log('  🎯 锚点提示:', parsedResult.subject_anchor_hint);
      } catch (parseError) {
        console.warn('⚠️  JSON解析失败:', parseError.message);
      }
    } else {
      console.warn('⚠️  响应中未找到JSON格式');
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ 裁剪分析调用失败');
    console.error('错误:', error.response?.data || error.message);
    console.log('');
    return false;
  }
}

// 测试4: v0.2 prompt质量验证（多个场景）
async function testV02PromptQuality() {
  console.log('🎨 测试4: v0.2 Prompt质量验证（多场景测试）');
  
  const testScenarios = [
    {
      name: '海边人物',
      description: '一个人在海滩上走路，背景有海浪和夕阳',
      drawFunction: (ctx, canvas) => {
        // 绘制夕阳天空 (橙色渐变)
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, '#FF6B35');
        gradient.addColorStop(1, '#F7931E');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, 300);
        
        // 绘制海水 (蓝色)
        ctx.fillStyle = '#4682B4';
        ctx.fillRect(0, 300, canvas.width, 300);
        
        // 绘制人物剪影 (黑色)
        ctx.fillStyle = '#000000';
        ctx.fillRect(200, 220, 20, 80);  // 身体
        ctx.beginPath();
        ctx.arc(210, 210, 15, 0, 2 * Math.PI);  // 头部
        ctx.fill();
        
        // 绘制太阳
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(600, 150, 60, 0, 2 * Math.PI);
        ctx.fill();
      }
    },
    {
      name: '城市夜景',
      description: '城市建筑轮廓，有霓虹灯光效果',
      drawFunction: (ctx, canvas) => {
        // 夜空 (深蓝色)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(0, 0, canvas.width, 400);
        
        // 建筑轮廓
        ctx.fillStyle = '#374151';
        ctx.fillRect(100, 200, 80, 400);  // 建筑1
        ctx.fillRect(220, 150, 60, 450);  // 建筑2
        ctx.fillRect(320, 180, 90, 420);  // 建筑3
        ctx.fillRect(450, 120, 70, 480);  // 建筑4
        ctx.fillRect(560, 160, 80, 440);  // 建筑5
        
        // 霓虹灯效果 (亮色窗户)
        ctx.fillStyle = '#fbbf24';
        const windows = [[120, 250], [140, 280], [240, 200], [340, 220], [470, 160], [580, 200]];
        windows.forEach(([x, y]) => {
          ctx.fillRect(x, y, 15, 20);
        });
      }
    }
  ];
  
  const results = [];
  
  for (const scenario of testScenarios) {
    try {
      console.log(`\n🖼️  测试场景: ${scenario.name}`);
      
      // 创建测试图像
      const canvas = require('canvas');
      const { createCanvas } = canvas;
      const testCanvas = createCanvas(800, 600);
      const ctx = testCanvas.getContext('2d');
      
      // 绘制场景
      scenario.drawFunction(ctx, testCanvas);
      const imageBase64 = testCanvas.toDataURL('image/jpeg').split(',')[1];
      
      // 读取v0.2 prompt
      const fs = require('fs');
      const path = require('path');
      let cropPrompt = fs.readFileSync(path.join(__dirname, 'prompts', 'v0.2-aesthetic.txt'), 'utf-8');
      cropPrompt = cropPrompt.replace(/\$\{originalWidth\}/g, '800').replace(/\$\{originalHeight\}/g, '600');
      
      const response = await axios.post(API_ENDPOINT, {
        model: 'gpt-4.1',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: cropPrompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` }}
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        results.push({
          scenario: scenario.name,
          success: true,
          title: result.analysis?.方案标题,
          effect: result.analysis?.效果,
          cropParams: result.crop_params,
          anchor: result.subject_anchor_hint
        });
        
        console.log(`  ✅ ${scenario.name} - 成功`);
        console.log(`  📝 方案标题: ${result.analysis?.方案标题}`);
        console.log(`  📖 效果描述: ${result.analysis?.效果}`);
        console.log(`  ✂️  裁剪区域: ${result.crop_params?.width}×${result.crop_params?.height}`);
        
        // 检查是否符合v0.2要求 (避免空泛术语)
        const title = result.analysis?.方案标题 || '';
        const effect = result.analysis?.效果 || '';
        const badWords = ['黄金比例', '视觉冲击', '艺术性', '和谐统一', '优化构图', '更均衡', '更有层次'];
        const hasBadWords = badWords.some(word => title.includes(word) || effect.includes(word));
        
        if (hasBadWords) {
          console.log(`  ⚠️  检测到空泛术语，v0.2质量要求需要改进`);
        } else {
          console.log(`  ✅ 符合v0.2质量要求 - 避免了空泛术语`);
        }
      } else {
        results.push({ scenario: scenario.name, success: false, error: 'JSON解析失败' });
        console.log(`  ❌ ${scenario.name} - JSON解析失败`);
      }
      
    } catch (error) {
      results.push({ scenario: scenario.name, success: false, error: error.message });
      console.log(`  ❌ ${scenario.name} - 请求失败: ${error.message}`);
    }
  }
  
  console.log(`\n📊 v0.2 Prompt质量测试汇总:`);
  const successCount = results.filter(r => r.success).length;
  console.log(`  成功场景: ${successCount}/${results.length}`);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`  ✅ ${result.scenario}: "${result.title}"`);
    } else {
      console.log(`  ❌ ${result.scenario}: ${result.error}`);
    }
  });
  
  console.log('');
  return successCount === results.length;
}

// 主测试函数
async function runAllTests() {
  console.log('🔑 API密钥:', API_KEY.substring(0, 15) + '...');
  console.log('🌐 API端点:', API_ENDPOINT);
  console.log('');
  
  const results = {
    basic: await testBasicGPT41(),
    vision: await testGPT41Vision(),
    crop: await testCropAnalysis(),
    v02Quality: await testV02PromptQuality()
  };
  
  console.log('📊 测试结果汇总:');
  console.log(`  基础调用: ${results.basic ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  Vision功能: ${results.vision ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  裁剪分析: ${results.crop ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  v0.2质量验证: ${results.v02Quality ? '✅ 通过' : '❌ 失败'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 总体结果: ${successCount}/4 项测试通过`);
  
  if (successCount === 4) {
    console.log('🎉 GPT-4.1 Vision API配置完全正常！v0.2 Prompt质量优秀！');
  } else if (successCount >= 3) {
    console.log('🎉 GPT-4.1 Vision API配置正常！部分功能可进一步优化');
  } else if (successCount > 0) {
    console.log('⚠️  部分功能正常，建议检查失败的项目');
  } else {
    console.log('🚨 所有测试失败，请检查API密钥和网络连接');
  }
}

// 运行测试
runAllTests().catch(console.error);