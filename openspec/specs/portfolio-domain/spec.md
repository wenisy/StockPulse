# portfolio-domain Specification

## Purpose
TBD - created by archiving change add-portfolio-test-foundation. Update Purpose after archive.
## Requirements
### Requirement: 加权成本价（买入）

当用户买入已持仓的股票时，系统 SHALL 按"总成本除以总股数"的方式重新计算成本价：
`newCostPrice = (oldShares × oldCostPrice + txShares × txPrice) / (oldShares + txShares)`

#### Scenario: 首次买入

- **WHEN** 用户对未持仓股票买入 100 股 @ 40
- **THEN** 新成本价为 40，新股数为 100

#### Scenario: 加仓买入

- **WHEN** 已持有 100 股成本价 40 的股票，再买入 50 股 @ 50
- **THEN** 新股数为 150，新成本价为 (100×40 + 50×50) / 150 = 43.33

#### Scenario: 零股加仓（边界）

- **WHEN** 已持有 0 股，买入 100 股 @ 40
- **THEN** 新成本价为 40（不应除零或返回 NaN）

---

### Requirement: 卖出后剩余成本与实现盈亏

当用户卖出已持仓的股票时，系统 SHALL：

- 卖出后剩余股数 = `oldShares - txShares`
- 卖出后剩余总成本 = `oldShares × oldCostPrice - txShares × txPrice`
- 卖出后剩余成本价 = 剩余总成本 / 剩余股数（剩余股数为 0 时成本价为 0）
- 实现盈亏 = `(txPrice - oldCostPrice) × txShares`

#### Scenario: 部分卖出

- **WHEN** 已持有 100 股成本价 40，卖出 30 股 @ 50
- **THEN** 剩余股数为 70，实现盈亏为 (50-40)×30 = 300

#### Scenario: 全部卖出

- **WHEN** 已持有 100 股成本价 40，卖出 100 股 @ 50
- **THEN** 剩余股数为 0，剩余成本价为 0，实现盈亏为 1000

#### Scenario: 卖出股数超过持仓（拒绝）

- **WHEN** 已持有 50 股，用户尝试卖出 100 股
- **THEN** 系统 MUST 拒绝该笔交易并通过 alert 提示"卖出股数超过持有股数"，不修改任何状态

---

### Requirement: 现金不足提示（买入）

当用户买入股票所需现金超过当前年度现金余额时，系统 MUST 弹出确认对话框告知"现金余额将变为负数"，由用户显式确认后才执行交易。

#### Scenario: 现金不足且用户确认

- **WHEN** 当年现金余额为 1000，用户买入需 5000 现金的股票，并在弹窗中点击"确认"
- **THEN** 交易完成，当年现金余额变为 -4000

#### Scenario: 现金不足且用户取消

- **WHEN** 当年现金余额为 1000，用户买入需 5000 现金的股票，并在弹窗中点击"取消"
- **THEN** 不修改任何状态，alert 关闭

---

### Requirement: 现金交易余额累加

当用户在某年度添加现金交易时，该年度 `cashBalance` SHALL 按下列规则累加：

- `deposit`：金额为正，余额 += 金额
- `withdraw`：金额为负，余额 += 金额（即减少）
- `buy`：余额 -= `txShares × txPrice`
- `sell`：余额 += `txShares × txPrice`

#### Scenario: 多笔混合现金交易

- **WHEN** 当年依次执行 deposit 10000、deposit 5000、withdraw 3000
- **THEN** 当年现金余额为 12000

#### Scenario: 在不存在的年度添加现金交易

- **WHEN** 用户对未初始化的年度添加 deposit 1000
- **THEN** 系统 SHALL 自动初始化该年度（stocks/cashTransactions/stockTransactions 为空数组，cashBalance 从 0 开始累加）

---

### Requirement: 现金交易去重（前端会话内）

在前端 `incrementalChanges.cashTransactions[year]` 中，系统 SHALL 按 `(amount, type, date)` 三元组识别重复交易并跳过添加。

#### Scenario: 同一会话内重复点击

- **WHEN** 同一会话内对同一年度添加两次 (amount=1000, type=deposit, date=2024-01-15) 的交易
- **THEN** 第二次添加会被跳过，`incrementalChanges.cashTransactions[year]` 长度仍为 1

#### Scenario: 不同日期相同金额（不视为重复）

- **WHEN** 添加 (1000, deposit, 2024-01-15) 后再添加 (1000, deposit, 2024-01-16)
- **THEN** 两条都被记录

---

### Requirement: 货币换算

系统 SHALL 提供从美元基准向目标货币的换算函数，公式为 `convertedAmount = amount / rate`，其中 `rate` 来自 `exchangeRates[targetCurrency]`，缺省 1。

#### Scenario: 换算到港币

- **WHEN** amount=100，rates={ USD:1, HKD:0.12864384 }，target=HKD
- **THEN** 换算结果 ≈ 777.34

#### Scenario: 换算到未知货币（兜底）

- **WHEN** target 在 rates 中不存在
- **THEN** rate 取 1，换算结果等于原值

---

### Requirement: 大数本地化格式化

系统 SHALL 将数值先按目标货币换算，再用 `Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })` 格式化。

#### Scenario: 万元级数字格式化

- **WHEN** 输入 1234567.891，target=USD（rate=1）
- **THEN** 输出字符串符合 zh-CN 千分位格式，最多 2 位小数（如 "1,234,567.89"）

---

### Requirement: 投资组合总价值

某年度的投资组合总价值 SHALL 等于 `Σ(stock.shares × stock.price) + cashBalance`。

#### Scenario: 含股票与现金

- **WHEN** stocks=[ {shares:100,price:50}, {shares:200,price:25} ]，cashBalance=5000
- **THEN** 总价值 = 5000 + 5000 + 5000 = 15000

#### Scenario: 仅有现金无股票

- **WHEN** stocks=[]，cashBalance=10000
- **THEN** 总价值 = 10000

---

### Requirement: 投资回报率

某年度的回报率 SHALL 等于 `(组合价值 - 累计投入成本) / 累计投入成本 × 100%`，其中"累计投入成本"为该年度 deposit 类现金交易之和。

#### Scenario: 25% 正向回报

- **WHEN** 累计投入 4000，当前组合价值 5000
- **THEN** 回报率 = 25%

#### Scenario: 累计投入为 0（边界）

- **WHEN** 累计投入为 0
- **THEN** 回报率函数 SHALL 返回 0 而非 Infinity 或 NaN

---

### Requirement: 持仓占比

每只股票/现金在组合中的占比 SHALL 等于 `自身价值 / 组合总价值`。

#### Scenario: 多股票 + 现金各占一份

- **WHEN** Stock A 价值 5000，Stock B 价值 5000，cash 10000
- **THEN** A 占比 25%，B 占比 25%，现金占比 50%

#### Scenario: 总价值为 0（边界）

- **WHEN** 组合总价值为 0
- **THEN** 各项占比均为 0（不返回 Infinity/NaN）

---

### Requirement: 年度增长率

跨年增长率 SHALL 等于 `(thisYearValue - lastYearValue) / lastYearValue × 100%`。

#### Scenario: 25% 年度增长

- **WHEN** 上年组合价值 4000，本年组合价值 5000
- **THEN** 年度增长率 = 25%

#### Scenario: 上年价值为 0（边界）

- **WHEN** 上年组合价值为 0
- **THEN** 年度增长率函数 SHALL 返回 0

---

### Requirement: 新建年份的结转

当用户添加一个新年份时，系统 SHALL：

- 找到所有"小于新年份"中最大的年份作为参考年
- 复制参考年的 `stocks` 数组（深拷贝单个 stock 对象）
- 把参考年的 `cashBalance` 作为新年的初始 `cashBalance`
- 若初始 `cashBalance > 0`，自动添加一笔 type=deposit、description='上年结余' 的现金交易
- 新年份的 `cashTransactions` 与 `stockTransactions` 起始为空数组（除上述结余条目）
- 不修改参考年的任何数据

#### Scenario: 从 2024 结转到 2025

- **WHEN** years=[2024]，2024 持有 [{name:'A',shares:10,price:50,costPrice:40,id:'x'}]、cashBalance=1000，添加 2025
- **THEN** 2025 持有同样的股票（不同对象引用）、cashBalance=1000，且包含一笔 amount=1000/type=deposit/description='上年结余' 的现金交易

#### Scenario: 重复添加已存在年份（拒绝）

- **WHEN** years=[2024]，再次添加 2024
- **THEN** 不修改任何状态

#### Scenario: 跳跃添加（在前面插入）

- **WHEN** years=[2025]，添加 2023
- **THEN** 2023 没有可参考年（无更早年份），stocks=[]、cashBalance=0、不产生结余条目

---

### Requirement: 跨年股票删除

当用户删除某只股票时，系统 SHALL 在所有年份的 `stocks` 数组中移除该股票，并在 `incrementalChanges.stocks` 中同步移除（`cashTransactions` / `stockTransactions` 不删除历史流水）。

#### Scenario: 删除存在于多年的股票

- **WHEN** Stock A 存在于 2023、2024 两年，用户删除 Stock A
- **THEN** 两年的 stocks 数组均不再包含 Stock A，但两年的历史交易流水保持不变

---

### Requirement: 行编辑合并保存

当用户在表格内行编辑一只股票的多年数据并保存时，系统 SHALL：

- 对每个年份，将编辑后的 `quantity` / `unitPrice` / `costPrice` 字符串解析为数字
- 解析全部成功且 stock 已存在 → 更新该年的 stock；不存在 → 新增到该年
- 任一字段解析失败 → 该年若已存在该股票则将其从该年 stocks 移除（视为清仓）
- 同时把变更追加到 `incrementalChanges.stocks[year]` 与 `yearlySummaries[year].cashBalance`

#### Scenario: 在两年同时更新股价

- **WHEN** 编辑 Stock A，2023 行填 (100, 50, 40)，2024 行填 (100, 60, 45)
- **THEN** 2023 与 2024 的 Stock A 同时更新

#### Scenario: 把某年的股价清空

- **WHEN** 编辑 Stock A，2023 行的 quantity 留空（NaN）
- **THEN** 2023 的 stocks 数组中移除 Stock A

---

### Requirement: 增量变更拼装

每次股票交易 SHALL 同时向 `incrementalChanges` 的四张表追加一条记录：`stocks[year]`、`stockTransactions[year]`、`cashTransactions[year]`、`yearlySummaries[year].cashBalance`。

#### Scenario: 一笔买入交易的增量

- **WHEN** 在 2024 年买入 50 股 NVDA @ 100，原现金余额 10000
- **THEN** `incrementalChanges.stocks['2024']` 末尾追加新 NVDA 股票对象、`stockTransactions['2024']` 末尾追加 type=buy 的流水、`cashTransactions['2024']` 末尾追加 amount=-5000 type=buy 的现金流水、`yearlySummaries['2024'].cashBalance` = 5000

---

### Requirement: 价格刷新接口契约（前端调后端）

前端刷新最新价格时 SHALL `POST {BACKEND_DOMAIN}/api/updatePrices`，请求体为 `{ symbols: string[] }`。响应成功格式为 `{ success: true, data: { [symbol]: { price: number, ... } } }`。前端 SHALL 仅根据响应中的 `data[symbol].price` 更新当前年度（`new Date().getFullYear().toString()`）`stocks` 中匹配 symbol 的股票价格。

#### Scenario: 刷新成功更新当年价格

- **WHEN** 后端返回 `{ success:true, data:{ AAPL:{ price:200 } } }`，当年持有 AAPL 100 股原价 150
- **THEN** 当年 AAPL.price 更新为 200，其他年份不变

#### Scenario: 当年无股票（短路）

- **WHEN** 当年 stocks 为空
- **THEN** 前端 SHALL 不发起请求，且仅在用户手动触发时弹出"无股票数据"提示

#### Scenario: 后端返回失败

- **WHEN** 后端返回 `{ success:false, message:'...' }`
- **THEN** 前端不修改任何 stocks 数据，按 isManual 决定弹出"更新失败"或"自动刷新失败"提示

---

### Requirement: localStorage 持久化键名约定

前端 SHALL 使用以下固定键名持久化用户数据，键名变更视为破坏性变更：

- `stockPortfolioData`：JSON 序列化的 `{ [year]: YearData }`
- `stockPortfolioYears`：JSON 序列化的 `string[]`
- `stockPortfolioSelectedYear`：当前选中年份字符串
- `token`：登录令牌
- `user`：JSON 序列化的 `User`

#### Scenario: 登录令牌过期清理

- **WHEN** 后端返回 401，前端调用 `handleTokenExpired`
- **THEN** localStorage 中的 `token` 与 `user` 被移除，`stockPortfolioData` 不被清除

---

### Requirement: 前后端职责分工（日内收益归后端）

"日内收益"（基于 previousClose 与 currentPrice 的当日盈亏计算）SHALL 由后端 `stock-backend/api/generateSnapshot.js` 独占实现。前端 `useCalendarData` 仅通过 `POST {BACKEND_DOMAIN}/api/generateSnapshot` 触发后端计算并消费返回的快照数据，前端代码库 MUST NOT 自行实现日内收益、`previousClose × shares` 或类似的当日价差逻辑。

#### Scenario: 前端代码库引入了日内收益计算（违规）

- **WHEN** 前端 `src/` 下任何文件出现 `previousClose` 或 `dailyGain` 的本地计算实现
- **THEN** 视为违反本契约，code review 阶段 SHALL 拒绝合入

#### Scenario: 前端通过 API 消费后端快照（合规）

- **WHEN** `useCalendarData` 调用 `POST /api/generateSnapshot` 并直接渲染响应
- **THEN** 视为符合契约

---

### Requirement: 前后端去重契约（合理分层）

现金交易去重在前后端使用不同粒度，且两者均合理。前端 SHALL 在会话内按 `(amount, type, date)` 三元组识别重复并跳过添加；后端 SHALL 按 `Transaction ID = ${year}-cash-${date}-${type}-${amount}-${userUuid}` 五元组识别重复并执行 update-or-create。两侧规则各自适用于其作用域，MUST NOT 被强行"统一"为同一粒度。

#### Scenario: 同一用户同会话同年同日重复（前端拦截）

- **WHEN** 同一会话内对同一年度提交 (1000, deposit, 2024-01-15) 两次
- **THEN** 前端拦截第二次，后端只收到一份

#### Scenario: 跨用户/跨会话提交同样数据（后端拦截）

- **WHEN** 不同用户或不同会话分别提交 (1000, deposit, 2024-01-15)
- **THEN** 前端不视为重复（userUuid 不同），后端按五元组识别后视为不同记录正常存储

### Requirement: shares=0 持仓不得出现在任何用户可见的展示层

系统在渲染以下任何 UI 时，SHALL 过滤掉当年 `shares = 0` 的股票条目，使其不出现在用户可见的内容中：

1. **持仓列表**（HoldingsSection）：仅展示历史上至少有过一年 shares > 0 的股票
2. **折线图/柱状图**（StockCharts / lineChartData）：latestYear 股票集合仅收录 shares > 0
3. **年报弹窗 ReportDialog**：
   - 饼图数据 preparePieChartData：过滤 shares = 0
   - 柱图数据 prepareBarChartData：过滤 shares = 0
   - 持仓排名 prepareTopPerformers：过滤 shares = 0
4. **GrowthInfo**：持仓价值计算 reduce 过滤 shares = 0（不影响数值，但语义明确）

#### Scenario: 2026 年 Amazon shares=0

- **GIVEN** yearData["2026"].stocks 包含 `{ name: "Amazon", shares: 0, price: 200 }`
- **WHEN** 用户打开 2026 年投资报告弹窗
- **THEN** 报告中的饼图、柱图、持仓排名均不含 Amazon
- **AND** Amazon 在持仓列表的"历史持仓"区域可见（因其在历史年份有过 shares > 0）

#### Scenario: 新增股票但从未有持仓

- **GIVEN** yearData["2026"].stocks 包含 `{ name: "TestStock", shares: 0 }`
- **AND** 该股票在所有年份 shares 均为 0
- **WHEN** 用户查看持仓列表
- **THEN** TestStock 不在持仓列表的任何区域显示

