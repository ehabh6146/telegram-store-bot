import React from 'react';
import { BRAND_ICONS, findBrandIcon } from '../iconLibrary';

interface BrandIconDisplayProps {
  name?: string;
  icon?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandIconDisplay: React.FC<BrandIconDisplayProps> = ({
  name = '',
  icon = '',
  imageUrl = '',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-9 h-9 text-lg',
    lg: 'w-12 h-12 text-2xl',
    xl: 'w-16 h-16 text-3xl'
  };

  const svgSizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  if (imageUrl) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/50 flex-shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Check if icon is an ID in BRAND_ICONS or matches by name/tag
  const brand = (icon && BRAND_ICONS.find(b => b.id === icon || b.emoji === icon)) || findBrandIcon(name);

  if (brand) {
    return (
      <div 
        className={`relative flex items-center justify-center rounded-2xl border transition-all flex-shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`}
        style={{
          backgroundColor: brand.bgColor,
          borderColor: `${brand.color}40`,
          color: brand.color
        }}
        title={`${brand.name} (${brand.name_ar})`}
      >
        {brand.imageUrl ? (
          <img 
            src={brand.imageUrl} 
            alt={brand.name} 
            className="w-full h-full object-contain p-1.5"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : brand.svg ? (
          <div 
            className={`flex items-center justify-center ${svgSizeClasses[size]}`}
            dangerouslySetInnerHTML={{ __html: brand.svg }}
          />
        ) : (
          <span>{brand.emoji}</span>
        )}
      </div>
    );
  }

  // If icon is a raw emoji/character
  if (icon && icon.length <= 4) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0 ${sizeClasses[size]} ${className}`}>
        <span>{icon}</span>
      </div>
    );
  }

  // Fallback generic badge
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 flex-shrink-0 ${sizeClasses[size]} ${className}`}>
      <span>💎</span>
    </div>
  );
};
