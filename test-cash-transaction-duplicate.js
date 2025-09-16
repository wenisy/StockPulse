// 测试现金交易重复存储问题
const { Client } = require('@notionhq/client');

// 模拟环境变量
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_TRANSACTIONS_DB_ID = process.env.NOTION_TRANSACTIONS_DB_ID;

if (!NOTION_TOKEN || !NOTION_TRANSACTIONS_DB_ID) {
    console.error('请设置 NOTION_TOKEN 和 NOTION_TRANSACTIONS_DB_ID 环境变量');
    process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

async function testCashTransactionDuplicate() {
    console.log('开始测试现金交易重复存储问题...');
    
    const testUserUuid = 'test-user-uuid-' + Date.now();
    const testYear = '2024';
    const testAmount = 1000;
    const testType = 'deposit';
    const testDate = '2024-01-15';
    
    // 模拟前端发送的增量数据
    const incrementalChanges = {
        cashTransactions: {
            [testYear]: [{
                amount: testAmount,
                type: testType,
                date: testDate,
                userUuid: testUserUuid
            }]
        }
    };
    
    console.log('模拟增量数据:', JSON.stringify(incrementalChanges, null, 2));
    
    try {
        // 第一次调用 - 模拟正常的现金交易添加
        console.log('\n=== 第一次调用 ===');
        await syncCashTransactions(incrementalChanges, testUserUuid);
        
        // 查询数据库中的记录
        const firstQueryResult = await queryTransactions(testUserUuid);
        console.log('第一次调用后的记录数:', firstQueryResult.length);
        
        // 第二次调用 - 模拟重复调用（比如网络重试或用户重复点击）
        console.log('\n=== 第二次调用（模拟重复） ===');
        await syncCashTransactions(incrementalChanges, testUserUuid);
        
        // 再次查询数据库中的记录
        const secondQueryResult = await queryTransactions(testUserUuid);
        console.log('第二次调用后的记录数:', secondQueryResult.length);
        
        // 分析结果
        if (secondQueryResult.length > firstQueryResult.length) {
            console.log('\n❌ 发现重复存储问题！');
            console.log('预期记录数: 1');
            console.log('实际记录数:', secondQueryResult.length);
            
            // 显示重复的记录
            secondQueryResult.forEach((record, index) => {
                const transactionId = record.properties['Transaction ID']?.title?.[0]?.text?.content;
                const amount = record.properties.Amount?.number;
                const type = record.properties.Type?.select?.name;
                const date = record.properties.Date?.date?.start;
                console.log(`记录 ${index + 1}: ID=${transactionId}, 金额=${amount}, 类型=${type}, 日期=${date}`);
            });
        } else {
            console.log('\n✅ 没有发现重复存储问题');
        }
        
        // 清理测试数据
        console.log('\n清理测试数据...');
        await cleanupTestData(testUserUuid);
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

async function syncCashTransactions(changes, userUuid) {
    // 复制后端同步逻辑
    const filter = {
        property: 'UserUUID',
        rich_text: { equals: userUuid || '' }
    };
    
    // 获取现有交易
    const existingTransactionsResults = await notion.databases.query({
        database_id: NOTION_TRANSACTIONS_DB_ID,
        filter: filter
    });
    
    // 创建现有交易的映射表
    const existingTransactionsMap = new Map();
    existingTransactionsResults.results.forEach(page => {
        const transactionId = page.properties['Transaction ID']?.title?.[0]?.text?.content;
        if (transactionId) {
            existingTransactionsMap.set(transactionId, page);
        }
    });
    
    console.log('现有交易数量:', existingTransactionsResults.results.length);
    
    const updatePromises = [];
    
    // 同步现金交易
    for (const [year, transactions] of Object.entries(changes.cashTransactions || {})) {
        for (const tx of transactions) {
            const transactionId = `${year}-cash-${tx.date}-${tx.type}-${tx.amount}-${userUuid || ''}`;
            const existingTransaction = existingTransactionsMap.get(transactionId);
            
            console.log('处理交易ID:', transactionId);
            console.log('是否已存在:', !!existingTransaction);
            
            const pageData = {
                parent: { database_id: NOTION_TRANSACTIONS_DB_ID },
                properties: {
                    'Transaction ID': { title: [{ text: { content: transactionId } }] },
                    Date: { date: { start: tx.date } },
                    Type: { select: { name: tx.type } },
                    Amount: { number: tx.amount },
                    Stock: { rich_text: tx.stockName ? [{ text: { content: tx.stockName } }] : [] },
                    Year: { select: { name: year } },
                    'Transaction Category': { select: { name: 'Cash' } },
                    'UserUUID': { rich_text: [{ text: { content: userUuid || '' } }] },
                },
            };
            
            if (existingTransaction) {
                console.log('更新现有交易');
                updatePromises.push(
                    notion.pages.update({
                        page_id: existingTransaction.id,
                        properties: pageData.properties,
                    })
                );
            } else {
                console.log('创建新交易');
                updatePromises.push(notion.pages.create(pageData));
            }
        }
    }
    
    await Promise.all(updatePromises);
    console.log('同步完成，处理了', updatePromises.length, '个操作');
}

async function queryTransactions(userUuid) {
    const filter = {
        property: 'UserUUID',
        rich_text: { equals: userUuid }
    };
    
    const result = await notion.databases.query({
        database_id: NOTION_TRANSACTIONS_DB_ID,
        filter: filter
    });
    
    return result.results;
}

async function cleanupTestData(userUuid) {
    const transactions = await queryTransactions(userUuid);
    
    for (const transaction of transactions) {
        await notion.pages.update({
            page_id: transaction.id,
            archived: true
        });
    }
    
    console.log('已清理', transactions.length, '条测试记录');
}

// 运行测试
testCashTransactionDuplicate().catch(console.error);
