// 平台规格数据库
// 维护各个社交媒体平台的标准尺寸要求

const PLATFORM_SPECS = {
    // Instagram 规格
    'instagram-post': {
        name: 'Instagram 帖子',
        ratio: '1:1',
        recommended_size: [1080, 1080],
        min_size: [320, 320],
        max_size: [1080, 1080],
        description: '正方形帖子，适合展示完整内容',
        last_updated: '2024-09-11',
        official_source: 'https://help.instagram.com/1631821640426723'
    },
    
    'instagram-story': {
        name: 'Instagram 故事',
        ratio: '9:16', 
        recommended_size: [1080, 1920],
        min_size: [750, 1334],
        max_size: [1080, 1920],
        safe_area: {
            top: 250,
            bottom: 250,
            description: '避免重要内容被UI遮挡'
        },
        description: '全屏竖向展示，支持多种互动功能',
        last_updated: '2024-09-11',
        official_source: 'https://help.instagram.com/1631821640426723'
    },

    'instagram-reel': {
        name: 'Instagram Reels',
        ratio: '9:16',
        recommended_size: [1080, 1920],
        min_size: [720, 1280],
        max_size: [1080, 1920],
        description: '短视频内容，竖屏优先',
        last_updated: '2024-09-11'
    },

    // TikTok 规格
    'tiktok': {
        name: 'TikTok 视频',
        ratio: '9:16',
        recommended_size: [1080, 1920],
        min_size: [720, 1280],
        max_size: [1080, 1920],
        description: '竖屏短视频，全屏沉浸体验',
        last_updated: '2024-09-11',
        official_source: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en'
    },

    // 微信规格
    'wechat-avatar': {
        name: '微信头像',
        ratio: '1:1',
        recommended_size: [200, 200],
        min_size: [64, 64],
        max_size: [640, 640],
        description: '圆形显示，建议人脸居中',
        last_updated: '2024-09-11'
    },

    'wechat-cover': {
        name: '微信朋友圈封面',
        ratio: '2.35:1',
        recommended_size: [1200, 510],
        min_size: [720, 306],
        max_size: [1200, 510],
        description: '横向封面图，展示个性',
        last_updated: '2024-09-11'
    },

    // Facebook 规格
    'facebook-post': {
        name: 'Facebook 帖子',
        ratio: '1.91:1',
        recommended_size: [1200, 630],
        min_size: [600, 314],
        max_size: [1200, 630],
        description: '链接分享最佳比例',
        last_updated: '2024-09-11',
        official_source: 'https://developers.facebook.com/docs/sharing/webmasters/images'
    },

    'facebook-cover': {
        name: 'Facebook 封面',
        ratio: '2.7:1',
        recommended_size: [820, 312],
        min_size: [820, 312],
        max_size: [820, 312],
        description: '页面头部展示图',
        last_updated: '2024-09-11'
    },

    // Twitter/X 规格
    'twitter-post': {
        name: 'Twitter 帖子',
        ratio: '16:9',
        recommended_size: [1200, 675],
        min_size: [600, 335],
        max_size: [1200, 675],
        description: '横向图片，适合卡片展示',
        last_updated: '2024-09-11'
    },

    'twitter-header': {
        name: 'Twitter 头部',
        ratio: '3:1',
        recommended_size: [1500, 500],
        min_size: [1500, 500],
        max_size: [1500, 500],
        description: '个人资料头部背景',
        last_updated: '2024-09-11'
    },

    // YouTube 规格
    'youtube-thumbnail': {
        name: 'YouTube 缩略图',
        ratio: '16:9',
        recommended_size: [1280, 720],
        min_size: [640, 360],
        max_size: [1280, 720],
        description: '视频封面，吸引点击',
        last_updated: '2024-09-11',
        official_source: 'https://support.google.com/youtube/answer/72431'
    },

    // LinkedIn 规格
    'linkedin-avatar': {
        name: 'LinkedIn 头像', 
        ratio: '1:1',
        recommended_size: [400, 400],
        min_size: [200, 200],
        max_size: [7680, 4320], // LinkedIn支持高分辨率
        description: '专业头像，正装推荐',
        last_updated: '2024-09-11'
    },

    'linkedin-cover': {
        name: 'LinkedIn 背景',
        ratio: '4:1',
        recommended_size: [1584, 396],
        min_size: [1192, 220],
        max_size: [1584, 396],
        description: '个人品牌展示背景',
        last_updated: '2024-09-11'
    },

    // 专业用途
    'resume-photo': {
        name: '简历照片',
        ratio: '3:4',
        recommended_size: [300, 400],
        min_size: [150, 200],
        max_size: [600, 800],
        description: '专业证件照风格',
        last_updated: '2024-09-11'
    },

    'id-photo': {
        name: '证件照',
        ratio: '3:4',
        recommended_size: [300, 400],
        min_size: [150, 200], 
        max_size: [600, 800],
        description: '标准证件照尺寸',
        last_updated: '2024-09-11'
    },

    // 通用尺寸
    'square': {
        name: '正方形',
        ratio: '1:1',
        recommended_size: [1080, 1080],
        min_size: [200, 200],
        max_size: [2048, 2048],
        description: '通用正方形格式',
        last_updated: '2024-09-11'
    },

    'landscape': {
        name: '横向 16:9',
        ratio: '16:9',
        recommended_size: [1920, 1080],
        min_size: [640, 360],
        max_size: [3840, 2160],
        description: '标准横向宽屏比例',
        last_updated: '2024-09-11'
    },

    'portrait': {
        name: '竖向 9:16',
        ratio: '9:16', 
        recommended_size: [1080, 1920],
        min_size: [360, 640],
        max_size: [2160, 3840],
        description: '标准竖向手机比例',
        last_updated: '2024-09-11'
    }
};

/**
 * 解析比例字符串为数值
 * @param {string} ratioString - 比例字符串，如 "16:9"
 * @returns {number} 比例数值
 */
function parseRatio(ratioString) {
    const [width, height] = ratioString.split(':').map(Number);
    return width / height;
}

/**
 * 根据场景获取规格信息
 * @param {string} scene - 场景标识
 * @returns {Object|null} 规格信息
 */
function getSpecsByScene(scene) {
    return PLATFORM_SPECS[scene] || null;
}

/**
 * 获取所有可用的场景
 * @returns {Array} 场景列表
 */
function getAllScenes() {
    return Object.keys(PLATFORM_SPECS);
}

/**
 * 按分类获取场景
 * @param {string} category - 分类名称
 * @returns {Array} 场景列表  
 */
function getScenesByCategory(category) {
    const categories = {
        'social': [
            'instagram-post', 'instagram-story', 'instagram-reel',
            'tiktok', 'facebook-post', 'facebook-cover',
            'twitter-post', 'twitter-header', 'youtube-thumbnail'
        ],
        'chinese': [
            'wechat-avatar', 'wechat-cover'
        ],
        'professional': [
            'linkedin-avatar', 'linkedin-cover',
            'resume-photo', 'id-photo'
        ],
        'generic': [
            'square', 'landscape', 'portrait'
        ]
    };
    
    return categories[category] || [];
}

/**
 * 验证输出尺寸是否符合规格要求
 * @param {Array} outputSize - 输出尺寸 [width, height]
 * @param {string} scene - 场景标识
 * @returns {Object} 验证结果
 */
function validateOutputSize(outputSize, scene) {
    const specs = getSpecsByScene(scene);
    if (!specs) {
        return { 
            valid: false, 
            error: `未知场景: ${scene}` 
        };
    }

    const [width, height] = outputSize;
    const actualRatio = width / height;
    const expectedRatio = parseRatio(specs.ratio);
    const ratioTolerance = 0.001; // 比例容差

    // 比例验证
    if (Math.abs(actualRatio - expectedRatio) > ratioTolerance) {
        return {
            valid: false,
            error: `比例不匹配: 期望${specs.ratio}(${expectedRatio.toFixed(3)}), 实际${actualRatio.toFixed(3)}`
        };
    }

    // 尺寸范围验证
    const [minW, minH] = specs.min_size || [0, 0];
    const [maxW, maxH] = specs.max_size || [Infinity, Infinity];

    if (width < minW || height < minH) {
        return {
            valid: false,
            error: `尺寸过小: 最小要求${minW}×${minH}, 当前${width}×${height}`
        };
    }

    if (width > maxW || height > maxH) {
        return {
            valid: false,
            error: `尺寸过大: 最大允许${maxW}×${maxH}, 当前${width}×${height}`
        };
    }

    // 推荐尺寸检查
    const [recW, recH] = specs.recommended_size;
    const isRecommended = width === recW && height === recH;

    return {
        valid: true,
        format_accuracy: '100%',
        platform_compatible: true,
        is_recommended_size: isRecommended,
        recommendation: isRecommended ? null : `推荐使用 ${recW}×${recH} 以获得最佳效果`
    };
}

// 导出供全局使用
window.PLATFORM_SPECS = PLATFORM_SPECS;
window.parseRatio = parseRatio;
window.getSpecsByScene = getSpecsByScene;
window.getAllScenes = getAllScenes;
window.getScenesByCategory = getScenesByCategory;
window.validateOutputSize = validateOutputSize;

console.log('📊 平台规格数据库已加载，支持', Object.keys(PLATFORM_SPECS).length, '种场景');