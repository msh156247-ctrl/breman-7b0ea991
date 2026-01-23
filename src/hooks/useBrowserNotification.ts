import { useEffect, useCallback, useRef } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback(({ title, body, icon, tag, onClick }: NotificationOptions) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission !== 'granted') {
      requestPermission();
      return;
    }

    // Don't show notification if the window is focused
    if (document.hasFocus()) return;

    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      tag,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }, [requestPermission]);

  const isSupported = 'Notification' in window;
  const permission = permissionRef.current;

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
}
