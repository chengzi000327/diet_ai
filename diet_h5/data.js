// 模拟饮食数据 - v4版本专用
const mockData = {
    // 每日记录数据（最近30天）
    dailyData: {
        // 生成最近30天的数据
        ...(() => {
            const data = {};
            const today = new Date();
            for (let i = 29; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dayKey = date.toISOString().split('T')[0];
                // 随机生成0-4餐记录，倾向于生成2-4餐
                const mealOptions = [0, 1, 2, 3, 4];
                const weights = [0.1, 0.15, 0.25, 0.35, 0.15]; // 权重分布
                let meals = 0;
                const rand = Math.random();
                let cumulative = 0;
                for (let j = 0; j < mealOptions.length; j++) {
                    cumulative += weights[j];
                    if (rand < cumulative) {
                        meals = mealOptions[j];
                        break;
                    }
                }
                
                data[dayKey] = {
                    meals: meals,
                    intake: Math.floor(Math.random() * 500) + 1500,
                    metabolism: Math.floor(Math.random() * 200) + 1800
                };
            }
            return data;
        })()
    },
    
    // 用户信息
    userInfo: {
        weight: 70,    // 体重（kg）
        height: 175,   // 身高（cm）
        targetCalorieChange: -200, // 目标每日减少/增加卡路里（负数表示减少，正数表示增加）
        // BMI将在代码中计算
    },
    
    // 本周统计数据（7天总计）
    weekStats: {
        totalIntake: 12850,        // 总摄入量（kcal）
        totalMetabolism: 12950,    // 总代谢量（kcal）
        // 注意：以下三个值是7天的总克数，代码中会除以7得到日均值
        carbs: 735,                // 碳水化合物总克数（7天，日均约105g，目标100g，约105%）
        protein: 420,              // 蛋白质总克数（7天，日均约60g，目标50g，约120%）
        fat: 315,                  // 脂肪总克数（7天，日均约45g，目标50g，约90%）
        avgIntake: 1836,           // 平均摄入量
        maxIntake: 2250,           // 最大摄入量
        maxDay: '周三',            // 最大摄入天
        minIntake: 1520,           // 最小摄入量
        minDay: '周六'             // 最小摄入天
    },
    
    // 周平衡数据（周一到周日，7天）
    balanceData: [
        { day: '周一', intake: 1950, metabolism: 1900 },
        { day: '周二', intake: 2250, metabolism: 1950 },
        { day: '周三', intake: 2200, metabolism: 1880 },
        { day: '周四', intake: 1850, metabolism: 1920 },
        { day: '周五', intake: 2100, metabolism: 1900 },
        { day: '周六', intake: 1520, metabolism: 1800 },
        { day: '周日', intake: 1980, metabolism: 1900 }
    ],
    
    // 营养评分原始数据（用于计算 DDS、NBS、DQI、置信度）
    // 注意：以下数据是7天的原始数据，代码会根据这些数据计算最终评分
    nutritionRawData: [
        // 2025年11月17日（周一）
        {
            userId: 'user001',           // 用户ID
            userName: '张三',            // 用户名
            date: '2025-11-17',          // 具体日期
            day: '周一',                 // 星期（保留用于显示）
            // 餐次记录（早餐、午餐、晚餐、加餐等）
            meals: [
                {
                    mealType: '早餐',    // 餐次类型：早餐/午餐/晚餐/加餐
                    mealTime: '08:00',   // 用餐时间
                    foods: [
                        { name: '白米饭', category: '谷薯类', amount: 100, description: '一碗白米饭' },
                        { name: '鸡蛋', category: '蛋类', amount: 100, description: '两个鸡蛋' },
                        { name: '牛奶', category: '奶类', amount: 250, description: '一杯牛奶' }
                    ]
                },
                {
                    mealType: '午餐',
                    mealTime: '12:30',
                    foods: [
                        { name: '白米饭', category: '谷薯类', amount: 150, description: '一碗半白米饭' },
                        { name: '西兰花', category: '蔬菜', amount: 200, description: '一盘西兰花' },
                        { name: '鸡胸肉', category: '肉类', amount: 120, description: '一份鸡胸肉' },
                        { name: '橄榄油', category: '油脂', amount: 10, description: '少量橄榄油' }
                    ]
                },
                {
                    mealType: '晚餐',
                    mealTime: '18:30',
                    foods: [
                        { name: '苹果', category: '水果', amount: 150, description: '一个苹果' }
                    ]
                }
            ],
            // 三大营养素实际摄入量和目标摄入量（单位：克）
            macros: {
                carbs: { actual: 105, target: 100 },      // 碳水化合物：实际105g，目标100g
                protein: { actual: 60, target: 50 },        // 蛋白质：实际60g，目标50g
                fat: { actual: 45, target: 50 }            // 脂肪：实际45g，目标50g
            },
            totalKcal: 1950   // 当天总热量
        },
        // 2025年11月18日（周二）
        {
            userId: 'user001',
            userName: '张三',
            date: '2025-11-18',
            day: '周二',
            meals: [
                {
                    mealType: '早餐',
                    mealTime: '07:30',
                    foods: [
                        { name: '全麦面包', category: '谷薯类', amount: 100, description: '两片全麦面包' },
                        { name: '酸奶', category: '奶类', amount: 200, description: '一杯酸奶' },
                        { name: '香蕉', category: '水果', amount: 120, description: '一根香蕉' }
                    ]
                },
                {
                    mealType: '午餐',
                    mealTime: '12:00',
                    foods: [
                        { name: '三文鱼', category: '水产品', amount: 120, description: '一份三文鱼' },
                        { name: '菠菜', category: '蔬菜', amount: 150, description: '一盘菠菜' },
                        { name: '豆腐', category: '豆制品', amount: 150, description: '一份豆腐' },
                        { name: '花生油', category: '油脂', amount: 15, description: '少量花生油' }
                    ]
                },
                {
                    mealType: '加餐',
                    mealTime: '15:30',
                    foods: [
                        { name: '核桃', category: '坚果', amount: 30, description: '几颗核桃' }
                    ]
                }
            ],
            macros: {
                carbs: { actual: 95, target: 100 },
                protein: { actual: 65, target: 50 },
                fat: { actual: 55, target: 50 }
            },
            totalKcal: 2250
        },
        // 周三
        {
            day: '周三',
            foods: [
                { name: '紫薯', category: '谷薯类', amount: 200 },
                { name: '胡萝卜', category: '蔬菜', amount: 100 },
                { name: '牛肉', category: '肉类', amount: 100 },
                { name: '鸡蛋', category: '蛋类', amount: 50 },
                { name: '橙子', category: '水果', amount: 150 },
                { name: '牛奶', category: '奶类', amount: 200 }
            ],
            macros: {
                carbs: { actual: 110, target: 100 },
                protein: { actual: 55, target: 50 },
                fat: { actual: 42, target: 50 }
            },
            mealCount: 2,
            totalKcal: 2200
        },
        // 周四
        {
            day: '周四',
            foods: [
                { name: '白米饭', category: '谷薯类', amount: 120 },
                { name: '青菜', category: '蔬菜', amount: 200 },
                { name: '鸡胸肉', category: '肉类', amount: 100 },
                { name: '鸡蛋', category: '蛋类', amount: 50 },
                { name: '牛奶', category: '奶类', amount: 250 },
                { name: '葡萄', category: '水果', amount: 100 },
                { name: '菜籽油', category: '油脂', amount: 12 }
            ],
            macros: {
                carbs: { actual: 100, target: 100 },
                protein: { actual: 58, target: 50 },
                fat: { actual: 48, target: 50 }
            },
            mealCount: 3,
            totalKcal: 1850
        },
        // 周五
        {
            day: '周五',
            foods: [
                { name: '燕麦', category: '谷薯类', amount: 80 },
                { name: '番茄', category: '蔬菜', amount: 150 },
                { name: '黄瓜', category: '蔬菜', amount: 100 },
                { name: '虾', category: '水产品', amount: 150 },
                { name: '豆腐', category: '豆制品', amount: 100 },
                { name: '草莓', category: '水果', amount: 150 },
                { name: '酸奶', category: '奶类', amount: 200 },
                { name: '杏仁', category: '坚果', amount: 20 },
                { name: '橄榄油', category: '油脂', amount: 10 }
            ],
            macros: {
                carbs: { actual: 92, target: 100 },
                protein: { actual: 62, target: 50 },
                fat: { actual: 52, target: 50 }
            },
            mealCount: 3,
            totalKcal: 2100
        },
        // 周六
        {
            day: '周六',
            foods: [
                { name: '白米饭', category: '谷薯类', amount: 180 },
                { name: '白菜', category: '蔬菜', amount: 150 },
                { name: '猪肉', category: '肉类', amount: 80 },
                { name: '苹果', category: '水果', amount: 120 },
                { name: '牛奶', category: '奶类', amount: 200 }
            ],
            macros: {
                carbs: { actual: 120, target: 100 },
                protein: { actual: 48, target: 50 },
                fat: { actual: 46, target: 50 }
            },
            mealCount: 2,
            totalKcal: 1520
        },
        // 周日
        {
            day: '周日',
            foods: [
                { name: '面条', category: '谷薯类', amount: 150 },
                { name: '西兰花', category: '蔬菜', amount: 150 },
                { name: '鸡胸肉', category: '肉类', amount: 110 },
                { name: '鸡蛋', category: '蛋类', amount: 50 },
                { name: '牛奶', category: '奶类', amount: 250 },
                { name: '梨', category: '水果', amount: 120 },
                { name: '菜籽油', category: '油脂', amount: 10 }
            ],
            macros: {
                carbs: { actual: 98, target: 100 },
                protein: { actual: 57, target: 50 },
                fat: { actual: 47, target: 50 }
            },
            mealCount: 3,
            totalKcal: 1980
        }
    ],
    
    // 预期热量（用于计算置信度）
    expectedKcal: 1800,  // 预期每日热量（可根据用户信息计算）
    
    // 食物热量数据库（每100g的热量，单位：kcal）
    // 用于计算 topFoods 的总热量
    foodCaloriesDB: {
        '白米饭': 116,
        '全麦面包': 240,
        '紫薯': 82,
        '面条': 109,
        '燕麦': 389,
        '西兰花': 25,
        '菠菜': 23,
        '青菜': 15,
        '胡萝卜': 41,
        '番茄': 15,
        '黄瓜': 16,
        '白菜': 17,
        '鸡胸肉': 165,
        '牛肉': 250,
        '猪肉': 242,
        '三文鱼': 139,
        '虾': 93,
        '鸡蛋': 144,
        '牛奶': 54,
        '酸奶': 59,
        '苹果': 52,
        '香蕉': 93,
        '橙子': 47,
        '葡萄': 44,
        '草莓': 32,
        '梨': 44,
        '豆腐': 81,
        '橄榄油': 884,
        '花生油': 884,
        '菜籽油': 884,
        '核桃': 654,
        '杏仁': 578
    },
    
    // 连击天数（连续打卡天数）
    streak: 12
};

// 统计 Top10 食物的函数
// 从 nutritionRawData 中统计用户吃了哪些食物，计算总摄入量和出现天数
function calculateTopFoods() {
    if (!mockData.nutritionRawData || mockData.nutritionRawData.length === 0) {
        return [];
    }
    
    // 用于存储食物统计信息
    const foodStats = {};
    
    // 遍历7天的数据
    mockData.nutritionRawData.forEach(day => {
        // 兼容新旧数据结构
        // 新结构：有 meals 数组，每个 meal 包含 foods 数组
        // 旧结构：直接有 foods 数组
        let foods = [];
        
        if (day.meals && Array.isArray(day.meals)) {
            // 新结构：从 meals 中提取所有 foods
            day.meals.forEach(meal => {
                if (meal.foods && Array.isArray(meal.foods)) {
                    foods = foods.concat(meal.foods);
                }
            });
        } else if (day.foods && Array.isArray(day.foods)) {
            // 旧结构：直接使用 foods
            foods = day.foods;
        }
        
        if (foods.length === 0) {
            return;
        }
        
        // 记录当天出现的食物（用于统计频次）
        const dayFoods = new Set();
        
        // 遍历当天的食物
        foods.forEach(food => {
            const foodName = food.name;
            
            // 初始化食物统计
            if (!foodStats[foodName]) {
                foodStats[foodName] = {
                    name: foodName,
                    amount: 0,      // 总摄入量（克）
                    frequency: 0,    // 出现天数
                    calories: 0      // 总热量（kcal）
                };
            }
            
            // 累加摄入量
            foodStats[foodName].amount += food.amount || 0;
            
            // 如果当天还没记录过这个食物，增加频次
            if (!dayFoods.has(foodName)) {
                foodStats[foodName].frequency += 1;
                dayFoods.add(foodName);
            }
        });
    });
    
    // 计算每种食物的总热量
    Object.values(foodStats).forEach(food => {
        // 从热量数据库中查找每100g的热量
        const caloriesPer100g = mockData.foodCaloriesDB[food.name] || 100; // 默认100kcal/100g
        // 计算总热量：总摄入量(g) / 100 * 每100g热量
        food.calories = Math.round((food.amount / 100) * caloriesPer100g);
    });
    
    // 转换为数组并按频次排序（如果频次相同，按摄入量排序）
    const topFoods = Object.values(foodStats)
        .sort((a, b) => {
            // 先按频次降序
            if (b.frequency !== a.frequency) {
                return b.frequency - a.frequency;
            }
            // 频次相同，按摄入量降序
            return b.amount - a.amount;
        })
        .slice(0, 10); // 取前10个
    
    return topFoods;
}

// 计算并设置 topFoods
mockData.topFoods = calculateTopFoods();

