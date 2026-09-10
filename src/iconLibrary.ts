export interface BrandIcon {
  id: string;
  name: string;
  name_ar: string;
  category: 'ai' | 'streaming' | 'gaming' | 'design' | 'productivity' | 'social' | 'payment' | 'other';
  emoji: string;
  color: string;
  bgColor: string;
  imageUrl: string;
  svg: string;
  tags: string[];
}

export const BRAND_ICONS: BrandIcon[] = [
  // --- الذكاء الاصطناعي (AI) ---
  {
    id: 'chatgpt',
    name: 'ChatGPT / OpenAI',
    name_ar: 'شات جي بي تي / OpenAI',
    category: 'ai',
    emoji: '🤖',
    color: '#10A37F',
    bgColor: 'rgba(16, 163, 127, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/openai/10A37F',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.28 12.04c-.16-.92-.68-1.74-1.44-2.28.16-.62.13-1.28-.08-1.88a3.78 3.78 0 0 0-2.26-2.26c-.6-.2-1.26-.23-1.88-.08-.54-.76-1.36-1.28-2.28-1.44a3.86 3.86 0 0 0-3.68 1.48c-.62-.16-1.28-.13-1.88.08a3.78 3.78 0 0 0-2.26 2.26c-.2.6-.23 1.26-.08 1.88-.76.54-1.28 1.36-1.44 2.28a3.86 3.86 0 0 0 1.48 3.68c-.16.62-.13 1.28.08 1.88a3.78 3.78 0 0 0 2.26 2.26c.6.2 1.26.23 1.88.08.54.76 1.36 1.28 2.28 1.44a3.86 3.86 0 0 0 3.68-1.48c.62.16 1.28.13 1.88-.08a3.78 3.78 0 0 0 2.26-2.26c.2-.6.23-1.26.08-1.88.76-.54 1.28-1.36 1.44-2.28a3.86 3.86 0 0 0-1.48-3.68zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
    tags: ['chatgpt', 'openai', 'gpt', 'gpt4', 'gpt-4', 'ai', 'شات', 'ذكاء']
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    name_ar: 'جوجل جيميناي',
    category: 'ai',
    emoji: '✨',
    color: '#4285F4',
    bgColor: 'rgba(66, 133, 244, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/googlegemini/4285F4',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>',
    tags: ['gemini', 'google', 'جيمناي', 'جيميناي', 'bard', 'ai', 'جوجل']
  },
  {
    id: 'claude',
    name: 'Claude AI / Anthropic',
    name_ar: 'كلود الذكاء الاصطناعي',
    category: 'ai',
    emoji: '🧠',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/anthropic/D97706',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9a9 9 0 0 0-9-9zm0 4a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5z"/></svg>',
    tags: ['claude', 'anthropic', 'كلود', 'sonnet', 'opus', 'ai']
  },
  {
    id: 'grok',
    name: 'Grok / xAI',
    name_ar: 'جروك xAI',
    category: 'ai',
    emoji: '🔲',
    color: '#FFFFFF',
    bgColor: 'rgba(255, 255, 255, 0.12)',
    imageUrl: 'https://cdn.simpleicons.org/x/FFFFFF',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    tags: ['grok', 'xai', 'جروك', 'twitter', 'elon']
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    name_ar: 'ميدجورني لتوليد الصور',
    category: 'ai',
    emoji: '⛵',
    color: '#6366F1',
    bgColor: 'rgba(99, 102, 241, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/midjourney/6366F1',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07c-2.83-.48-5-2.94-5-5.93h2c0 2.21 1.79 4 4 4s4-1.79 4-4h2c0 2.99-2.17 5.45-5 5.93z"/></svg>',
    tags: ['midjourney', 'ميدجورني', 'صور', 'art']
  },
  {
    id: 'leonardo',
    name: 'Leonardo AI',
    name_ar: 'ليوناردو AI',
    category: 'ai',
    emoji: '🧙‍♂️',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/artstation/EC4899',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 4.5l6.5 11.5h-13L12 6.5z"/></svg>',
    tags: ['leonardo', 'ليوناردو', 'ai']
  },

  // --- التصميم والمونتاج (Design & Media) ---
  {
    id: 'canva',
    name: 'Canva Pro',
    name_ar: 'كانفا برو',
    category: 'design',
    emoji: '🎨',
    color: '#00C4CC',
    bgColor: 'rgba(0, 196, 204, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/canva/00C4CC',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0" fill="#0b1329"/></svg>',
    tags: ['canva', 'كانفا', 'تصميم', 'design', 'pro']
  },
  {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    name_ar: 'أدوبي كرييتف كلاود',
    category: 'design',
    emoji: '🌈',
    color: '#FF0000',
    bgColor: 'rgba(255, 0, 0, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/adobe/FF0000',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.96 4.908h8.868L15.93 21h-5.267zm-9.066.002H13.8L5.275 21H.016zm4.847 8.01l3.52 7.728-1.572 3.352H6.38z"/></svg>',
    tags: ['adobe', 'ادوبي', 'أدوبي', 'photoshop', 'illustrator', 'creative cloud']
  },
  {
    id: 'capcut',
    name: 'CapCut Pro',
    name_ar: 'كاب كات برو للمونتاج',
    category: 'design',
    emoji: '✂️',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/bytedance/06B6D4',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h12v3H6zm0 13h12v3H6zm3-8h6v2H9zm-5 4h16v2H4z"/></svg>',
    tags: ['capcut', 'كاب كات', 'مونتاج', 'video']
  },
  {
    id: 'envato',
    name: 'Envato Elements',
    name_ar: 'انفاتو اليمنتس',
    category: 'design',
    emoji: '🌿',
    color: '#82B440',
    bgColor: 'rgba(130, 180, 64, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/envato/82B440',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 4.5C18 3.5 14 3.5 11 6c-3.5 3-4.5 7.5-3 11.5 2.5 1.5 6 1.5 8.5-1 3-3 4-7.5 4-12z"/></svg>',
    tags: ['envato', 'elements', 'انفاتو', 'إنفاتو']
  },

  // --- البث والترفيه (Streaming & Entertainment) ---
  {
    id: 'netflix',
    name: 'Netflix 4K',
    name_ar: 'نتفلكس 4K',
    category: 'streaming',
    emoji: '🎬',
    color: '#E50914',
    bgColor: 'rgba(229, 9, 20, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/netflix/E50914',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.398 0v24h3.693l5.511-14.869V24h3.998V0h-3.693l-5.511 14.869V0z"/></svg>',
    tags: ['netflix', 'نتفلكس', 'نتفليكس', 'movies', '4k']
  },
  {
    id: 'shahid',
    name: 'Shahid VIP',
    name_ar: 'شاهد VIP',
    category: 'streaming',
    emoji: '🍿',
    color: '#00DF81',
    bgColor: 'rgba(0, 223, 129, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/showtime/00DF81',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
    tags: ['shahid', 'شاهد', 'vip', 'mbc']
  },
  {
    id: 'spotify',
    name: 'Spotify Premium',
    name_ar: 'سبوتيفاي بريميوم',
    category: 'streaming',
    emoji: '🎵',
    color: '#1DB954',
    bgColor: 'rgba(29, 185, 84, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/spotify/1DB954',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 17.3c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4.1-1 7.6-.5 10.3 1.2.3.2.4.6.2.9zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.8-7.5-2.4-11-1.3-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.1-1.2 9.1-.6 12.4 1.5.4.2.5.7.3 1.2zm.1-3.4c-3.6-2.1-9.5-2.3-12.9-1.3-.6.2-1.2-.1-1.4-.7-.2-.6.1-1.2.7-1.4 4-1.2 10.5-1 14.6 1.5.5.3.7 1 .4 1.5-.3.5-1 .7-1.4.4z"/></svg>',
    tags: ['spotify', 'سبوتيفاي', 'music', 'أغاني']
  },
  {
    id: 'youtube',
    name: 'YouTube Premium',
    name_ar: 'يوتيوب بريميوم',
    category: 'streaming',
    emoji: '📺',
    color: '#FF0000',
    bgColor: 'rgba(255, 0, 0, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/youtube/FF0000',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    tags: ['youtube', 'يوتيوب', 'premium', 'بريميوم']
  },
  {
    id: 'hbo',
    name: 'HBO / Max',
    name_ar: 'ماكس / HBO Max',
    category: 'streaming',
    emoji: '🎥',
    color: '#9900FF',
    bgColor: 'rgba(153, 0, 255, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/hbo/9900FF',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 5v14h4v-5h3v5h4V5h-4v4H6V5H2zm13 0v14h4a5 5 0 0 0 5-5V9a5 5 0 0 0-5-4h-4zm4 10h-1V9h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2z"/></svg>',
    tags: ['hbo', 'max', 'ماكس', 'movies']
  },
  {
    id: 'peacock',
    name: 'Peacock TV',
    name_ar: 'بيكوك TV',
    category: 'streaming',
    emoji: '🦚',
    color: '#0284C7',
    bgColor: 'rgba(2, 132, 199, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/nbc/0284C7',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>',
    tags: ['peacock', 'بيكوك', 'streaming']
  },

  // --- الألعاب والشحن (Gaming & Top-ups) ---
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    name_ar: 'ببجي موبايل (شدات UC)',
    category: 'gaming',
    emoji: '🎮',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/pubg/F59E0B',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8L19.5 8 12 11.7 4.5 8 12 4.8z"/></svg>',
    tags: ['pubg', 'ببجي', 'شدات', 'uc', 'mobile']
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    name_ar: 'فري فاير (جواهر)',
    category: 'gaming',
    emoji: '💎',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/garena/EF4444',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    tags: ['freefire', 'فري فاير', 'جواهر', 'diamonds', 'garena']
  },
  {
    id: 'playstation',
    name: 'PlayStation Network',
    name_ar: 'بلايستيشن ستور / PSN',
    category: 'gaming',
    emoji: '🕹️',
    color: '#003791',
    bgColor: 'rgba(0, 55, 145, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/playstation/003791',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 2C4.9 2 2 4.9 2 8.5v7C2 19.1 4.9 22 8.5 22h7c3.6 0 6.5-2.9 6.5-6.5v-7C22 4.9 19.1 2 15.5 2h-7zm0 2h7c2.5 0 4.5 2 4.5 4.5v7c0 2.5-2 4.5-4.5 4.5h-7C6 20 4 18 4 15.5v-7C4 6 6 4 8.5 4z"/></svg>',
    tags: ['playstation', 'psn', 'بلايستيشن', 'ps4', 'ps5', 'sony']
  },
  {
    id: 'xbox',
    name: 'Xbox Game Pass',
    name_ar: 'إكس بوكس جيم باس',
    category: 'gaming',
    emoji: '🟢',
    color: '#107C10',
    bgColor: 'rgba(16, 124, 16, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/xbox/107C10',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 15.5L12 13l-4.5 4.5L6 16l4.5-4.5L6 7l1.5-1.5L12 10l4.5-4.5L18 7l-4.5 4.5L18 16l-1.5 1.5z"/></svg>',
    tags: ['xbox', 'gamepass', 'اكس بوكس', 'إكس بوكس']
  },
  {
    id: 'steam',
    name: 'Steam Wallet',
    name_ar: 'ستيم والت / Steam',
    category: 'gaming',
    emoji: '💨',
    color: '#66C0F4',
    bgColor: 'rgba(102, 192, 244, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/steam/66C0F4',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0" fill="#66c0f4"/></svg>',
    tags: ['steam', 'ستيم', 'pc', 'games']
  },
  {
    id: 'roblox',
    name: 'Roblox Robux',
    name_ar: 'روبلوكس روبوكس',
    category: 'gaming',
    emoji: '🧱',
    color: '#E02424',
    bgColor: 'rgba(224, 36, 36, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/roblox/E02424',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.3 2L2 18.7 18.7 22 22 5.3 5.3 2zm7.7 11.2l-3-1 1-3 3 1-1 3z"/></svg>',
    tags: ['roblox', 'robux', 'روبلوكس', 'روبوكس']
  },

  // --- الإنتاجية والتطبيقات (Productivity) ---
  {
    id: 'notion',
    name: 'Notion Plus / AI',
    name_ar: 'نوشن Notion Plus',
    category: 'productivity',
    emoji: '📓',
    color: '#FFFFFF',
    bgColor: 'rgba(255, 255, 255, 0.12)',
    imageUrl: 'https://cdn.simpleicons.org/notion/FFFFFF',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2h11A2.5 2.5 0 0 1 20 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15zM7 6v12h3V9.5l4 8.5h3V6h-3v8.5L10 6H7z"/></svg>',
    tags: ['notion', 'نوشن', 'notes', 'ai']
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365 / Office',
    name_ar: 'مايكروسوفت 365 / أوفيس',
    category: 'productivity',
    emoji: '🪟',
    color: '#00A4EF',
    bgColor: 'rgba(0, 164, 239, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/microsoft/00A4EF',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 3h9v9H2V3zm11 0h9v9h-9V3zM2 13h9v9H2v-9zm11 0h9v9h-9v-9z"/></svg>',
    tags: ['microsoft', 'office', '365', 'مايكروسوفت', 'اوفيس', 'ويندوز', 'windows']
  },
  {
    id: 'miro',
    name: 'Miro Board',
    name_ar: 'ميرو للوحات التفاعلية',
    category: 'productivity',
    emoji: '〽️',
    color: '#FFD02F',
    bgColor: 'rgba(255, 208, 47, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/miro/FFD02F',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4v16H4zm6 4h4v12h-4zm6 4h4v8h-4z"/></svg>',
    tags: ['miro', 'ميرو', 'board']
  },
  {
    id: 'pdf',
    name: 'iLovePDF / PDF Editor',
    name_ar: 'محرر PDF / iLovePDF',
    category: 'productivity',
    emoji: '📑',
    color: '#E11D48',
    bgColor: 'rgba(225, 29, 72, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/adobeacrobatreader/E11D48',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>',
    tags: ['pdf', 'ilovepdf', 'محرر', 'adobe']
  },
  {
    id: 'grammarly',
    name: 'Grammarly Premium',
    name_ar: 'جرامرلي بريميوم',
    category: 'productivity',
    emoji: '🟢',
    color: '#15C39A',
    bgColor: 'rgba(21, 195, 154, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/grammarly/15C39A',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z"/></svg>',
    tags: ['grammarly', 'جرامرلي', 'writing']
  },

  // --- السوشيال والتواصل (Social & Community) ---
  {
    id: 'telegram',
    name: 'Telegram Premium',
    name_ar: 'تيليجرام بريميوم / نجوم',
    category: 'social',
    emoji: '⭐️',
    color: '#26A5E4',
    bgColor: 'rgba(38, 165, 228, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/telegram/26A5E4',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
    tags: ['telegram', 'stars', 'تليجرام', 'تيليجرام', 'تيلجرام', 'نجوم', 'premium']
  },
  {
    id: 'discord',
    name: 'Discord Nitro',
    name_ar: 'ديسكورد نيترو',
    category: 'social',
    emoji: '👾',
    color: '#5865F2',
    bgColor: 'rgba(88, 101, 242, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/discord/5865F2',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    tags: ['discord', 'nitro', 'ديسكورد', 'نيترو']
  },
  {
    id: 'apple',
    name: 'Apple Services / iCloud',
    name_ar: 'خدمات آبل / iCloud',
    category: 'social',
    emoji: '🍎',
    color: '#FFFFFF',
    bgColor: 'rgba(255, 255, 255, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/apple/FFFFFF',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.12.64-2.79 1.42-.58.67-1.1 1.74-1.01 2.79 1.08.08 2.17-.59 2.79-1.34z"/></svg>',
    tags: ['apple', 'icloud', 'ابل', 'آبل', 'music', 'itunes']
  },

  // --- بوابات الدفع والمحافظ (Payment) ---
  {
    id: 'vodafone',
    name: 'فودافون كاش (Vodafone Cash)',
    name_ar: 'فودافون كاش',
    category: 'payment',
    emoji: '🔴',
    color: '#E60000',
    bgColor: 'rgba(230, 0, 0, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/vodafone/E60000',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V6z" fill="#fff"/></svg>',
    tags: ['vodafone', 'cash', 'فودافون', 'كاش', 'محفظة', 'تحويل']
  },
  {
    id: 'instapay',
    name: 'إنستاباي (InstaPay Egypt)',
    name_ar: 'إنستاباي مصر',
    category: 'payment',
    emoji: '🟣',
    color: '#4F46E5',
    bgColor: 'rgba(79, 70, 229, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/bank/4F46E5',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v3h20V7L12 2zm-8 10v7h3v-7H4zm6 0v7h3v-7h-3zm6 0v7h3v-7h-3zM2 21h20v2H2v-2z"/></svg>',
    tags: ['instapay', 'انستاباي', 'إنستاباي', 'تحويل', 'بنك']
  },
  {
    id: 'binance',
    name: 'Binance Pay / USDT',
    name_ar: 'باينانس USDT',
    category: 'payment',
    emoji: '🟡',
    color: '#F3BA2F',
    bgColor: 'rgba(243, 186, 47, 0.15)',
    imageUrl: 'https://cdn.simpleicons.org/binance/F3BA2F',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.624 13.92l2.715 2.715-7.34 7.34-7.339-7.34 2.714-2.715 4.625 4.625 4.625-4.625zm-4.625-7.84l4.625 4.625-2.715 2.715-1.91-1.91-1.91 1.91-2.714-2.715 4.624-4.625zm8.563 4.625l2.715 2.715-2.715 2.715-2.715-2.715 2.715-2.715zm-17.126 0l2.715 2.715-2.715 2.715-2.715-2.715 2.715-2.715zm8.563-8.705l7.34 7.34-2.715 2.715-4.625-4.625-4.625 4.625-2.714-2.715 7.339-7.34z"/></svg>',
    tags: ['binance', 'usdt', 'crypto', 'باينانس', 'كريبتو']
  }
];

export function findBrandIcon(query: string = ''): BrandIcon | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  
  // Exact ID match
  const exact = BRAND_ICONS.find(b => b.id.toLowerCase() === q);
  if (exact) return exact;

  // Search by tags or name
  return BRAND_ICONS.find(b => 
    b.tags.some(t => q.includes(t.toLowerCase()) || t.toLowerCase().includes(q)) ||
    b.name.toLowerCase().includes(q) ||
    b.name_ar.includes(q)
  );
}
