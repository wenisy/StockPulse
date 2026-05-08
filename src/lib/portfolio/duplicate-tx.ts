import type { CashTransaction } from '@/types/stock';

/**
 * 现金交易去重判定（前端会话内规则）。
 *
 * 抽自 usePortfolioData.ts:534-539。前端按 (amount, type, date) 三元组识别
 * 重复，仅作用于"同一会话同一年同一用户"的范围。
 *
 * 注意：后端 stock-backend 用 5 元组（含 year + userUuid）去重，是合理的
 * 分层差异，前端 MUST NOT 强行对齐为 5 元组（详见 spec）。
 *
 * 对应 spec：portfolio-domain
 * - 现金交易去重（前端会话内）
 * - 前后端去重契约（合理分层）
 *
 * @param existing 已记录的现金交易列表
 * @param candidate 待添加的现金交易
 */
export function isDuplicateCashTx(
  existing: CashTransaction[],
  candidate: CashTransaction,
): boolean {
  return existing.some(
    (tx) =>
      tx.amount === candidate.amount &&
      tx.type === candidate.type &&
      tx.date === candidate.date,
  );
}
