#!/usr/bin/env node

/**
 * 每日自动化脚本 - 在美股收盘后自动生成投资组合快照
 * 
 * 运行时间：美东时间下午4:30（市场收盘后30分钟）
 * 功能：
 * 1. 获取最新股价
 * 2. 计算当日投资组合价值
 * 3. 生成每日快照
 * 4. 发送通知（可选）
 */

const https = require('https');

// 配置
const BACKEND_DOMAIN = 'https://stock-backend-tau.vercel.app';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // 需要设置管理员令牌

/**
 * 发送HTTP请求
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = res.statusCode >= 200 && res.statusCode < 300 
                        ? JSON.parse(data) 
                        : { error: data, statusCode: res.statusCode };
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

/**
 * 获取所有活跃用户
 */
async function getActiveUsers() {
    try {
        const result = await makeRequest(`${BACKEND_DOMAIN}/api/users?active=true`, {
            method: 'GET',
            headers: {
                'Authorization': ADMIN_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        
        return result.users || [];
    } catch (error) {
        console.error('获取活跃用户失败:', error);
        return [];
    }
}

/**
 * 为用户生成智能快照
 */
async function generateUserSnapshot(userToken) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const result = await makeRequest(`${BACKEND_DOMAIN}/api/smartSnapshot`, {
            method: 'POST',
            headers: {
                'Authorization': userToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: today,
                forceGenerate: false // 智能生成，避免重复
            })
        });
        
        return result;
    } catch (error) {
        console.error('生成用户快照失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 检查是否为交易日
 */
function isTradingDay(date = new Date()) {
    const day = date.getDay();
    // 周一到周五 (1-5)，排除周末
    return day >= 1 && day <= 5;
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 开始每日自动化任务...');
    console.log('时间:', new Date().toISOString());
    
    // 检查是否为交易日
    if (!isTradingDay()) {
        console.log('⏭️  今天不是交易日，跳过快照生成');
        return;
    }
    
    // 检查管理员令牌
    if (!ADMIN_TOKEN) {
        console.error('❌ 缺少 ADMIN_TOKEN 环境变量');
        process.exit(1);
    }
    
    try {
        // 获取所有活跃用户
        console.log('📋 获取活跃用户列表...');
        const users = await getActiveUsers();
        console.log(`找到 ${users.length} 个活跃用户`);
        
        if (users.length === 0) {
            console.log('⚠️  没有找到活跃用户');
            return;
        }
        
        // 为每个用户生成快照
        const results = [];
        for (const user of users) {
            console.log(`📊 为用户 ${user.username} 生成快照...`);
            
            const result = await generateUserSnapshot(user.token);
            results.push({
                username: user.username,
                ...result
            });
            
            // 添加延迟避免API限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 汇总结果
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log('\n📈 任务完成汇总:');
        console.log(`✅ 成功: ${successful.length} 个用户`);
        console.log(`❌ 失败: ${failed.length} 个用户`);
        
        if (successful.length > 0) {
            console.log('\n成功的用户:');
            successful.forEach(r => {
                console.log(`  - ${r.username}: ${r.message || '快照已生成'}`);
            });
        }
        
        if (failed.length > 0) {
            console.log('\n失败的用户:');
            failed.forEach(r => {
                console.log(`  - ${r.username}: ${r.error || '未知错误'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 自动化任务失败:', error);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 未捕获的错误:', error);
        process.exit(1);
    });
}

module.exports = { main, isTradingDay, generateUserSnapshot };
