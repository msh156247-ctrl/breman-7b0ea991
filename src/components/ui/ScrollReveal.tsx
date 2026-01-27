import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'blur';
  delay?: number;
  duration?: number;
  threshold?: number;
}

const animationStyles: Record<string, { hidden: string; visible: string }> = {
  'fade-up': {
    hidden: 'opacity-0 translate-y-8',
    visible: 'opacity-100 translate-y-0',
  },
  'fade-down': {
    hidden: 'opacity-0 -translate-y-8',
    visible: 'opacity-100 translate-y-0',
  },
  'fade-left': {
    hidden: 'opacity-0 translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
  'fade-right': {
    hidden: 'opacity-0 -translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
  scale: {
    hidden: 'opacity-0 scale-95',
    visible: 'opacity-100 scale-100',
  },
  blur: {
    hidden: 'opacity-0 blur-sm',
    visible: 'opacity-100 blur-0',
  },
};

export const ScrollReveal = forwardRef<HTMLDivElement, ScrollRevealProps>(
  function ScrollReveal(
    {
      children,
      className,
      animation = 'fade-up',
      delay = 0,
      duration = 600,
      threshold = 0.1,
    },
    _ref
  ) {
    const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold });

    const { hidden, visible } = animationStyles[animation];

    return (
      <div
        ref={ref}
        className={cn(
          'transition-all ease-out',
          isVisible ? visible : hidden,
          className
        )}
        style={{
          transitionDuration: `${duration}ms`,
          transitionDelay: `${delay}ms`,
        }}
      >
        {children}
      </div>
    );
  }
);