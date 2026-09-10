import React, { useState, useRef, useEffect } from 'react';

interface MarqueeTitleProps {
  text: string;
  icon?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export const MarqueeTitle: React.FC<MarqueeTitleProps> = ({
  text,
  icon,
  className = '',
  badge
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 2);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 200);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex items-center gap-1.5 overflow-hidden max-w-full ${className}`}
      title={text}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {badge && <span className="flex-shrink-0">{badge}</span>}
      
      <div className="overflow-hidden relative flex-1 min-w-0">
        <div 
          className={`inline-flex items-center whitespace-nowrap ${
            isOverflowing ? 'animate-marquee-smooth hover:pause-marquee' : ''
          }`}
        >
          <span ref={textRef} className="font-semibold text-slate-100">
            {text}
          </span>
          {isOverflowing && (
            <span className="font-semibold text-slate-100 px-6 inline-block opacity-90">
              • {text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
