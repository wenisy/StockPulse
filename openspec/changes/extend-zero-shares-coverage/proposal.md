## Why

之前的 `fix-zero-shares-filter` 只修了 5 个点，但**地毯式扫描**发现还有 3 处展示用的 shares=0 过滤遗漏：barChartData、useCalculations.prepareLineChartData、StockTable 的 tfoot 合计。

更严重的问题：**完全没有单测覆盖 shares=0 场景**，导致这类 bug 一直在重新冒出来。这次必须把过滤补全 + 加入"防回归"测试集，作为 portfolio-domain 规格的一等公民。

## What Changes

**修复展示层缺漏：**
- `src/hooks/useChartData.ts`：barChartData 收集 latestStocks 时（line 108-110）加 `&& stock.shares > 0`
- `src/hooks/useCalculations.ts`：prepareLineChartData 的 stockNames 收集（line 37-42）加 `&& stock.shares > 0`
- `src/components/StockTable.tsx`：tfoot 年度合计 reduce（line 244）加 `&& stock.shares > 0`

**新增防回归测试集：**
- `src/hooks/__tests__/useChartData.test.ts`：lineChartData / barChartData 在 stocks 含 shares=0 时不应纳入图表
- `src/hooks/__tests__/useCalculations.test.ts`：prepareLineChartData 不应把 shares=0 加入 stockNames
- 至少 4 个新测试用例，覆盖"shares=0 不展示 / shares>0 正常展示 / 混合场景"

## Capabilities

**Modified Capabilities**:
- `portfolio-domain`：扩展"shares=0 不展示"约束的覆盖范围（barChartData / useCalculations / StockTable tfoot），并新增"测试覆盖"硬性约束

## Impact

- 3 个文件的过滤逻辑修复
- 2 个新测试文件 / ~6 个新测试用例
- 无 API 变更、无 breaking
- 测试覆盖率：hooks 层至少不下降，预期略升
