import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AlertInfo } from '@/types/stock';

interface Props {
  alertInfo: AlertInfo | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * 通用 alert 弹窗。承载 setAlertInfo 传入的标题/描述/确认取消回调。
 */
export const AlertDialog: React.FC<Props> = ({ alertInfo, onOpenChange }) => {
  return (
    <Dialog open={alertInfo?.isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alertInfo?.title}</DialogTitle>
          <DialogDescription>
            <pre className="whitespace-pre-wrap">{alertInfo?.description}</pre>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          {alertInfo?.onConfirm && (
            <Button onClick={alertInfo.onConfirm}>{alertInfo.confirmText || '确定'}</Button>
          )}
          {alertInfo?.onCancel && (
            <Button onClick={alertInfo.onCancel}>{alertInfo.cancelText || '取消'}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
