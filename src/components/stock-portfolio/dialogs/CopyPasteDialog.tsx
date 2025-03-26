"use client";
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CopyPasteDialogProps {
  isCopyDialogOpen: boolean;
  isPasteDialogOpen: boolean;
  onCloseCopy: () => void;
  onClosePaste: () => void;
  yearData: any;
  pasteData: string;
  setPasteData: (value: string) => void;
  onConfirmPaste: () => void;
}

// 复制粘贴对话框组件
const CopyPasteDialog = ({
  isCopyDialogOpen,
  isPasteDialogOpen,
  onCloseCopy,
  onClosePaste,
  yearData,
  pasteData,
  setPasteData,
  onConfirmPaste
}: CopyPasteDialogProps) => {
  return (
    <>
      {/* 复制数据对话框 */}
      <Dialog open={isCopyDialogOpen} onOpenChange={onCloseCopy}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>复制数据</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="mb-2">复制以下数据以备份或分享：</p>
            <Textarea
              value={JSON.stringify(yearData, null, 2)}
              className="h-96 font-mono text-sm"
              readOnly
            />
          </div>
          <Button onClick={onCloseCopy} className="mt-4">关闭</Button>
        </DialogContent>
      </Dialog>

      {/* 粘贴数据对话框 */}
      <Dialog open={isPasteDialogOpen} onOpenChange={onClosePaste}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>粘贴数据</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="mb-2">粘贴之前复制的数据以恢复：</p>
            <Textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              className="h-96 font-mono text-sm"
              placeholder="粘贴 JSON 数据..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClosePaste}>取消</Button>
            <Button onClick={onConfirmPaste}>确认</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CopyPasteDialog;
