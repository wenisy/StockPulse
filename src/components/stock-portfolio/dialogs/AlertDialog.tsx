"use client";
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertInfo } from '../types';

interface AlertDialogProps {
  alertInfo: AlertInfo | null;
}

// 警告对话框组件
const AlertDialog = ({ alertInfo }: AlertDialogProps) => {
  if (!alertInfo || !alertInfo.isOpen) return null;

  return (
    <Dialog open={alertInfo.isOpen} onOpenChange={() => alertInfo.onCancel?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alertInfo.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {alertInfo.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          {alertInfo.onCancel && (
            <Button variant="outline" onClick={alertInfo.onCancel}>
              {alertInfo.cancelText || '取消'}
            </Button>
          )}
          {alertInfo.onConfirm && (
            <Button onClick={alertInfo.onConfirm}>
              {alertInfo.confirmText || '确认'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlertDialog;
