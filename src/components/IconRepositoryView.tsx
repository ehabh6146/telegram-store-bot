import React, { useState } from 'react';
import { BRAND_ICONS, BrandIcon } from '../iconLibrary';
import { Search, Copy, Check, Sparkles, Plus, Grid, Layers, ExternalLink, Tag } from 'lucide-react';

interface IconRepositoryViewProps {
  categories: Array<{ id: number; name: string; icon?: string; image_url?: string }>;
  products: Array<{ id: number; name: string; icon?: string; image_url?: string }>;
  onAssignToCategory: (categoryId: number, iconId: string, emoji: string, imageUrl?: string) => void;
  onAssignToProduct: (productId: number, iconId: string, emoji: string, imageUrl?: string) => void;
}

export const IconRepositoryView: React.FC<IconRepositoryViewProps> = ({
  categories,
  products,
  onAssignToCategory,
  onAssignToProduct
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assignModalIcon, setAssignModalIcon] = useState<BrandIcon | null>(null);
  const [assignTargetType, setAssignTargetType] = useState<'category' | 'product'>('category');
  const [assignTargetId, setAssignTargetId] = useState<string>('');

  const catTabs = [
    { id: 'all', label: '🌟 جميع الشعارات والأيقونات' },
    { id: 'ai', label: '🤖 الذكاء الاصطناعي (AI)' },
    { id: 'streaming', label: '🎬 البث والترفيه' },
    { id: 'gaming', label: '🎮 الألعاب والشحن' },
    { id: 'design', label: '🎨 التصميم والمونتاج' },
    { id: 'productivity', label: '💼 الإنتاجية وأوفيس' },
    { id: 'social', label: '⭐️ التواصل والاشتراكات' },
    { id: 'payment', label: '💳 البنوك وطرق الدفع' },
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyAssignment = () => {
    if (!assignModalIcon || !assignTargetId) return;
    const targetNum = parseInt(assignTargetId);
    if (assignTargetType === 'category') {
      onAssignToCategory(targetNum, assignModalIcon.id, assignModalIcon.emoji, assignModalIcon.imageUrl);
    } else {
      onAssignToProduct(targetNum, assignModalIcon.id, assignModalIcon.emoji, assignModalIcon.imageUrl);
    }
    setAssignModalIcon(null);
    setAssignTargetId('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 p-6 md:p-8 rounded-3xl border border-indigo-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              مستودع الأيقونات والشعارات الرقمية
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              مكتبة الشعارات والأيقونات الأصلية 🎨
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl">
              تصفح الأيقونات والشعارات المتجهة الأصلية لكافة خدمات الذكاء الاصطناعي، الألعاب، برامج المونتاج، ومنصات البث. يمكنك ربط أي شعار بأقسام ومنتجات متجرك بنقرة واحدة!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-center">
              <div className="text-xs text-slate-400 font-medium">إجمالي الأيقونات</div>
              <div className="text-lg font-black text-indigo-400">{BRAND_ICONS.length} شعار أصلي</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="ابحث في مستودع الأيقونات (مثال: ChatGPT, Netflix, Canva, PUBG, Adobe, Notion...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {catTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap font-bold transition-all ${
                activeCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredIcons.map(icon => {
          return (
            <div 
              key={icon.id}
              className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800/80 hover:border-slate-700 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  {/* Brand Logo Display */}
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105 overflow-hidden"
                    style={{
                      backgroundColor: icon.bgColor,
                      borderColor: `${icon.color}40`,
                      color: icon.color
                    }}
                  >
                    {icon.imageUrl ? (
                      <img 
                        src={icon.imageUrl} 
                        alt={icon.name} 
                        className="w-full h-full object-contain p-2"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div 
                        className="w-6 h-6 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: icon.svg }}
                      />
                    )}
                  </div>

                  <span className="text-xl px-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800/60">
                    {icon.emoji}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{icon.name_ar}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{icon.name}</p>

                {/* Color and Tags */}
                <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: icon.color }}></span>
                  <span className="font-mono">{icon.color}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 truncate">{icon.category}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalIcon(icon)}
                  className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ربط بقسم / خدمة
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(icon.emoji, `${icon.id}-emoji`)}
                  title="نسخ الإيموجي"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                >
                  {copiedId === `${icon.id}-emoji` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Modal */}
      {assignModalIcon && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                ربط الأيقونة بمتجرك
              </h3>
              <button 
                onClick={() => setAssignModalIcon(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Selected Icon Card Preview */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center border overflow-hidden"
                style={{
                  backgroundColor: assignModalIcon.bgColor,
                  borderColor: `${assignModalIcon.color}40`,
                  color: assignModalIcon.color
                }}
              >
                {assignModalIcon.imageUrl ? (
                  <img 
                    src={assignModalIcon.imageUrl} 
                    alt={assignModalIcon.name} 
                    className="w-full h-full object-contain p-1.5"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div 
                    className="w-5 h-5 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: assignModalIcon.svg }}
                  />
                )}
              </div>
              <div>
                <div className="font-bold text-white text-xs">{assignModalIcon.name_ar} {assignModalIcon.emoji}</div>
                <div className="text-[10px] text-slate-400">{assignModalIcon.name}</div>
              </div>
            </div>

            {/* Target Type Selector */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">اختر نوع العنصر المراد ربطه:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAssignTargetType('category'); setAssignTargetId(''); }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      assignTargetType === 'category'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    📂 قسم منتجات ({categories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssignTargetType('product'); setAssignTargetId(''); }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      assignTargetType === 'product'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🛍️ منتج / خدمة ({products.length})
                  </button>
                </div>
              </div>

              {/* Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {assignTargetType === 'category' ? 'اختر القسم:' : 'اختر المنتج أو الخدمة:'}
                </label>
                <select
                  value={assignTargetId}
                  onChange={e => setAssignTargetId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- اختر من القائمة --</option>
                  {assignTargetType === 'category' ? (
                    categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={handleApplyAssignment}
                  disabled={!assignTargetId}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  حفظ وتطبيق الأيقونة 🚀
                </button>
                <button
                  type="button"
                  onClick={() => setAssignModalIcon(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
