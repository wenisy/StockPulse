import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface LoginDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  onSubmit: () => void;
  onSwitchToRegister: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  isOpen,
  onOpenChange,
  username,
  setUsername,
  password,
  setPassword,
  error,
  onSubmit,
  onSwitchToRegister,
}) => {
  // 登录弹窗聚焦控制：仅在首次打开登录弹窗时自动聚焦用户名
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoFocusedLoginOnceRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasAutoFocusedLoginOnceRef.current) {
      usernameInputRef.current?.focus();
      hasAutoFocusedLoginOnceRef.current = true;
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>登录</DialogTitle>
          <DialogDescription>请输入用户名和密码</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            ref={usernameInputRef}
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (username) {
                  passwordInputRef.current?.focus();
                }
              }
            }}
          />
          <Input
            ref={passwordInputRef}
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && username && password) {
                onSubmit();
              }
            }}
          />
          {error && <p className="text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>登录</Button>
          <Button variant="outline" onClick={onSwitchToRegister}>
            注册新账号
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
