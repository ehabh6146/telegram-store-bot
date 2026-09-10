import React, { useState } from 'react';
import { BRAND_ICONS, BrandIcon } from '../iconLibrary';
import { Search, X, Check, Sparkles, Image as ImageIcon } from 'lucide-react';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconId: string, emoji: string, imageUrl?: string) => void;
  selectedIconId?: string;
  title?: string;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  selectedIconId = '',
  title = 'مستودع الأيقونات والشعارات الرسمية 🎨'
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customEmoji, setCustomEmoji] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'الكل (All)' },
    { id: 'ai', label: '🤖 ذكاء اصطناعي' },
    { id: 'streaming', label: '🎬 بث وترفيه' },
    { id: 'gaming', label: '🎮 ألعاب وشحن' },
    { id: 'design', label: '🎨 تصميم ومونتاج' },
    { id: 'productivity', label: '💼 إنتاجية وأوفيس' },
    { id: 'social', label: '⭐️ تواصل وسوشيال' },
    { id: 'payment', label: '💳 طرق دفع وبنوك' },
  ];

  const filteredIcons = BRAND_ICONS.filter(icon => {
    const matchesCat = activeCategory === 'all' || icon.category === activeCategory;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || 
      icon.name.toLowerCase().includes(q) || 
      icon.name_ar.includes(q) || 
      icon.tags.some(t => t.includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{title}</h3>
              <p className="text-xs text-slate-400">اختر الأيقونة الرسمية المناسبة لقسمك أو خدمتك من المستودع</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="ابحث عن أيقونة (شات GPT، نتفلكس، كانفا، ببجي، أدوبي...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[45vh]">
          {filteredIcons.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              لم يتم العثور على أيقونة مطابقة لبحثك.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredIcons.map(item => {
                const isSelected = selectedIconId === item.id || selectedIconId === item.emoji;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectIcon(item.id, item.emoji, item.imageUrl);
                      onClose();
                    }}
                    className={`relative p-3 rounded-2xl border text-right flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                        : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border overflow-hidden"
                      style={{
                        backgroundColor: item.bgColor,
                        borderColor: `${item.color}40`,
                        color: item.color
                      }}
                    >
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-contain p-1.5"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div 
                          className="w-5 h-5 flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: item.svg }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.name_ar}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.name}</div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 left-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Icon/URL Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="text"
              placeholder="إيموجي مخصص (مثال: 🔥)"
              value={customEmoji}
              onChange={e => setCustomEmoji(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 w-32 focus:border-indigo-500 focus:outline-none"
            />
            {customEmoji && (
              <button
                type="button"
                onClick={() => {
                  onSelectIcon(customEmoji, customEmoji);
                  onClose();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                تطبيق الإيموجي
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
