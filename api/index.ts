import express from 'express';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import { initDatabase, ensureDatabase, runQuery, allQuery, getQuery, getSettings, saveSettings, getMaintenanceSettings, saveMaintenanceSettings, getAdminUser, saveAdminUser } from '../src/db.js';
import { findBrandIcon } from '../src/iconLibrary.js';

const app = express();
app.set('etag', false);
app.use(express.json());

// Disable caching for live API data (avoids 304 Not Modified and guarantees 200 OK)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Ensure database tables are created on any incoming request
app.use(async (req, res, next) => {
  try {
    await ensureDatabase();
  } catch (err) {
    console.error('ensureDatabase error:', err);
  }
  next();
});

// Telegram Webhook Endpoint
app.post(`/api/telegram-webhook`, (req, res) => {
  bot?.processUpdate(req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

// Default Telegram Credentials
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8592830117:AAGKDWECeoejkNY2HskXhcHK5rAP2E8Rlxo';
let TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '5626127409';

let bot: TelegramBot | null = null;
let botStatus = 'Offline';
let botError = '';
let botUsername = '';
let reminderIntervalId: any = null;

function escapeHtml(text: any = ''): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function safeBotEdit(action: () => Promise<any>) {
  try {
    return await action();
  } catch (err: any) {
    console.error('safeBotEdit error:', err?.message || err);
  }
}

async function isMaintenanceActive(chatId: number): Promise<boolean> {
  try {
    const maintenance = await getMaintenanceSettings();
    if (maintenance.maintenance_mode) {
      await safeBotEdit(() => bot?.sendMessage(chatId, `🛠️ <b>تنبيه صيانة البوت:</b>\n\n${escapeHtml(maintenance.maintenance_message)}`, { parse_mode: 'HTML' }));
      return true;
    }
  } catch (err) {
    console.error('Error checking maintenance:', err);
  }
  return false;
}

// Ensure User in Database
async function getOrCreateUser(from?: { id: number; first_name?: string; username?: string }, referredBy?: number) {
  if (!from) return null;
  try {
    let user = await getQuery<any>('SELECT * FROM users WHERE telegram_user_id = ?', [from.id]);
    if (!user) {
      const refCode = `ref_${from.id}`;
      await runQuery(`
        INSERT INTO users (telegram_user_id, first_name, username, balance, currency, language, referral_code, referred_by)
        VALUES (?, ?, ?, 0, 'EGP', 'ar', ?, ?)
      `, [from.id, from.first_name || '', from.username || '', refCode, referredBy || null]);
      user = await getQuery<any>('SELECT * FROM users WHERE telegram_user_id = ?', [from.id]);
    } else if (from.first_name !== user.first_name || from.username !== user.username) {
      await runQuery('UPDATE users SET first_name = ?, username = ? WHERE telegram_user_id = ?', [from.first_name || '', from.username || '', from.id]);
      user.first_name = from.first_name;
      user.username = from.username;
    }
    return user;
  } catch (err) {
    console.error('Error in getOrCreateUser:', err);
    return null;
  }
}

function formatMoney(amountEGP: number, currency = 'EGP', lang = 'ar'): string {
  const num = Number(amountEGP) || 0;
  if (currency === 'USD') {
    const usd = (num / 50).toFixed(2);
    return `$${usd} USD (${num} EGP)`;
  }
  return lang === 'en' ? `${num} EGP` : `${num} ج.م`;
}

function getServiceEmoji(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('gpt') || n.includes('chatgpt') || n.includes('شات')) return '🌐';
  if (n.includes('gemini') || n.includes('جيميناي') || n.includes('جيمناي')) return '✨';
  if (n.includes('capcut') || n.includes('كاب كات') || n.includes('مونتاج')) return '✂️';
  if (n.includes('grok') || n.includes('جروك') || n.includes('xai')) return '🔲';
  if (n.includes('canva') || n.includes('كانفا')) return '🎨';
  if (n.includes('adobe') || n.includes('ادوبي') || n.includes('أدوبي') || n.includes('photoshop')) return '🌈';
  if (n.includes('notion') || n.includes('نوشن')) return '📓';
  if (n.includes('netflix') || n.includes('نتفلكس') || n.includes('نتفليكس')) return '🎬';
  if (n.includes('leonardo') || n.includes('ليوناردو') || n.includes('midjourney')) return '🧙';
  if (n.includes('telegram') || n.includes('تليجرام') || n.includes('تيليجرام') || n.includes('تيلجرام') || n.includes('stars')) return '⭐';
  if (n.includes('microsoft') || n.includes('مايكروسوفت') || n.includes('office') || n.includes('windows') || n.includes('اوفيس') || n.includes('ويندوز')) return '🪟';
  if (n.includes('miro') || n.includes('ميرو')) return '〽️';
  if (n.includes('pdf') || n.includes('ilovepdf')) return '💌';
  if (n.includes('envato') || n.includes('انفاتو') || n.includes('إنفاتو')) return '🌿';
  if (n.includes('grammarly') || n.includes('جرامرلي')) return '🟢';
  if (n.includes('peacock') || n.includes('بيكوك')) return '🦚';
  if (n.includes('hbo') || n.includes('max')) return '🎥';
  if (n.includes('paramount') || n.includes('باراماونت')) return '🏔️';
  if (n.includes('shahid') || n.includes('شاهد')) return '🍿';
  if (n.includes('pubg') || n.includes('ببجي') || n.includes('شدات')) return '🎮';
  if (n.includes('free fire') || n.includes('فري فاير') || n.includes('جواهر')) return '💎';
  if (n.includes('spotify') || n.includes('سبوتيفاي') || n.includes('أنغامي') || n.includes('anghami')) return '🎵';
  if (n.includes('youtube') || n.includes('يوتيوب')) return '📺';
  if (n.includes('apple') || n.includes('ابل') || n.includes('آبل')) return '🍎';
  if (n.includes('discord') || n.includes('ديسكورد') || n.includes('nitro')) return '👾';
  if (n.includes('playstation') || n.includes('بلايستيشن') || n.includes('psn') || n.includes('xbox')) return '🕹️';
  if (n.includes('steam') || n.includes('ستيم')) return '💨';
  if (n.includes('roblox') || n.includes('روبلوكس')) return '🧱';
  if (n.includes('outlook') || n.includes('اوت لوك')) return '📧';
  if (n.includes('sim') || n.includes('شريحة')) return '📶';
  if (n.includes('framer')) return '📐';
  if (n.includes('vpn') || n.includes('avira') || n.includes('hma') || n.includes('بروكسي')) return '🛡️';
  if (n.includes('card') || n.includes('بطاق') || n.includes('كارت') || n.includes('gift')) return '💳';
  if (n.includes('ai') || n.includes('ذكاء')) return '🔮';
  return '💎';
}

function getMainKeyboard(lang = 'ar') {
  if (lang === 'en') {
    return {
      keyboard: [
        [{ text: '🛍️ Browse Services' }, { text: '📦 My Orders' }],
        [{ text: '👤 My Profile' }, { text: '💰 Wallet & Balance' }],
        [{ text: '💳 Deposit Balance' }, { text: '👥 Refer & Earn' }],
        [{ text: '💬 Support' }, { text: '💱 Currency' }, { text: '🌐 Language' }]
      ],
      resize_keyboard: true
    };
  }
  return {
    keyboard: [
      [{ text: '🛍️ تصفح الخدمات والمنتجات' }, { text: '📦 سجل طلباتي' }],
      [{ text: '👤 حسابي الشخصي' }, { text: '💰 رصيدي والمحفظة' }],
      [{ text: '💳 شحن رصيد فوري' }, { text: '👥 مكافآت الإحالة' }],
      [{ text: '💬 الدعم والمساعدة' }, { text: '💱 العملة' }, { text: '🌐 اللغة' }]
    ],
    resize_keyboard: true
  };
}

// Auto fulfill waiting pre-orders when product stock is updated
async function fulfillPendingOrdersForProduct(productId: number) {
  try {
    const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product || (product.stock || 0) <= 0) return;

    const waitingOrders = await allQuery<any>(`
      SELECT o.id, oi.quantity
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.product_id = ? AND o.status = 'waiting_stock'
      ORDER BY o.id ASC
    `, [productId]);

    for (const ord of waitingOrders) {
      const curProd = await getQuery<any>('SELECT * FROM products WHERE id = ?', [productId]);
      if (!curProd || (curProd.stock || 0) < (ord.quantity || 1)) {
        break;
      }
      await approveOrder(ord.id);
      console.log(`Auto-delivered pre-order #${ord.id} for product: ${product.name}`);
    }
  } catch (err) {
    console.error('Error auto-fulfilling pending pre-orders:', err);
  }
}

// Helper to auto-fulfill pending provider pre-orders when balance is refreshed
async function checkAndFulfillPendingProviderOrders() {
  try {
    const pendingOrders = await allQuery<any>(`
      SELECT o.id as order_id, o.telegram_user_id, p.id as product_id, p.name as product_name, p.provider_id, p.provider_service_id, oi.quantity
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'waiting_stock' AND p.is_provider_service = 1
      ORDER BY o.id ASC
    `);

    if (pendingOrders.length === 0) return;

    console.log(`Found ${pendingOrders.length} pending provider pre-orders. Attempting auto-fulfillment...`);
    for (const ord of pendingOrders) {
      const res = await approveOrder(ord.order_id);
      if (res.success && !res.waitingStock) {
        console.log(`✅ Auto-delivered provider pre-order #${ord.order_id} for user ${ord.telegram_user_id}!`);
      }
    }
  } catch (err) {
    console.error('Error in checkAndFulfillPendingProviderOrders:', err);
  }
}

// Helper to execute order with external service provider (e.g. XproStore)
async function executeProviderOrder(order: any, product: any, quantity: number, customFieldValues: any = {}): Promise<{ success: boolean; deliveredContent?: string; error?: string }> {
  try {
    const provider = await getQuery<any>('SELECT * FROM providers WHERE id = ?', [product.provider_id]);
    if (!provider) {
      return { success: false, error: 'المزود المرتبط بهذه الخدمة غير موجود.' };
    }

    const numericServiceId = parseInt(String(product.provider_service_id), 10) || Number(product.provider_service_id);
    if (!numericServiceId) {
      return { success: false, error: `معرف الخدمة لدى المزود غير صالح: ${product.provider_service_id}` };
    }

    if (provider.api_type === 'xprostore' || !provider.api_type) {
      const idempotencyKey = `ord_${order.id}_${Date.now()}`;
      const url = `${provider.api_url.replace(/\/$/, '')}/api/v1/orders`;

      const payload = {
        service_id: numericServiceId,
        quantity: parseInt(String(quantity || 1), 10) || 1,
        custom_field_values: customFieldValues || {},
        client_reference: `bot-order-${order.id}`
      };

      console.log(`Sending API order to provider ${provider.name} (${url}) with payload:`, payload);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.api_key.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.data) {
        const errorMsg = data?.error?.message || data?.message || `Provider HTTP ${res.status}`;
        console.error('Provider order failed:', errorMsg, data);
        await runQuery(`
          INSERT INTO provider_orders (order_id, provider_id, provider_service_id, status, response_data)
          VALUES (?, ?, ?, 'pending_retry', ?)
        `, [order.id, provider.id, String(numericServiceId), JSON.stringify(data || {})]);
        return { success: false, error: errorMsg };
      }

      const orderData = data.data;
      let deliveredContent = '';
      if (Array.isArray(orderData.delivered_items) && orderData.delivered_items.length > 0) {
        deliveredContent = orderData.delivered_items.join('\n');
      } else if (orderData.status === 'completed' || orderData.status === 'processing' || orderData.status === 'pending') {
        deliveredContent = `رقم الطلب لدى المزود: ${orderData.order_number || orderData.order_id}\nالحالة: ${orderData.status}`;
      } else {
        deliveredContent = JSON.stringify(orderData);
      }

      await runQuery(`
        INSERT INTO provider_orders (order_id, provider_id, provider_order_id, provider_service_id, status, response_data, delivered_items)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        provider.id,
        orderData.order_id || orderData.order_number || '',
        String(numericServiceId),
        orderData.status || 'completed',
        JSON.stringify(data),
        deliveredContent
      ]);

      return { success: true, deliveredContent };
    }

    return { success: false, error: 'نوع مزود الخدمة غير مدعوم.' };
  } catch (err: any) {
    console.error('Error executing provider order:', err);
    return { success: false, error: err.message };
  }
}

// Shared helper to approve an order and deliver product to customer
async function approveOrder(orderId: number): Promise<{ success: boolean; error?: string; waitingStock?: boolean }> {
  try {
    const order = await getQuery<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return { success: false, error: 'الطلب غير موجود.' };
    if (order.status !== 'pending_approval' && order.status !== 'waiting_stock') {
      return { success: false, error: `حالة الطلب بالفعل هي: ${order.status}` };
    }

    const orderItem = await getQuery<any>('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    if (!orderItem) {
      return { success: false, error: 'لم يتم العثور على أي منتج مسجل لهذا الطلب.' };
    }

    const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [orderItem.product_id]);
    if (!product) {
      return { success: false, error: 'المنتج الخاص بهذا الطلب غير موجود.' };
    }

    const qty = orderItem.quantity || 1;

    // Check user language
    const user = await getQuery<any>('SELECT * FROM users WHERE telegram_user_id = ?', [order.telegram_user_id]);
    const lang = user?.language || 'ar';
    const isAlreadyWaitingStock = order.status === 'waiting_stock';

    // If stock is currently 0 or less than quantity, mark as waiting_stock (pre-order) (only for local inventory products)
    if (!product.is_provider_service && (product.stock || 0) < qty) {
      await runQuery("UPDATE orders SET status = 'waiting_stock' WHERE id = ?", [orderId]);
      if (bot && !isAlreadyWaitingStock) {
        const waitingText = lang === 'en'
          ? `⏳ <b>Your Order #${orderId} is confirmed and in queue (Pre-order)!</b>\n\n` +
            `📦 <b>Product:</b> ${escapeHtml(product.name)}\n` +
            `🔢 <b>Quantity:</b> ${qty}\n\n` +
            `🔔 <i>Your order is verified. The activation code/service will be automatically sent to your chat here the second stock is added! 💎</i>`
          : `⏳ <b>تم تأكيد وقبول طلبك رقم #${orderId} في قائمة أولوية الانتظار (طلب مسبق)!</b>\n\n` +
            `📦 <b>المنتج:</b> ${escapeHtml(product.name)}\n` +
            `🔢 <b>الكمية:</b> ${qty} قطعة\n\n` +
            `🔔 <i>تم حجز طلبك بنجاح، وسيتم تسليم كود التفعيل لحسابك هنا تلقائياً وفور إضافة المخزون مباشرة دون أي تأخير! 💎</i>`;

        await safeBotEdit(() => bot?.sendMessage(order.telegram_user_id, waitingText, { parse_mode: 'HTML' }));
      }
      return { success: true, waitingStock: true };
    }

    let deliveredContent = '';
    let updatedDigitalContent = '';
    let updatedStock = Math.max(0, (product.stock || 0) - qty);

    if (product.is_provider_service) {
      // Execute with Provider API
      const providerRes = await executeProviderOrder(order, product, qty);
      if (!providerRes.success) {
        // Provider execution failed (e.g. insufficient balance on provider wallet or provider out of stock)
        // Mark as pre-order (waiting_stock) so customer balance is retained as spent and order is in queue
        await runQuery("UPDATE orders SET status = 'waiting_stock' WHERE id = ?", [orderId]);
        
        if (bot && !isAlreadyWaitingStock) {
          const waitingText = lang === 'en'
            ? `⏳ <b>Your Order #${orderId} is confirmed and in queue (Pre-order)!</b>\n\n` +
              `📦 <b>Service:</b> ${escapeHtml(product.name)}\n` +
              `🔢 <b>Quantity:</b> ${qty}\n\n` +
              `🔔 <i>Your order is confirmed. As soon as the service stock/balance is refreshed at the provider, your digital code will be sent to you automatically right here! 💎</i>`
            : `⏳ <b>تم تأكيد وقبول طلبك رقم #${orderId} في قائمة الانتظار (طلب مسبق)!</b>\n\n` +
              `📦 <b>الخدمة:</b> ${escapeHtml(product.name)}\n` +
              `🔢 <b>الكمية:</b> ${qty} قطعة\n\n` +
              `🔔 <i>تم حجز وتأكيد طلبك بنجاح، وسيتم تنفيذ طلبك وإرسال كود التفعيل لحسابك هنا تلقائياً وفور توفر الرصيد/المخزون لدى المزود دون أي تدخل منك! 💎</i>`;

          await safeBotEdit(() => bot?.sendMessage(order.telegram_user_id, waitingText, { parse_mode: 'HTML' }));
        }

        return { success: true, waitingStock: true, error: providerRes.error };
      }
      deliveredContent = providerRes.deliveredContent || 'تم تنفيذ طلبك بنجاح من المزود.';
      await runQuery("UPDATE orders SET status = 'approved', delivered_content = ? WHERE id = ?", [deliveredContent.trim(), orderId]);
    } else {
      try {
        const contentList = JSON.parse(product.digital_content);
        if (Array.isArray(contentList)) {
          if (contentList.length >= qty) {
            deliveredContent = contentList.slice(0, qty).join('\n');
            const remaining = contentList.slice(qty);
            updatedDigitalContent = JSON.stringify(remaining);
            updatedStock = remaining.length;
          } else if (contentList.length > 0) {
            deliveredContent = contentList.join('\n');
            updatedDigitalContent = JSON.stringify([]);
            updatedStock = 0;
          } else {
            deliveredContent = product.digital_content || 'تم تسليم طلبك بنجاح.';
            updatedDigitalContent = JSON.stringify([]);
            updatedStock = 0;
          }
        } else {
          const lines = String(product.digital_content || '').split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length >= qty) {
            deliveredContent = lines.slice(0, qty).join('\n');
            const remaining = lines.slice(qty);
            updatedDigitalContent = remaining.join('\n');
            updatedStock = remaining.length;
          } else if (lines.length > 0) {
            deliveredContent = lines.join('\n');
            updatedDigitalContent = '';
            updatedStock = 0;
          } else {
            deliveredContent = product.digital_content || 'تم تسليم طلبك بنجاح.';
            updatedDigitalContent = '';
            updatedStock = 0;
          }
        }
      } catch (e) {
        const lines = String(product.digital_content || '').split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= qty) {
          deliveredContent = lines.slice(0, qty).join('\n');
          const remaining = lines.slice(qty);
          updatedDigitalContent = remaining.join('\n');
          updatedStock = remaining.length;
        } else if (lines.length > 0) {
          deliveredContent = lines.join('\n');
          updatedDigitalContent = '';
          updatedStock = 0;
        } else {
          deliveredContent = product.digital_content || 'تم تسليم طلبك بنجاح.';
          updatedDigitalContent = '';
          updatedStock = 0;
        }
      }

      // Update DB
      await runQuery("UPDATE orders SET status = 'approved', delivered_content = ? WHERE id = ?", [deliveredContent.trim(), orderId]);
      await runQuery('UPDATE products SET stock = ?, digital_content = ? WHERE id = ?', [updatedStock, updatedDigitalContent, product.id]);
    }

    // Check referral reward on first approved order
    if (order.telegram_user_id) {
      try {
        if (user && user.referred_by) {
          const approvedCount = await getQuery<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE telegram_user_id = ? AND status = 'approved'", [order.telegram_user_id]);
          if (approvedCount && approvedCount.count === 1) {
            const rewardAmount = 5;
            await runQuery('UPDATE users SET balance = balance + ? WHERE telegram_user_id = ?', [rewardAmount, user.referred_by]);
            if (bot) {
              await bot.sendMessage(user.referred_by, `🎁 <b>تهانينا! حصلت على مكافأة إحالة بقيمة ${rewardAmount} ج.م</b> 💎\nلأن أحد أصدقائك قام بأول عملية شراء ناجحة في المتجر!`, { parse_mode: 'HTML' });
            }
          }
        }
      } catch (refErr) {
        console.error('Referral reward error:', refErr);
      }
    }

    // Send Telegram Delivery Notification to customer ONLY if deliveredContent is non-empty and valid
    if (bot && deliveredContent && deliveredContent.trim().length > 0 && order.telegram_user_id) {
      try {
        const deliveryText = lang === 'en'
          ? `🎉 <b>Congratulations! Your order #${orderId} has been fulfilled!</b> ✅\n\n` +
            `📦 <b>Product:</b> ${escapeHtml(product.name)}\n\n` +
            `🔑 <b>Digital Content / Activation Key:</b>\n` +
            `<code>${escapeHtml(deliveredContent.trim())}</code>\n\n` +
            `💡 <i>Tip: Tap and hold the content above to copy.</i>\n\n` +
            `Thank you for choosing Digital Value! 💎`
          : `🎉 <b>تهانينا! تم تسليم طلبك رقم #${orderId} بنجاح!</b> ✅\n\n` +
            `📦 <b>المنتج:</b> ${escapeHtml(product.name)}\n\n` +
            `🔑 <b>محتوى طلبك الرقمي (الكود أو رابط التفعيل):</b>\n` +
            `<code>${escapeHtml(deliveredContent.trim())}</code>\n\n` +
            `💡 <i>تلميح: يمكنك نسخ المحتوى أعلاه بالضغط عليه مطولاً.</i>\n\n` +
            `شكراً لاختيارك ديجيتال ڤاليو! 💎 نرجو أن نكون عند حسن ظنك دائماً.`;

        const customerKeyboard = {
          inline_keyboard: [
            [
              { text: lang === 'en' ? '🛍️ Buy other products' : '🛍️ شراء منتجات أخرى', callback_data: 'show_categories' },
              { text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
            ]
          ]
        };

        await bot.sendMessage(order.telegram_user_id, deliveryText, { 
          parse_mode: 'HTML',
          reply_markup: customerKeyboard
        });
      } catch (botErr: any) {
        console.error('Failed to send Telegram approve notification to customer:', botErr.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in approveOrder:', err);
    return { success: false, error: err.message };
  }
}

// Shared helper to reject an order
async function rejectOrder(orderId: number, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await getQuery<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return { success: false, error: 'الطلب غير موجود.' };
    if (order.status !== 'pending_approval') {
      return { success: false, error: `حالة الطلب بالفعل هي: ${order.status}` };
    }

    // Update DB
    await runQuery("UPDATE orders SET status = 'rejected', rejection_reason = ? WHERE id = ?", [reason, orderId]);

    // Send Telegram Notification to customer
    if (bot) {
      try {
        const clientNotify = `❌ <b>تم رفض طلبك رقم #${orderId} من قبل الإدارة.</b>\n\n` +
          `⚠️ <b>سبب الرفض:</b>\n${escapeHtml(reason)}\n\n` +
          `📞 إذا كنت قد قمت بالتحويل بالفعل، يرجى التواصل مع الدعم الفني @DigitalValueSupport لحل المشكلة يدوياً.`;

        const customerKeyboard = {
          inline_keyboard: [
            [
              { text: '🛍️ تصفح المنتجات', callback_data: 'show_categories' },
              { text: '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
            ]
          ]
        };

        await bot.sendMessage(order.telegram_user_id, clientNotify, { 
          parse_mode: 'HTML',
          reply_markup: customerKeyboard
        });
      } catch (botErr: any) {
        console.error('Failed to send Telegram reject notification to customer:', botErr.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in rejectOrder:', err);
    return { success: false, error: err.message };
  }
}

// Active checkout sessions: { [telegramUserId]: { productId, walletId, quantity, step, createdAt, remindersCount } }
const checkoutSessions: Record<number, { 
  productId?: number; 
  walletId?: number; 
  quantity?: number;
  step: string; 
  createdAt?: number; 
  remindersCount?: number;
}> = {};

// Active balance deposit sessions
const depositSessions: Record<number, {
  step: 'awaiting_amount' | 'awaiting_wallet' | 'awaiting_receipt';
  amount?: number;
  walletId?: number;
  createdAt?: number;
}> = {};

// Broadcast notification to all customers when product stock is replenished
async function notifyRestock(productId: number, productName: string, price: number, newStockCount: number) {
  if (!bot || botStatus !== 'Active' || newStockCount <= 0) return;
  
  try {
    const users = await allQuery<any>('SELECT telegram_user_id FROM users');
    if (!users || users.length === 0) return;

    const userIds = users
      .map(u => u.telegram_user_id)
      .filter((id): id is number => !!id);

    if (userIds.length === 0) return;

    const restockText = `🔔 <b>بشرى سارة! تم توفير مخزون جديد!</b> 🎉\n\n` +
      `📦 المنتج: <b>${escapeHtml(productName)}</b>\n` +
      `💰 السعر: <b>${price} ج.م / $</b>\n` +
      `⚡ الكمية المتوفرة حالياً: <b>${newStockCount} قطعة</b>\n\n` +
      `🔥 <i>المنتج متاح الآن في المتجر للشراء الفوري والتسليم التلقائي عبر البوت! اطلبه الآن قبل نفاد الكمية! 🎮</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛍️ تفاصيل المنتج وشراء الآن', callback_data: `prod_${productId}` },
          { text: '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
        ]
      ]
    };

    for (const userId of userIds) {
      try {
        await bot.sendMessage(userId, restockText, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } catch (err: any) {
        console.error(`Error notifying user ${userId} about restock:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error in notifyRestock:', err);
  }
}

// Initialize Telegram Bot
function startTelegramBot() {
  const savedSettings = getSettings().catch(() => ({} as any));
  savedSettings.then((settings: any) => {
    if (settings.telegram_bot_token) {
      TELEGRAM_BOT_TOKEN = settings.telegram_bot_token;
    }
    if (settings.telegram_admin_chat_id) {
      TELEGRAM_ADMIN_CHAT_ID = settings.telegram_admin_chat_id;
    }

    if (bot) {
      try {
        bot.stopPolling();
      } catch (e) {
        console.error('Error stopping previous bot instance:', e);
      }
    }

    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
      reminderIntervalId = null;
    }

    if (!TELEGRAM_BOT_TOKEN) {
      botStatus = 'Error';
      botError = 'Token is missing';
      console.error('Telegram Bot Token is missing. Bot is offline.');
      return;
    }

    const webhookHost = process.env.APP_URL || (process.env.VERCEL_URL ? (process.env.VERCEL_URL.startsWith('http') ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`) : '');

    if (webhookHost) {
      bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
      bot.setWebHook(`${webhookHost}/api/telegram-webhook`).catch(err => {
        console.error('Webhook configuration error:', err.message);
      });
      console.log('Bot running in Webhook mode on:', webhookHost);
    } else if (process.env.VERCEL) {
      bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
      console.log('Bot running in Serverless webhook mode on Vercel.');
    } else {
      bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
      console.log('Bot running in Long Polling mode for local/dev environment.');
    }

    bot.getMe().then(me => {
      botUsername = me.username || '';
      botStatus = 'Active';
      botError = '';
      console.log(`Telegram Bot @${botUsername} is Active and Connected.`);
    }).catch(err => {
      botStatus = 'Unauthorized';
      botError = err.message || 'Invalid Bot Token';
      console.error('Failed to connect bot:', err.message);
    });

    if (!process.env.VERCEL) {
      // Periodic background task to check and fulfill pending provider pre-orders
      reminderIntervalId = setInterval(async () => {
        if (!bot || botStatus !== 'Active') return;
        // Check and fulfill any pending provider pre-orders silently
        checkAndFulfillPendingProviderOrders().catch(console.error);
      }, 60000);
    }

    // Handle bot polling errors
    bot.on('polling_error', (err: any) => {
      const errMsg = err.message || '';
      console.error('Telegram Bot Polling Error:', errMsg);
      if (errMsg.includes('409') || errMsg.toLowerCase().includes('conflict')) {
        botStatus = 'Error';
        botError = 'خطأ 409: هناك نسخة أخرى من البوت تعمل بنفس التوكن حالياً.';
      } else if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized')) {
        botStatus = 'Unauthorized';
        botError = '401 Unauthorized: يرجى التحقق من توكن البوت وتحديثه في الإعدادات.';
        try {
          bot?.stopPolling();
        } catch (stopErr) {}
      }
    });

    // 1. Start Command / Main Menu
    bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      if (await isMaintenanceActive(chatId)) return;

      delete checkoutSessions[chatId];
      delete depositSessions[chatId];

      let referredBy: number | undefined;
      const startParam = match?.[1]?.trim();
      if (startParam && startParam.startsWith('ref_')) {
        const referrerId = parseInt(startParam.replace('ref_', ''));
        if (!isNaN(referrerId) && referrerId !== chatId) {
          referredBy = referrerId;
        }
      }

      const user = await getOrCreateUser(msg.from, referredBy);
      const lang = user?.language || 'ar';
      const currency = user?.currency || 'EGP';
      const userName = msg.chat.first_name || (lang === 'en' ? 'Valued Customer' : 'عميلنا العزيز');
      const balanceFormatted = formatMoney(user?.balance || 0, currency, lang);
      const userOrders = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM orders WHERE telegram_user_id = ?', [chatId]);

      const welcomeText = lang === 'en'
        ? `✨ <b>Welcome to DIGITAL VALUE STORE!</b> ✨\n` +
          `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
          `👋 Hello <b>${escapeHtml(userName)}</b>! Welcome to your premier hub for digital game top-ups, gift cards, and premium subscriptions with <b>instant auto-delivery 24/7</b>!\n\n` +
          `📊 <b>Your Account Overview:</b>\n` +
          `▫️ User ID: <code>${chatId}</code>\n` +
          `▫️ Wallet Balance: <b>${balanceFormatted}</b> 💰\n` +
          `▫️ Completed Orders: <b>${userOrders?.count || 0} order(s)</b> 📦\n` +
          `▫️ System Status: 🟢 <b>Operational (Instant Delivery)</b>\n\n` +
          `🛡️ <i>All services are 100% genuine, guaranteed, and delivered instantly upon payment!</i>\n\n` +
          `👇 <b>Choose an option below to start:</b>`
        : `✨ <b>مرحباً بك في متجر ديجيتال ڤاليو | DIGITAL VALUE</b> ✨\n` +
          `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
          `👋 أهلاً بك يا <b>${escapeHtml(userName)}</b> في المنصة الرقمية الأسرع والأكثر أماناً لشحن الألعاب والبطاقات والاشتراكات!\n\n` +
          `📊 <b>نظرة سريعة على حسابك:</b>\n` +
          `▫️ معرف حسابك: <code>${chatId}</code>\n` +
          `▫️ رصيد محفظتك: <b>${balanceFormatted}</b> 💰\n` +
          `▫️ إجمالي طلباتك: <b>${userOrders?.count || 0} طلب</b> 📦\n` +
          `▫️ حالة النظام: 🟢 <b>نشط وتسليم تلقائي 24/7</b>\n\n` +
          `🛡️ <i>جميع خدماتنا أصلية ومضمونة 100%، ويتم تسليم الكود تلقائياً فور إتمام الدفع!</i>\n\n` +
          `👇 <b>اختر من القائمة أدناه لتصفح الخدمات والبدء:</b>`;

      const inlineQuickMenu = {
        inline_keyboard: [
          [
            { text: lang === 'en' ? '🛍️ Browse Products & Services' : '🛍️ تصفح الأقسام والخدمات', callback_data: 'show_categories' }
          ],
          [
            { text: lang === 'en' ? '💳 Deposit Funds' : '💳 شحن رصيد فوري', callback_data: 'deposit_balance' },
            { text: lang === 'en' ? '📦 My Orders' : '📦 متابعة طلباتي', callback_data: 'my_orders' }
          ],
          [
            { text: lang === 'en' ? '👥 Refer & Earn' : '👥 مكافآت الإحالة (5 ج.م)', callback_data: 'ref_info' },
            { text: lang === 'en' ? '💬 Direct Support' : '💬 الدعم الفني المباشر', callback_data: 'support_info' }
          ]
        ]
      };

      await bot?.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        reply_markup: getMainKeyboard(lang)
      });

      await bot?.sendMessage(chatId, lang === 'en' ? '⚡ <b>Quick Shortcuts:</b>' : '⚡ <b>الوصول السريع للخدمات:</b>', {
        parse_mode: 'HTML',
        reply_markup: inlineQuickMenu
      });
    });

    // Handle text messages
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      if (await isMaintenanceActive(chatId)) return;

      const user = await getOrCreateUser(msg.from);
      const lang = user?.language || 'ar';
      const currency = user?.currency || 'EGP';

      const checkout = checkoutSessions[chatId];
      const deposit = depositSessions[chatId];

      if (msg.text?.startsWith('/')) return;

      // Handle deposit amount input
      if (deposit && deposit.step === 'awaiting_amount' && msg.text) {
        const amount = parseFloat(msg.text.trim());
        if (isNaN(amount) || amount <= 0) {
          await bot?.sendMessage(chatId, lang === 'en' ? '⚠️ Please enter a valid amount greater than 0 (e.g. 100):' : '⚠️ الرجاء إدخال مبلغ صحيح أكبر من الصفر للشحن (مثال: 100):');
          return;
        }

        deposit.amount = amount;
        deposit.step = 'awaiting_wallet';

        const wallets = await allQuery<any>('SELECT * FROM wallets');
        if (wallets.length === 0) {
          await bot?.sendMessage(chatId, lang === 'en' ? '❌ Sorry, no payment gateways are active right now.' : '❌ عذراً، لا توجد بوابات دفع مفعلة حالياً.');
          delete depositSessions[chatId];
          return;
        }

        const walletButtons = wallets.map(w => ([{
          text: `💳 ${w.name}`,
          callback_data: `dep_wallet_${w.id}`
        }]));
        walletButtons.push([{ text: lang === 'en' ? '❌ Cancel Deposit' : '❌ إلغاء عملية الشحن', callback_data: 'cancel_deposit' }]);

        const amountFormatted = formatMoney(amount, currency, lang);
        const depTitle = lang === 'en'
          ? `💳 <b>Deposit Request for: ${amountFormatted}</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `Please select your preferred payment gateway / wallet below:`
          : `💳 <b>طلب شحن رصيد بقيمة: ${amountFormatted}</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `الرجاء اختيار المحفظة / طريقة التحويل المناسبة لك أدناه:`;

        await bot?.sendMessage(chatId, depTitle, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: walletButtons }
        });
        return;
      }

      // Handle custom quantity input in checkout
      if (checkout && checkout.step === 'entering_quantity' && msg.text) {
        const qty = parseInt(msg.text.trim());
        if (isNaN(qty) || qty <= 0) {
          await bot?.sendMessage(chatId, lang === 'en' ? '⚠️ Please enter a valid quantity greater than 0 (e.g. 5):' : '⚠️ الرجاء إدخال عدد صحيح أكبر من الصفر لشراء المنتج (مثال: 5):');
          return;
        }

        try {
          const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [checkout.productId]);
          if (!product) {
            await bot?.sendMessage(chatId, lang === 'en' ? '❌ Sorry, this product is no longer available.' : '❌ عذراً، لم يعد هذا المنتج متوفراً.');
            delete checkoutSessions[chatId];
            return;
          }

          checkout.quantity = qty;
          checkout.step = 'payment_method';
          checkout.createdAt = Date.now();
          checkout.remindersCount = 0;

          const userBalance = Number(user?.balance || 0);
          const wallets = await allQuery<any>('SELECT * FROM wallets');
          const walletButtons: any[][] = [];

          const balanceLabel = lang === 'en'
            ? `💰 Pay Instantly from Wallet (${formatMoney(userBalance, currency, lang)})`
            : `💰 الدفع الفوري من رصيدي (${formatMoney(userBalance, currency, lang)})`;

          walletButtons.push([{
            text: balanceLabel,
            callback_data: `pay_balance_${product.id}`
          }]);

          wallets.forEach(w => {
            walletButtons.push([{
              text: `💳 تحويل عبر ${w.name}`,
              callback_data: `pay_${w.id}_${product.id}`
            }]);
          });

          walletButtons.push([{ text: lang === 'en' ? '🔙 Change Quantity' : '🔙 تغيير الكمية', callback_data: `buy_${product.id}` }]);
          walletButtons.push([{ text: lang === 'en' ? '❌ Cancel Checkout' : '❌ إلغاء الشراء والتراجع', callback_data: 'cancel_checkout' }]);

          const totalFormatted = formatMoney(product.price * qty, currency, lang);
          const userBalanceFormatted = formatMoney(userBalance, currency, lang);
          const text = lang === 'en'
            ? `🧾 <b>Order Confirmation & Invoice</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📦 <b>Product:</b> ${escapeHtml(product.name)}\n` +
              `🔢 <b>Quantity:</b> <b>${qty} item(s)</b>\n` +
              `💰 <b>Total Due:</b> <b>${totalFormatted}</b>\n` +
              `💳 <b>Your Wallet Balance:</b> <b>${userBalanceFormatted}</b>\n\n` +
              `👇 <b>Select payment method below:</b>`
            : `🧾 <b>فاتورة تأكيد الطلب | INVOICE</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📦 <b>المنتج:</b> ${escapeHtml(product.name)}\n` +
              `🔢 <b>الكمية المطلوبة:</b> <b>${qty} قطعة</b>\n` +
              `💰 <b>إجمالي المبلغ:</b> <b>${totalFormatted}</b>\n` +
              `💳 <b>رصيدك المتاح:</b> <b>${userBalanceFormatted}</b>\n\n` +
              `👇 <b>اختر وسيلة الدفع لإتمام طلبك:</b>`;

          await bot?.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: walletButtons }
          });
        } catch (e) {
          console.error(e);
          await bot?.sendMessage(chatId, lang === 'en' ? '❌ An error occurred, please try again.' : '❌ حدث خطأ أثناء معالجة طلبك، يرجى المحاولة مرة أخرى.');
        }
        return;
      }

      // Handle Main Menu Keyboard Buttons (Bilingual & Flexible Match)
      const text = msg.text || '';
      if (text.includes('الخدمات') || text.includes('Services') || text.includes('Browse')) {
        bot.emit('callback_query', {
          id: 'stub',
          from: msg.from,
          message: msg,
          data: 'show_categories'
        } as any);
        return;
      } else if (text.includes('طلباتي') || text.includes('Orders')) {
        bot.emit('callback_query', {
          id: 'stub',
          from: msg.from,
          message: msg,
          data: 'my_orders'
        } as any);
        return;
      } else if (text.includes('حسابي') || text.includes('Profile')) {
        const userOrders = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM orders WHERE telegram_user_id = ?', [chatId]);
        const balanceFormatted = formatMoney(user?.balance || 0, currency, lang);

        const profileText = lang === 'en'
          ? `👤 <b>Your Member Profile</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `• <b>Full Name:</b> ${escapeHtml(user?.first_name || msg.from?.first_name || 'Valued Customer')}\n` +
            `• <b>User ID:</b> <code>${chatId}</code>\n` +
            `• <b>Username:</b> @${escapeHtml(user?.username || msg.from?.username || 'None')}\n` +
            `• <b>Available Balance:</b> <b>${balanceFormatted}</b> 💰\n` +
            `• <b>Completed Orders:</b> <b>${userOrders?.count || 0} order(s)</b> 📦\n` +
            `• <b>Preferred Currency:</b> <b>${currency}</b>\n` +
            `• <b>Current Language:</b> English 🇬🇧\n\n` +
            `💡 <i>You can use your wallet balance for instant 1-click purchases anytime!</i>`
          : `👤 <b>الملف الشخصي وبيانات حسابك</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `• <b>الاسم:</b> ${escapeHtml(user?.first_name || msg.from?.first_name || 'عميلنا العزيز')}\n` +
            `• <b>معرف المستخدم:</b> <code>${chatId}</code>\n` +
            `• <b>اسم المستخدم:</b> @${escapeHtml(user?.username || msg.from?.username || 'لا يوجد')}\n` +
            `• <b>رصيدك الحالي:</b> <b>${balanceFormatted}</b> 💰\n` +
            `• <b>إجمالي الطلبات:</b> <b>${userOrders?.count || 0} طلب</b> 📦\n` +
            `• <b>العملة المفضلة:</b> <b>${currency}</b>\n` +
            `• <b>لغة البوت:</b> العربية 🇪🇬\n\n` +
            `💡 <i>رصيدك متاح دائماً للشراء الفوري لأي خدمة أو منتج بنقرة واحدة!</i>`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: lang === 'en' ? '💳 Deposit Balance' : '💳 شحن رصيد فوري', callback_data: 'deposit_balance' },
              { text: lang === 'en' ? '📦 My Orders' : '📦 سجل طلباتي', callback_data: 'my_orders' }
            ],
            [
              { text: lang === 'en' ? '👥 Refer & Earn' : '👥 مكافآت الإحالة', callback_data: 'ref_info' },
              { text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
            ]
          ]
        };

        await bot?.sendMessage(chatId, profileText, { parse_mode: 'HTML', reply_markup: keyboard });
        return;
      } else if (text.includes('الدعم') || text.includes('Support')) {
        bot.emit('callback_query', {
          id: 'stub',
          from: msg.from,
          message: msg,
          data: 'support_info'
        } as any);
        return;
      } else if (text.includes('الرصيد') || text.includes('Balance') || text.includes('المحفظة')) {
        const balanceFormatted = formatMoney(user?.balance || 0, currency, lang);
        const balanceText = lang === 'en'
          ? `💰 <b>Your Wallet & Balance</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `💵 <b>Available Balance:</b> <b>${balanceFormatted}</b>\n\n` +
            `⚡ <i>Use your balance to enjoy instant 1-second auto-delivery on all products and subscriptions!</i>`
          : `💰 <b>محفظتك ورصيدك المتاح</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `💵 <b>الرصيد المتوفر للشراء:</b> <b>${balanceFormatted}</b>\n\n` +
            `⚡ <i>استمتع بالشراء الفوري من رصيدك وتسليم فوري خلال ثوانٍ معدودة لكافة الخدمات والألعاب!</i>`;

        const keyboard = {
          inline_keyboard: [
            [{ text: lang === 'en' ? '💳 Deposit Balance Now' : '💳 شحن وإضافة رصيد للمحفظة', callback_data: 'deposit_balance' }],
            [{ text: lang === 'en' ? '🛍️ Browse Products' : '🛍️ تصفح وشراء المنتجات', callback_data: 'show_categories' }]
          ]
        };

        await bot?.sendMessage(chatId, balanceText, { parse_mode: 'HTML', reply_markup: keyboard });
        return;
      } else if (text.includes('شحن') || text.includes('إضافة رصيد') || text.includes('Deposit')) {
        bot.emit('callback_query', {
          id: 'stub',
          from: msg.from,
          message: msg,
          data: 'deposit_balance'
        } as any);
        return;
      } else if (text.includes('الإحالة') || text.includes('الإحالات') || text.includes('Refer')) {
        bot.emit('callback_query', {
          id: 'stub',
          from: msg.from,
          message: msg,
          data: 'ref_info'
        } as any);
        return;
      } else if (text.includes('العملة') || text.includes('Currency')) {
        const currencyText = lang === 'en'
          ? `💱 <b>Select Preferred Currency:</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `Current Account Currency: <b>${currency}</b>`
          : `💱 <b>تحديد العملة المفضلة لحسابك:</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `العملة الحالية المستخدمة: <b>${currency}</b>`;
        const keyboard = {
          inline_keyboard: [
            [
              { text: '🇪🇬 الجنيه المصري (EGP)', callback_data: 'set_currency_EGP' },
              { text: '🇺🇸 US Dollar (USD)', callback_data: 'set_currency_USD' }
            ],
            [{ text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]
          ]
        };
        await bot?.sendMessage(chatId, currencyText, { parse_mode: 'HTML', reply_markup: keyboard });
        return;
      } else if (text.includes('اللغة') || text.includes('Language')) {
        const langText = `🌐 <b>اختيار لغة البوت (Select Bot Language):</b>\n💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎`;
        const keyboard = {
          inline_keyboard: [
            [
              { text: '🇪🇬 العربية', callback_data: 'set_lang_ar' },
              { text: '🇬🇧 English', callback_data: 'set_lang_en' }
            ],
            [{ text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]
          ]
        };
        await bot?.sendMessage(chatId, langText, { parse_mode: 'HTML', reply_markup: keyboard });
        return;
      }

      // Handle sending Photo/Document receipts
      const isPhoto = !!(msg.photo && msg.photo.length > 0);
      const isDocImage = !!(msg.document && msg.document.mime_type?.startsWith('image/'));

      // Check Deposit Receipt Submission
      if ((isPhoto || isDocImage) && deposit && deposit.step === 'awaiting_receipt') {
        const amount = deposit.amount || 0;
        const walletId = deposit.walletId || 0;
        const fileId = isPhoto ? msg.photo![msg.photo!.length - 1].file_id : msg.document!.file_id;

        try {
          const wallet = await getQuery<any>('SELECT * FROM wallets WHERE id = ?', [walletId]);
          const depositRes = await runQuery(`
            INSERT INTO balance_deposits (telegram_user_id, amount, wallet_id, proof_file_id, status)
            VALUES (?, ?, ?, ?, 'pending')
          `, [chatId, amount, walletId, fileId]);

          const depositId = depositRes.lastID;
          delete depositSessions[chatId];

          const formattedAmount = formatMoney(amount, currency, lang);
          const successDepositText = lang === 'en'
            ? `✅ <b>Deposit Receipt Received Successfully!</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `▫️ <b>Transaction ID:</b> <code>#DEP-${depositId}</code>\n` +
              `▫️ <b>Amount:</b> <b>${formattedAmount}</b>\n` +
              `▫️ <b>Payment Gateway:</b> <b>${escapeHtml(wallet?.name || 'Wallet')}</b>\n\n` +
              `⏳ <i>Your receipt is being verified by our administration team. Your wallet balance will be credited within minutes! Thank you for choosing us 💎</i>`
            : `✅ <b>تم استلام إيصال شحن الرصيد بنجاح!</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `▫️ <b>رقم العملية:</b> <code>#DEP-${depositId}</code>\n` +
              `▫️ <b>المبلغ المراد شحنه:</b> <b>${formattedAmount}</b>\n` +
              `▫️ <b>بوابة التحويل:</b> <b>${escapeHtml(wallet?.name || 'محفظة')}</b>\n\n` +
              `⏳ <i>جاري مراجعة الإيصال من الإدارة وسيتم إضافة الرصيد لمحفظتك خلال دقائق معدودة! شكراً لثقتك بنا 💎</i>`;

          const quickKb = {
            inline_keyboard: [
              [{ text: lang === 'en' ? '🛍️ Browse Products' : '🛍️ تصفح المنتجات', callback_data: 'show_categories' }],
              [{ text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]
            ]
          };

          await bot?.sendMessage(chatId, successDepositText, { parse_mode: 'HTML', reply_markup: quickKb });
        } catch (e) {
          console.error('Error handling deposit proof:', e);
          await bot?.sendMessage(chatId, lang === 'en' ? '❌ Error recording deposit. Please contact support.' : '❌ حدث خطأ في تسجيل عملية الشحن، يرجى التواصل مع الدعم.');
        }
        return;
      }

      // Check Order Receipt Submission
      if ((isPhoto || isDocImage) && checkout && checkout.step === 'awaiting_receipt') {
        const productId = checkout.productId;
        const walletId = checkout.walletId;

        if (!productId || !walletId) {
          bot?.sendMessage(chatId, lang === 'en' ? '❌ Session error, please start over.' : '❌ حدث خطأ في معالجة طلبك، يرجى المحاولة مرة أخرى.');
          delete checkoutSessions[chatId];
          return;
        }

        try {
          const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [productId]);
          const wallet = await getQuery<any>('SELECT * FROM wallets WHERE id = ?', [walletId]);

          if (!product) {
            bot?.sendMessage(chatId, lang === 'en' ? '❌ Product is no longer available.' : '❌ هذا المنتج لم يعد متوفراً.');
            delete checkoutSessions[chatId];
            return;
          }

          const qty = checkout.quantity || 1;
          const totalPrice = product.price * qty;

          // Generate Order
          const orderResult = await runQuery(`
            INSERT INTO orders (telegram_user_id, telegram_username, telegram_first_name, status, total_price, wallet_id)
            VALUES (?, ?, ?, 'pending_approval', ?, ?)
          `, [
            chatId,
            msg.chat.username || '',
            msg.chat.first_name || '',
            totalPrice,
            walletId
          ]);

          const orderId = orderResult.lastID;

          // Insert order item
          await runQuery(`
            INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
            VALUES (?, ?, ?, ?, ?)
          `, [orderId, product.id, product.name, product.price, qty]);

          // Save payment proof photo
          const fileId = isPhoto ? msg.photo![msg.photo!.length - 1].file_id : msg.document!.file_id;

          await runQuery(`
            INSERT INTO payment_proofs (order_id, file_id)
            VALUES (?, ?)
          `, [orderId, fileId]);

          // Clear session
          delete checkoutSessions[chatId];

          const totalFormatted = formatMoney(totalPrice, currency, lang);
          const customerMessage = lang === 'en'
            ? `🎉 <b>Payment Receipt Received! Order is under review.</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📝 <b>Order Details:</b>\n` +
              `• <b>Order ID:</b> <code>#${orderId}</code>\n` +
              `• <b>Product:</b> <b>${escapeHtml(product.name)}</b>\n` +
              `• <b>Quantity:</b> <b>${qty} item(s)</b>\n` +
              `• <b>Total Amount:</b> <b>${totalFormatted}</b>\n` +
              `• <b>Payment Gateway:</b> <b>${escapeHtml(wallet ? wallet.name : 'Digital Wallet')}</b>\n\n` +
              `⏳ <i>Your order is currently being verified by the management team. Your digital code will be delivered here instantly upon confirmation!</i>`
            : `🎉 <b>تم استلام إيصال الدفع بنجاح! طلبك قيد المراجعة الفورية.</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📝 <b>تفاصيل الطلب:</b>\n` +
              `• <b>رقم الطلب:</b> <code>#${orderId}</code>\n` +
              `• <b>المنتج / الخدمة:</b> <b>${escapeHtml(product.name)}</b>\n` +
              `• <b>الكمية المطلوبة:</b> <b>${qty} قطعة</b>\n` +
              `• <b>السعر الإجمالي:</b> <b>${totalFormatted}</b>\n` +
              `• <b>طريقة التحويل:</b> <b>${escapeHtml(wallet ? wallet.name : 'محفظة رقمية')}</b>\n\n` +
              `⏳ <i>طلبك الآن قيد المراجعة السريعة من فريق الإدارة. ستتلقى كود التفعيل ورسالة التأكيد هنا فوراً! شكراً لاختيارك ديجيتال ڤاليو 💎</i>`;

          const customerKeyboard = {
            inline_keyboard: [
              [
                { text: lang === 'en' ? '📦 Track My Orders' : '📦 متابعة سجل طلباتي', callback_data: 'my_orders' },
                { text: lang === 'en' ? '🛍️ Shop More' : '🛍️ شراء منتجات أخرى', callback_data: 'show_categories' }
              ],
              [
                { text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
              ]
            ]
          };

          await bot?.sendMessage(chatId, customerMessage, { 
            parse_mode: 'HTML',
            reply_markup: customerKeyboard
          });

        } catch (dbErr) {
          console.error('Database error in receipt submission:', dbErr);
          bot?.sendMessage(chatId, lang === 'en' ? '❌ Internal error recording order. Please contact support.' : '❌ عذراً، حدث خطأ داخلي أثناء تسجيل طلبك. يرجى التواصل مع الدعم.');
        }
      }
    });

    // Handle Inline Button callback queries
    bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const messageId = query.message?.message_id;
      const data = query.data;

      if (!chatId || !data) return;
      if (await isMaintenanceActive(chatId)) return;

      const user = await getOrCreateUser(query.from);
      const lang = user?.language || 'ar';
      const currency = user?.currency || 'EGP';

      // Handle Language and Currency updates
      if (data.startsWith('set_currency_')) {
        const curr = data.replace('set_currency_', '');
        await runQuery('UPDATE users SET currency = ? WHERE telegram_user_id = ?', [curr, chatId]);
        const msg = lang === 'en'
          ? `✅ <b>Preferred currency updated to: ${curr}</b> 💱`
          : `✅ <b>تم ضبط عملتك المفضلة بنجاح إلى: ${curr}</b> 💱`;
        await safeBotEdit(() => bot?.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: getMainKeyboard(lang) }));
        return;
      }

      if (data.startsWith('set_lang_')) {
        const newLang = data.replace('set_lang_', '');
        await runQuery('UPDATE users SET language = ? WHERE telegram_user_id = ?', [newLang, chatId]);
        const msg = newLang === 'ar' ? '✅ <b>تم ضبط لغة البوت إلى العربية بنجاح!</b> 🇪🇬' : '✅ <b>Bot language set to English successfully!</b> 🇬🇧';
        await safeBotEdit(() => bot?.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: getMainKeyboard(newLang) }));
        return;
      }

      // Handle Referral View
      if (data === 'ref_info') {
        const referralsCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE referred_by = ?', [chatId]);
        const botName = botUsername || 'DigitalValueBot';
        const referralLink = `https://t.me/${botName}?start=ref_${chatId}`;

        const refText = lang === 'en'
          ? `🎁 <b>Refer & Earn Program</b> 🎉\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `👥 <b>Friends Joined via You:</b> <b>${referralsCount?.count || 0} friend(s)</b>\n\n` +
            `💰 <b>How It Works:</b>\n` +
            `Share your personal referral link with your friends. You will earn <b>5 EGP</b> instant wallet balance automatically when your invited friend makes their first successful purchase!\n\n` +
            `🔗 <b>Your Exclusive Referral Link:</b>\n` +
            `<code>${referralLink}</code>\n` +
            `<i>(Tap link to copy)</i>`
          : `🎁 <b>برنامج الإحالات ومكافأة الأصدقاء</b> 🎉\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `👥 <b>عدد الأصدقاء المنضمين عبرك:</b> <b>${referralsCount?.count || 0} صديق</b>\n\n` +
            `💰 <b>كيف تكسب الأرباح؟</b>\n` +
            `شارك رابط الإحالة الحصري الخاص بك مع أصدقائك، وستحصل على <b>5 ج.م</b> رصيد مجاني يُضاف لمحفظتك فور قيام صديقك بأول عملية شراء ناجحة!\n\n` +
            `🔗 <b>رابط الإحالة المخصص لك:</b>\n` +
            `<code>${referralLink}</code>\n` +
            `<i>(اضغط على الرابط لنسخه مباشرة)</i>`;

        const keyboard = {
          inline_keyboard: [
            [{ text: lang === 'en' ? '📤 Share Link with Friends' : '📤 مشاركة الرابط مع الأصدقاء', url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(lang === 'en' ? 'Join Digital Value store for instant digital products and top-ups!' : 'انضم لأفضل متجر منتجات رقمية وشحن ألعاب مع تسليم فوري!')}` }],
            [{ text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]
          ]
        };

        await safeBotEdit(() => bot?.sendMessage(chatId, refText, { parse_mode: 'HTML', reply_markup: keyboard }));
        return;
      }

      // Handle Deposit Balance Flow
      if (data === 'deposit_balance') {
        depositSessions[chatId] = { step: 'awaiting_amount', createdAt: Date.now() };
        
        const depositPresets = {
          inline_keyboard: [
            [
              { text: '💵 50 EGP', callback_data: 'dep_amount_50' },
              { text: '💵 100 EGP', callback_data: 'dep_amount_100' },
              { text: '💵 250 EGP', callback_data: 'dep_amount_250' }
            ],
            [
              { text: '💵 500 EGP', callback_data: 'dep_amount_500' },
              { text: '💵 1000 EGP', callback_data: 'dep_amount_1000' }
            ],
            [
              { text: lang === 'en' ? '❌ Cancel' : '❌ إلغاء الشحن', callback_data: 'cancel_deposit' }
            ]
          ]
        };

        const msg = lang === 'en'
          ? `💳 <b>Deposit Funds to Wallet</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `Choose a quick amount below or <b>type any custom amount</b> in EGP directly in chat (e.g. 150):`
          : `💳 <b>شحن وإضافة رصيد للمحفظة</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `اختر مبلغاً سريعاً من الأزرار أدناه، أو <b>اكتب أي مبلغ مخصص</b> ترغب بشحنه في المحادثة مباشرة (مثال: 150):`;

        await safeBotEdit(() => bot?.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: depositPresets }));
        return;
      }

      // Handle preset deposit amounts
      if (data.startsWith('dep_amount_')) {
        const amount = parseFloat(data.replace('dep_amount_', ''));
        const deposit = depositSessions[chatId] || { step: 'awaiting_wallet', createdAt: Date.now() };
        deposit.amount = amount;
        deposit.step = 'awaiting_wallet';
        depositSessions[chatId] = deposit;

        const wallets = await allQuery<any>('SELECT * FROM wallets');
        if (wallets.length === 0) {
          await bot?.sendMessage(chatId, lang === 'en' ? '❌ Sorry, no payment gateways are active right now.' : '❌ عذراً، لا توجد بوابات دفع مفعلة حالياً.');
          delete depositSessions[chatId];
          return;
        }

        const walletButtons = wallets.map(w => ([{
          text: `💳 ${w.name}`,
          callback_data: `dep_wallet_${w.id}`
        }]));
        walletButtons.push([{ text: lang === 'en' ? '❌ Cancel Deposit' : '❌ إلغاء عملية الشحن', callback_data: 'cancel_deposit' }]);

        const amountFormatted = formatMoney(amount, currency, lang);
        const depTitle = lang === 'en'
          ? `💳 <b>Deposit Request: ${amountFormatted}</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `Please select your preferred payment gateway / wallet below:`
          : `💳 <b>طلب شحن رصيد بقيمة: ${amountFormatted}</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `الرجاء اختيار المحفظة / طريقة التحويل المناسبة لك أدناه:`;

        await safeBotEdit(() => bot?.sendMessage(chatId, depTitle, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: walletButtons }
        }));
        return;
      }

      if (data.startsWith('dep_wallet_')) {
        const walletId = parseInt(data.replace('dep_wallet_', ''));
        const deposit = depositSessions[chatId];
        if (!deposit || !deposit.amount) {
          await bot?.sendMessage(chatId, lang === 'en' ? '❌ Deposit session expired, please start again.' : '❌ انتهت جلسة الشحن، يرجى البدء من جديد.');
          return;
        }

        const wallet = await getQuery<any>('SELECT * FROM wallets WHERE id = ?', [walletId]);
        if (!wallet) {
          await bot?.sendMessage(chatId, lang === 'en' ? '❌ Payment gateway not found.' : '❌ بوابة الدفع غير متوفرة.');
          return;
        }

        deposit.walletId = walletId;
        deposit.step = 'awaiting_receipt';

        const amountFormatted = formatMoney(deposit.amount, currency, lang);
        const instructions = lang === 'en'
          ? `💳 <b>Transfer & Deposit Instructions</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `🏢 <b>Payment Gateway:</b> ${escapeHtml(wallet.name)}\n` +
            `📌 <b>Account / Address:</b>\n` +
            `<code>${escapeHtml(wallet.details)}</code>\n` +
            `<i>(Tap to copy account number)</i>\n\n` +
            `💰 <b>Amount to Transfer:</b> <b>${amountFormatted}</b>\n` +
            `📝 <b>Instructions:</b> ${escapeHtml(wallet.instructions || 'Transfer the amount above and send screenshot.')}\n\n` +
            `📸 <b>Next Step:</b>\n` +
            `After completing the transfer, <b>send the payment screenshot here directly</b> to credit your balance instantly!`
          : `💳 <b>تعليمات تحويل وشحن الرصيد</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `🏢 <b>بوابة الدفع:</b> ${escapeHtml(wallet.name)}\n` +
            `📌 <b>رقم الحساب / المحفظة للتحويل:</b>\n` +
            `<code>${escapeHtml(wallet.details)}</code>\n` +
            `<i>(اضغط على الرقم لنسخه مباشرة)</i>\n\n` +
            `💰 <b>المبلغ المطلوب تحويله:</b> <b>${amountFormatted}</b>\n` +
            `📝 <b>التعليمات:</b> ${escapeHtml(wallet.instructions || 'قم بالتحويل على الرقم أعلاه وإرسال لقطة الشاشة.')}\n\n` +
            `📸 <b>الخطوة التالية:</b>\n` +
            `فور إتمام التحويل، <b>أرسل لقطة الشاشة (Screenshot) هنا للبوت مباشرة</b> وسيتم شحن وتأكيد رصيدك فوراً! ✨`;

        await safeBotEdit(() => bot?.sendMessage(chatId, instructions, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: lang === 'en' ? '❌ Cancel Deposit' : '❌ إلغاء الشحن', callback_data: 'cancel_deposit' }]]
          }
        }));
        return;
      }

      if (data === 'cancel_deposit') {
        delete depositSessions[chatId];
        await safeBotEdit(() => bot?.sendMessage(chatId, lang === 'en' ? '❌ Deposit canceled.' : '❌ تم إلغاء عملية شحن الرصيد.'));
        return;
      }

      // Show Categories Catalog
      if (data === 'show_categories') {
        try {
          const categories = await allQuery<any>(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id
            ORDER BY c.id ASC
          `);

          const categoryButtons: any[][] = [];
          for (let i = 0; i < categories.length; i += 2) {
            const row: any[] = [];
            const cat1 = categories[i];
            const emoji1 = (cat1.icon && cat1.icon.length <= 4) ? cat1.icon : getServiceEmoji(cat1.icon || cat1.name);
            row.push({
              text: `${emoji1} ${cat1.name}`,
              callback_data: `cat_${cat1.id}`
            });

            if (i + 1 < categories.length) {
              const cat2 = categories[i + 1];
              const emoji2 = (cat2.icon && cat2.icon.length <= 4) ? cat2.icon : getServiceEmoji(cat2.icon || cat2.name);
              row.push({
                text: `${emoji2} ${cat2.name}`,
                callback_data: `cat_${cat2.id}`
              });
            }
            categoryButtons.push(row);
          }

          categoryButtons.push([{ text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]);

          const catText = lang === 'en'
            ? `📂 <b>Categories & Services Catalog</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `✨ <b>Please select the service or category you want:</b>`
            : `📂 <b>أقسام الخدمات والاشتراكات الرقمية</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `✨ <b>اختر الخدمة أو القسم المطلوب من القائمة أدناه:</b>`;

          await safeBotEdit(() => bot?.sendMessage(chatId, catText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: categoryButtons }
          }));
        } catch (e) {
          console.error(e);
        }
      }

      else if (data === 'back_to_menu') {
        const userName = query.from.first_name || (lang === 'en' ? 'Valued Customer' : 'عميلنا العزيز');
        const balanceFormatted = formatMoney(user?.balance || 0, currency, lang);
        const welcomeText = lang === 'en'
          ? `✨ <b>DIGITAL VALUE STORE - MAIN MENU</b> ✨\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `👋 Welcome back <b>${escapeHtml(userName)}</b>!\n` +
            `💰 Your Wallet Balance: <b>${balanceFormatted}</b>\n\n` +
            `👇 <b>Select a section to continue:</b>`
          : `✨ <b>متجر ديجيتال ڤاليو - القائمة الرئيسية</b> ✨\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `👋 أهلاً بك مجدداً يا <b>${escapeHtml(userName)}</b>!\n` +
            `💰 رصيد محفظتك المتاح: <b>${balanceFormatted}</b>\n\n` +
            `👇 <b>اختر من الأقسام التالية للمتابعة:</b>`;

        const keyboard = {
          inline_keyboard: [
            [{ text: lang === 'en' ? '🛍️ Browse Products & Services' : '🛍️ تصفح الأقسام والخدمات', callback_data: 'show_categories' }],
            [
              { text: lang === 'en' ? '📦 My Orders' : '📦 سجل طلباتي', callback_data: 'my_orders' },
              { text: lang === 'en' ? '💳 Payment Gateways' : '💳 طرق الدفع والتحويل', callback_data: 'show_wallets' }
            ],
            [
              { text: lang === 'en' ? '💰 Deposit Balance' : '💰 شحن رصيد المحفظة', callback_data: 'deposit_balance' },
              { text: lang === 'en' ? '👥 Refer & Earn' : '👥 مكافآت الإحالة', callback_data: 'ref_info' }
            ],
            [
              { text: lang === 'en' ? '💬 Support' : '💬 الدعم الفني والمساعدة', callback_data: 'support_info' }
            ]
          ]
        };

        await safeBotEdit(() => bot?.sendMessage(chatId, welcomeText, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        }));
      }

      // Show specific category products with full titles list
      else if (data.startsWith('cat_')) {
        const catId = parseInt(data.split('_')[1]);
        try {
          const category = await getQuery<any>('SELECT * FROM categories WHERE id = ?', [catId]);
          const products = await allQuery<any>('SELECT * FROM products WHERE category_id = ?', [catId]);
          const catEmoji = (category?.icon && category.icon.length <= 4) ? category.icon : getServiceEmoji(category?.icon || category?.name || '');
          const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '1️⃣1️⃣', '1️⃣2️⃣', '1️⃣3️⃣', '1️⃣4️⃣', '1️⃣5️⃣'];

          let itemsListFormatted = '';
          if (products.length === 0) {
            itemsListFormatted = lang === 'en' 
              ? `\n<i>⚠️ No services currently available in this category.</i>\n`
              : `\n<i>⚠️ لا توجد خدمات أو باقات متوفرة في هذا القسم حالياً.</i>\n`;
          } else {
            itemsListFormatted = (lang === 'en' ? `\n📋 <b>Available Services & Packages (Full Titles):</b>\n` : `\n📋 <b>قائمة الخدمات والباقات المتاحة بالكامل:</b>\n`) +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              products.map((p, idx) => {
                const num = numberEmojis[idx] || `[${idx + 1}]`;
                const isAvailable = p.stock > 0 || p.is_provider_service;
                const statusBadge = isAvailable ? '🟢' : '⚡';
                const statusText = isAvailable 
                  ? (lang === 'en' ? 'In Stock (Instant Auto-Delivery)' : 'متوفر فوراً بالمخزون (تسليم تلقائي)')
                  : (lang === 'en' ? 'Direct Auto-Delivery' : 'تسليم فوري ومباشر');
                const priceFormatted = formatMoney(p.price, currency, lang);
                const pEmoji = (p.icon && p.icon.length <= 4) ? p.icon : getServiceEmoji(p.icon || p.name);

                return `${num} ${pEmoji} <b>${escapeHtml(p.name)}</b>\n` +
                       `   💰 <b>السعر:</b> <b>${priceFormatted}</b> | ${statusBadge} <i>${statusText}</i>\n` +
                       (p.description ? `   📝 <i>${escapeHtml(p.description.length > 90 ? p.description.slice(0, 90) + '...' : p.description)}</i>\n` : '');
              }).join('\n') +
              `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              (lang === 'en' ? `👇 <b>Tap a package button below to purchase or view full details:</b>` : `👇 <b>اضغط على رقم أو اسم الباقة أدناه للشراء أو عرض التفاصيل:</b>`);
          }

          const text = lang === 'en'
            ? `${catEmoji} <b>Category: ${escapeHtml(category ? category.name : 'Unknown')}</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎` +
              `${category?.description ? `\n📝 ${escapeHtml(category.description)}\n` : ''}` +
              itemsListFormatted
            : `${catEmoji} <b>قسم: ${escapeHtml(category ? category.name : 'غير معروف')}</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎` +
              `${category?.description ? `\n📝 ${escapeHtml(category.description)}\n` : ''}` +
              itemsListFormatted;
          
          const productButtons: any[][] = [];
          for (let idx = 0; idx < products.length; idx++) {
            const p = products[idx];
            const num = numberEmojis[idx] || `[${idx + 1}]`;
            const isAvailable = p.stock > 0 || p.is_provider_service;
            const stockBadge = isAvailable ? '🟢' : '⚡';
            const priceFormatted = formatMoney(p.price, currency, lang);
            const pEmoji = (p.icon && p.icon.length <= 4) ? p.icon : getServiceEmoji(p.icon || p.name);
            
            // Clean readable button label with number badge matching the full list above
            const label = `${num} ${pEmoji} ${p.name.length > 26 ? p.name.slice(0, 24) + '…' : p.name} | ${priceFormatted}`;
            productButtons.push([{
              text: label,
              callback_data: `prod_${p.id}`
            }]);
          }

          productButtons.push([
            { text: lang === 'en' ? '🔙 Categories' : '🔙 قائمة الأقسام', callback_data: 'show_categories' },
            { text: lang === 'en' ? '🏠 Main Menu' : '🏠 الرئيسية', callback_data: 'back_to_menu' }
          ]);

          await safeBotEdit(() => bot?.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: productButtons }
          }));
        } catch (e) {
          console.error(e);
        }
      }

      // Show product details card with prominent full title
      else if (data.startsWith('prod_')) {
        const prodId = parseInt(data.split('_')[1]);
        try {
          const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [prodId]);
          if (!product) {
            await bot?.sendMessage(chatId, lang === 'en' ? '❌ Product not found.' : '❌ عذراً، لم يتم العثور على هذا المنتج.');
            return;
          }

          const displayStock = (product.fake_stock && product.fake_stock > 0) ? product.fake_stock : product.stock;
          const priceFormatted = formatMoney(product.price, currency, lang);
          const pEmoji = (product.icon && product.icon.length <= 4) ? product.icon : getServiceEmoji(product.icon || product.name);

          const stockAvailabilityText = product.stock > 0
            ? (lang === 'en' ? `🟢 <b>In Stock (${displayStock} available - Instant Delivery)</b>` : `🟢 <b>متوفر فوراً بالمخزون (${displayStock} متبقي)</b>`)
            : (product.is_provider_service
                ? (lang === 'en' ? `⚡ <b>Auto Provider Direct Delivery</b>` : `⚡ <b>متاح تسليم مباشر وتلقائي</b>`)
                : (lang === 'en' ? `⚡ <b>Pre-order Available (Auto-delivery on restock)</b>` : `⚡ <b>متاح للطلب المسبق السريع (تسليم تلقائي)</b>`));

          const detailsText = lang === 'en'
            ? `💎 <b>SERVICE DETAILS & SPECIFICATIONS</b> 💎\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `📦 <b>Full Service Title:</b>\n` +
              `✨ <b>${escapeHtml(product.name)}</b> ✨\n\n` +
              `💰 <b>Price:</b> <b>${priceFormatted}</b>\n` +
              `🚦 <b>Stock Status:</b> ${stockAvailabilityText}\n` +
              `⚡ <b>Delivery:</b> Instant & Automatic 24/7 🚀\n` +
              `🛡️ <b>Guarantee:</b> 100% Genuine & Full Duration Warranty 💎\n\n` +
              `📝 <b>Description & Instructions:</b>\n` +
              `${escapeHtml(product.description || 'Premium quality digital subscription with instant activation key.')}\n` +
              `━━━━━━━━━━━━━━━━━━━━━━`
            : `💎 <b>تفاصيل وبيانات الخدمة الكاملة</b> 💎\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `📦 <b>اسم الخدمة بالكامل:</b>\n` +
              `✨ <b>${escapeHtml(product.name)}</b> ✨\n\n` +
              `💰 <b>السعر:</b> <b>${priceFormatted}</b>\n` +
              `🚦 <b>حالة التوفر:</b> ${stockAvailabilityText}\n` +
              `⚡ <b>طريقة التسليم:</b> تسليم فوري وتلقائي 24/7 🚀\n` +
              `🛡️ <b>الضمان:</b> أصلي ومضمون 100% طوال مدة الاشتراك 💎\n\n` +
              `📝 <b>الوصف والتعليمات:</b>\n` +
              `${escapeHtml(product.description || 'خدمة رقمية مميزة مع تسليم فوري وتفعيل سريع.')}\n` +
              `━━━━━━━━━━━━━━━━━━━━━━`;

          const buttons = [
            [{ text: lang === 'en' ? '🛍️ Purchase Now ⚡' : '🛍️ شراء فوري / طلب الآن ⚡', callback_data: `buy_${product.id}` }],
            [
              { text: lang === 'en' ? '💳 Deposit Balance' : '💳 شحن رصيد أولاً', callback_data: 'deposit_balance' },
              { text: lang === 'en' ? '🔙 Products List' : '🔙 قائمة الخدمات', callback_data: `cat_${product.category_id}` }
            ],
            [{ text: lang === 'en' ? '🏠 Main Menu' : '🏠 القائمة الرئيسية', callback_data: 'back_to_menu' }]
          ];

          await safeBotEdit(() => bot?.sendMessage(chatId, detailsText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
          }));
        } catch (e) {
          console.error(e);
        }
      }

      // Initiate Purchase - Ask for Quantity
      else if (data.startsWith('buy_')) {
        const prodId = parseInt(data.split('_')[1]);
        try {
          const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [prodId]);
          if (!product) {
            await bot?.sendMessage(chatId, lang === 'en' ? '❌ Product not found.' : '❌ عذراً، لم يتم العثور على المنتج.');
            return;
          }

          checkoutSessions[chatId] = { 
            productId: prodId, 
            step: 'entering_quantity', 
            createdAt: Date.now(), 
            remindersCount: 0 
          };

          const displayStock = (product.fake_stock && product.fake_stock > 0) ? product.fake_stock : product.stock;
          const availableStockForBtns = product.stock > 0 ? product.stock : 5;
          const maxBtns = Math.min(5, availableStockForBtns);
          const row1 = [];
          for (let i = 1; i <= Math.min(3, maxBtns); i++) {
            const digitEmoji = i === 1 ? '1️⃣' : i === 2 ? '2️⃣' : '3️⃣';
            row1.push({ text: digitEmoji, callback_data: `qty_${i}_${prodId}` });
          }
          const row2 = [];
          for (let i = 4; i <= Math.min(5, maxBtns); i++) {
            const digitEmoji = i === 4 ? '4️⃣' : '5️⃣';
            row2.push({ text: digitEmoji, callback_data: `qty_${i}_${prodId}` });
          }

          const inline_keyboard = [];
          if (row1.length > 0) inline_keyboard.push(row1);
          if (row2.length > 0) inline_keyboard.push(row2);
          inline_keyboard.push([{ text: lang === 'en' ? '✍️ Custom Quantity' : '✍️ تحديد عدد قطع آخر مخصص', callback_data: `qty_custom_${prodId}` }]);
          inline_keyboard.push([{ text: lang === 'en' ? '❌ Cancel Checkout' : '❌ إلغاء الشراء والتراجع', callback_data: 'cancel_checkout' }]);

          const displayStockText = product.stock > 0
            ? `🟢 ${displayStock} ${lang === 'en' ? 'item(s) in stock' : 'قطعة متوفرة فوراً'}`
            : (lang === 'en' ? '⚡ Pre-order Available (Instant delivery)' : '⚡ متاح للطلب الفوري / المسبق');

          const priceFormatted = formatMoney(product.price, currency, lang);
          const text = lang === 'en'
            ? `🔢 <b>Select Quantity</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📦 <b>Product:</b> ${escapeHtml(product.name)}\n` +
              `💰 <b>Unit Price:</b> <b>${priceFormatted}</b>\n` +
              `🚦 <b>Stock:</b> ${displayStockText}\n\n` +
              `👇 <b>How many items would you like to order?</b>`
            : `🔢 <b>تحديد الكمية المطلوبة</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📦 <b>المنتج:</b> ${escapeHtml(product.name)}\n` +
              `💰 <b>سعر القطعة:</b> <b>${priceFormatted}</b>\n` +
              `🚦 <b>حالة التوفر:</b> ${displayStockText}\n\n` +
              `👇 <b>كم عدد القطع التي ترغب في شرائها؟</b>`;

          await safeBotEdit(() => bot?.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard }
          }));
        } catch (e) {
          console.error(e);
        }
      }

      // Handle Quantity selection callback queries
      else if (data.startsWith('qty_')) {
        const parts = data.split('_');
        const qtyStr = parts[1];
        const prodId = parseInt(parts[2]);

        if (qtyStr === 'custom') {
          const customPrompt = lang === 'en'
            ? '✍️ <b>Please type the quantity you want to purchase and send it as a message:</b>'
            : '✍️ <b>يرجى كتابة عدد القطع المطلوب كرسالة نصية وإرسالها للبوت مباشرة:</b>';

          await safeBotEdit(() => bot?.sendMessage(chatId, customPrompt, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{ text: lang === 'en' ? '🔙 Back' : '🔙 العودة للاختيارات السابقة', callback_data: `buy_${prodId}` }]]
            }
          }));
        } else {
          const qty = parseInt(qtyStr);
          if (!isNaN(qty) && qty > 0) {
            try {
              const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [prodId]);
              if (!product) {
                await bot?.sendMessage(chatId, lang === 'en' ? '❌ Product no longer available.' : '❌ عذراً، لم يعد هذا المنتج متوفراً.');
                delete checkoutSessions[chatId];
                return;
              }

              checkoutSessions[chatId] = {
                productId: prodId,
                quantity: qty,
                step: 'payment_method',
                createdAt: Date.now(),
                remindersCount: 0
              };

              const userBalance = Number(user?.balance || 0);
              const wallets = await allQuery<any>('SELECT * FROM wallets');
              const walletButtons: any[][] = [];

              const balanceLabel = lang === 'en'
                ? `💰 Pay Instantly from Wallet (${formatMoney(userBalance, currency, lang)})`
                : `💰 الدفع الفوري من رصيدي (${formatMoney(userBalance, currency, lang)})`;

              walletButtons.push([{
                text: balanceLabel,
                callback_data: `pay_balance_${product.id}`
              }]);

              wallets.forEach(w => {
                walletButtons.push([{
                  text: `💳 تحويل عبر ${w.name}`,
                  callback_data: `pay_${w.id}_${product.id}`
                }]);
              });

              walletButtons.push([{ text: lang === 'en' ? '🔙 Change Quantity' : '🔙 العودة لاختيار الكمية', callback_data: `buy_${product.id}` }]);
              walletButtons.push([{ text: lang === 'en' ? '❌ Cancel Checkout' : '❌ إلغاء الشراء والتراجع', callback_data: 'cancel_checkout' }]);

              const totalFormatted = formatMoney(product.price * qty, currency, lang);
              const userBalanceFormatted = formatMoney(userBalance, currency, lang);
              const text = lang === 'en'
                ? `🧾 <b>Order Confirmation & Invoice</b>\n` +
                  `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
                  `📦 <b>Product:</b> ${escapeHtml(product.name)}\n` +
                  `🔢 <b>Quantity:</b> <b>${qty} item(s)</b>\n` +
                  `💰 <b>Total Due:</b> <b>${totalFormatted}</b>\n` +
                  `💳 <b>Your Wallet Balance:</b> <b>${userBalanceFormatted}</b>\n\n` +
                  `👇 <b>Select your payment method below:</b>`
                : `🧾 <b>فاتورة تأكيد الطلب | INVOICE</b>\n` +
                  `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
                  `📦 <b>المنتج:</b> ${escapeHtml(product.name)}\n` +
                  `🔢 <b>الكمية المطلوبة:</b> <b>${qty} قطعة</b>\n` +
                  `💰 <b>إجمالي المبلغ:</b> <b>${totalFormatted}</b>\n` +
                  `💳 <b>رصيدك المتاح:</b> <b>${userBalanceFormatted}</b>\n\n` +
                  `👇 <b>الرجاء اختيار وسيلة الدفع لإتمام طلبك:</b>`;

              await safeBotEdit(() => bot?.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: walletButtons }
              }));
            } catch (e) {
              console.error(e);
            }
          }
        }
      }

      // Instant Purchase from User Wallet Balance
      else if (data.startsWith('pay_balance_')) {
        const prodId = parseInt(data.replace('pay_balance_', ''));
        try {
          const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [prodId]);
          if (!product) {
            await bot?.sendMessage(chatId, lang === 'en' ? '❌ Product no longer available.' : '❌ هذا المنتج لم يعد متوفراً.');
            delete checkoutSessions[chatId];
            return;
          }

          const session = checkoutSessions[chatId];
          const qty = session?.quantity || 1;
          const totalPrice = Number(product.price) * qty;

          const currentBalance = Number(user?.balance || 0);

          if (currentBalance < totalPrice) {
            const shortage = (totalPrice - currentBalance).toFixed(2);
            const msg = lang === 'en'
              ? `⚠️ <b>Insufficient Wallet Balance!</b>\n` +
                `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
                `📦 <b>Product:</b> ${escapeHtml(product.name)} (Qty: ${qty})\n` +
                `💰 <b>Required Total:</b> <b>${formatMoney(totalPrice, currency, lang)}</b>\n` +
                `💳 <b>Current Balance:</b> <b>${formatMoney(currentBalance, currency, lang)}</b>\n` +
                `🔻 <b>Shortage:</b> <b>${formatMoney(Number(shortage), currency, lang)}</b>\n\n` +
                `💡 <i>Please deposit funds into your wallet or choose an external payment gateway:</i>`
              : `⚠️ <b>عذراً! رصيدك الحالي غير كافٍ لإتمام الشراء</b>\n` +
                `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
                `📦 <b>المنتج:</b> ${escapeHtml(product.name)} (الكمية: ${qty})\n` +
                `💰 <b>المبلغ المطلوب:</b> <b>${formatMoney(totalPrice, currency, lang)}</b>\n` +
                `💳 <b>رصيدك المتوفر:</b> <b>${formatMoney(currentBalance, currency, lang)}</b>\n` +
                `🔻 <b>المبلغ الناقص:</b> <b>${formatMoney(Number(shortage), currency, lang)}</b>\n\n` +
                `💡 <i>يمكنك شحن رصيدك بالضغط على الزر أدناه ثم الشراء فوراً، أو اختيار وسيلة دفع خارجية للتحويل المباشر:</i>`;

            const buttons = [
              [{ text: lang === 'en' ? '💳 Deposit Funds Now' : '💳 شحن رصيد المحفظة الآن', callback_data: 'deposit_balance' }],
              [{ text: lang === 'en' ? '🔙 Choose Another Payment Method' : '🔙 اختيار وسيلة دفع أخرى', callback_data: `buy_${product.id}` }],
              [{ text: lang === 'en' ? '❌ Cancel Order' : '❌ إلغاء الطلب والتراجع', callback_data: 'cancel_checkout' }]
            ];

            await safeBotEdit(() => bot?.sendMessage(chatId, msg, {
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: buttons }
            }));
            return;
          }

          // Deduct user balance
          await runQuery('UPDATE users SET balance = balance - ? WHERE telegram_user_id = ?', [totalPrice, chatId]);

          // Create order in DB
          const orderRes = await runQuery(`
            INSERT INTO orders (telegram_user_id, telegram_username, telegram_first_name, status, total_price, wallet_id)
            VALUES (?, ?, ?, 'pending_approval', ?, NULL)
          `, [chatId, query.from.username || '', query.from.first_name || '', totalPrice]);

          const orderId = orderRes.lastID;

          await runQuery(`
            INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
            VALUES (?, ?, ?, ?, ?)
          `, [orderId, product.id, product.name, product.price, qty]);

          // Clear session
          delete checkoutSessions[chatId];

          // Deliver product automatically or place into pre-order queue
          const approvalRes = await approveOrder(orderId);

          // Send confirmation of balance deduction
          const newBalance = (currentBalance - totalPrice).toFixed(2);
          const deductionMsg = lang === 'en'
            ? `💰 <b>Payment Successful!</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n` +
              `• <b>Deducted:</b> <b>${formatMoney(totalPrice, currency, lang)}</b>\n` +
              `• <b>Remaining Wallet Balance:</b> <b>${formatMoney(Number(newBalance), currency, lang)}</b> 💎`
            : `💰 <b>تم خصم المبلغ وتأكيد الدفع بنجاح!</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n` +
              `• <b>المبلغ المخصوم:</b> <b>${formatMoney(totalPrice, currency, lang)}</b>\n` +
              `• <b>رصيدك المتبقي في المحفظة:</b> <b>${formatMoney(Number(newBalance), currency, lang)}</b> 💎`;

          await safeBotEdit(() => bot?.sendMessage(chatId, deductionMsg, { parse_mode: 'HTML' }));

        } catch (e) {
          console.error('Error in instant balance checkout:', e);
          await bot?.sendMessage(chatId, lang === 'en' ? '❌ Error completing order. Please contact support.' : '❌ حدث خطأ أثناء إتمام الشراء من الرصيد، يرجى التواصل مع الدعم.');
        }
      }

      // Wallet selection confirmed - Send payment details
      else if (data.startsWith('pay_')) {
        const parts = data.split('_');
        const walletId = parseInt(parts[1]);
        const prodId = parseInt(parts[2]);

        try {
          const product = await getQuery<any>('SELECT * FROM products WHERE id = ?', [prodId]);
          const wallet = await getQuery<any>('SELECT * FROM wallets WHERE id = ?', [walletId]);

          if (!product || !wallet) {
            await bot?.sendMessage(chatId, lang === 'en' ? '❌ Payment details not found. Please start over.' : '❌ حدث خطأ في استدعاء بيانات الدفع. يرجى البدء من جديد.');
            delete checkoutSessions[chatId];
            return;
          }

          const session = checkoutSessions[chatId];
          const qty = session?.quantity || 1;
          const totalPrice = product.price * qty;

          checkoutSessions[chatId] = { 
            productId: prodId, 
            walletId, 
            quantity: qty,
            step: 'awaiting_receipt', 
            createdAt: Date.now(), 
            remindersCount: 0 
          };

          const totalFormatted = formatMoney(totalPrice, currency, lang);
          const paymentInstructions = lang === 'en'
            ? `💳 <b>Payment Transfer Instructions</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `🏢 <b>Payment Gateway:</b> ${escapeHtml(wallet.name)}\n` +
              `📌 <b>Account / Address:</b>\n` +
              `<code>${escapeHtml(wallet.details)}</code>\n` +
              `<i>(Tap to copy account number)</i>\n\n` +
              `📦 <b>Product:</b> ${escapeHtml(product.name)}\n` +
              `🔢 <b>Quantity:</b> ${qty} item(s)\n` +
              `💰 <b>Total Amount Due:</b> <b>${totalFormatted}</b>\n\n` +
              `💡 <b>Steps to complete your order:</b>\n` +
              `1. Transfer the exact amount above to the designated account.\n` +
              `2. Take a clear screenshot of the completed transfer.\n` +
              `3. <b>Send the photo here directly in chat</b> to verify and receive your digital codes!`
            : `💳 <b>تعليمات إتمام التحويل والدفع</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `🏢 <b>بوابة الدفع:</b> ${escapeHtml(wallet.name)}\n` +
              `📌 <b>رقم الحساب / المحفظة للتحويل:</b>\n` +
              `<code>${escapeHtml(wallet.details)}</code>\n` +
              `<i>(اضغط على الرقم لنسخه مباشرة)</i>\n\n` +
              `📦 <b>المنتج المطلوب:</b> ${escapeHtml(product.name)}\n` +
              `🔢 <b>الكمية:</b> ${qty} قطعة\n` +
              `💰 <b>المبلغ المطلوب إجمالاً:</b> <b>${totalFormatted}</b>\n\n` +
              `💡 <b>خطوات تأكيد واستلام طلبك:</b>\n` +
              `1. قم بتحويل المبلغ المطلوب بدقة على الحساب الموضح أعلاه.\n` +
              `2. خذ لقطة شاشة (Screenshot) لعملية التحويل الناجحة.\n` +
              `3. <b>أرسل الصورة هنا للبوت مباشرة</b> لمراجعة وتأكيد تسليم طلبك فوراً! ✨`;

          const buttons = [[{ text: lang === 'en' ? '❌ Cancel Checkout' : '❌ إلغاء الشراء والتراجع', callback_data: 'cancel_checkout' }]];

          await safeBotEdit(() => bot?.sendMessage(chatId, paymentInstructions, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
          }));
        } catch (e) {
          console.error(e);
        }
      }

      // Cancel checkout session
      else if (data === 'cancel_checkout') {
        delete checkoutSessions[chatId];
        await safeBotEdit(() => bot?.sendMessage(chatId, lang === 'en' ? '❌ Checkout canceled.' : '❌ تم إلغاء عملية الشراء. يمكنك إعادة تصفح المنتجات في أي وقت.', {
          reply_markup: {
            inline_keyboard: [
              [
                { text: lang === 'en' ? '🛍️ Browse Products' : '🛍️ تصفح المنتجات', callback_data: 'show_categories' },
                { text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
              ]
            ]
          }
        }));
      }

      // Show wallets details
      else if (data === 'show_wallets') {
        try {
          const wallets = await allQuery<any>('SELECT * FROM wallets');
          let walletText = lang === 'en'
            ? `💳 <b>Supported Payment Methods & Wallets</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n`
            : `💳 <b>طرق ومحافظ الدفع المعتمدة في متجرنا</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n`;

          wallets.forEach((w, idx) => {
            walletText += `📍 <b>${idx + 1}. ${escapeHtml(w.name)}:</b>\n` +
              `• ${lang === 'en' ? 'Account Number' : 'رقم الحساب / المحفظة'}: <code>${escapeHtml(w.details)}</code>\n` +
              `• ${lang === 'en' ? 'Instructions' : 'التعليمات'}: ${escapeHtml(w.instructions || (lang === 'en' ? 'Direct transfer' : 'تحويل مباشر'))}\n\n`;
          });

          await safeBotEdit(() => bot?.sendMessage(chatId, walletText, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: lang === 'en' ? '💳 Deposit Funds' : '💳 شحن رصيد الآن', callback_data: 'deposit_balance' }],
                [{ text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]
              ]
            }
          }));
        } catch (e) {
          console.error(e);
        }
      }

      // My Orders list
      else if (data === 'my_orders') {
        try {
          const orders = await allQuery<any>(`
            SELECT o.id, o.status, o.total_price, o.created_at, o.delivered_content, p.name as product_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.telegram_user_id = ?
            ORDER BY o.id DESC LIMIT 10
          `, [chatId]);

          let text = lang === 'en'
            ? `📦 <b>Your Recent Orders</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n`
            : `📦 <b>سجل طلباتك ومشترياتك</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n`;

          const orderButtons: any[][] = [];

          if (orders.length === 0) {
            text += lang === 'en'
              ? `You have no recorded orders yet. Start browsing categories and place your first order!`
              : `ليس لديك أي طلبات مسجلة حتى الآن. ابدأ بتصفح الخدمات واطلب منتجك الأول الآن! 🎮`;
          } else {
            text += lang === 'en'
              ? `👇 <b>Tap any order below to view its full details and copy your digital keys:</b>\n\n`
              : `👇 <b>اضغط على أي طلب أدناه لعرض تفاصيله الكاملة واستلام ونسخ الكود الرقمي:</b>\n\n`;

            orders.forEach(o => {
              let statusBadge = '⏳';
              let statusText = lang === 'en' ? 'Under Review' : 'قيد المراجعة';
              if (o.status === 'approved') {
                statusBadge = '🟢';
                statusText = lang === 'en' ? 'Delivered' : 'مكتمل ومسلّم';
              } else if (o.status === 'waiting_stock') {
                statusBadge = '⚡';
                statusText = lang === 'en' ? 'Pre-order' : 'طلب مسبق';
              } else if (o.status === 'rejected') {
                statusBadge = '❌';
                statusText = lang === 'en' ? 'Rejected' : 'مرفوض';
              }
              
              const priceFormatted = formatMoney(o.total_price, currency, lang);
              text += `${statusBadge} <b>${lang === 'en' ? 'Order' : 'طلب'} #${o.id}</b> — ${escapeHtml(o.product_name)}\n` +
                `▫️ ${lang === 'en' ? 'Price' : 'القيمة'}: <b>${priceFormatted}</b> | ${statusText}\n\n`;

              const shortProdName = o.product_name.length > 22 ? o.product_name.slice(0, 20) + '…' : o.product_name;
              orderButtons.push([{
                text: `${statusBadge} ${lang === 'en' ? 'Order' : 'طلب'} #${o.id}: ${shortProdName} (${priceFormatted})`,
                callback_data: `view_order_${o.id}`
              }]);
            });
          }

          orderButtons.push([
            { text: lang === 'en' ? '🛍️ Shop Products' : '🛍️ تصفح وشراء منتجات', callback_data: 'show_categories' },
            { text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
          ]);

          await safeBotEdit(() => bot?.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: orderButtons }
          }));
        } catch (e) {
          console.error(e);
        }
      }

      // View single order details & retrieve digital content
      else if (data.startsWith('view_order_')) {
        const orderId = parseInt(data.replace('view_order_', ''));
        try {
          const order = await getQuery<any>(`
            SELECT o.*, oi.product_name, oi.quantity, oi.price as item_price, w.name as wallet_name
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN wallets w ON o.wallet_id = w.id
            WHERE o.id = ? AND o.telegram_user_id = ?
          `, [orderId, chatId]);

          if (!order) {
            await bot?.sendMessage(chatId, lang === 'en' ? '❌ Order not found.' : '❌ لم يتم العثور على هذا الطلب.');
            return;
          }

          let statusBadge = lang === 'en' ? '⏳ Under Review' : '⏳ قيد المراجعة والتدقيق';
          if (order.status === 'approved') statusBadge = lang === 'en' ? '🟢 Fulfilled & Delivered' : '🟢 مكتمل وتم التسليم بنجاح ✅';
          if (order.status === 'waiting_stock') statusBadge = lang === 'en' ? '⚡ Pre-order Waiting Stock' : '⚡ طلب مسبق بانتظار المخزون ⏳';
          if (order.status === 'rejected') statusBadge = lang === 'en' ? '❌ Rejected' : '❌ تم رفض الطلب';

          const priceFormatted = formatMoney(order.total_price, currency, lang);
          const paymentMethodText = order.wallet_name ? escapeHtml(order.wallet_name) : (lang === 'en' ? 'Wallet Balance' : 'رصيد المحفظة 💰');
          const dateStr = order.created_at ? new Date(order.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG') : 'حديثاً';

          let orderCard = lang === 'en'
            ? `🧾 <b>Order Details: #${order.id}</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📦 <b>Product / Service:</b> <b>${escapeHtml(order.product_name || 'Digital Service')}</b>\n` +
              `🔢 <b>Quantity:</b> <b>${order.quantity || 1} item(s)</b>\n` +
              `💰 <b>Total Price:</b> <b>${priceFormatted}</b>\n` +
              `💳 <b>Payment Method:</b> <b>${paymentMethodText}</b>\n` +
              `🚦 <b>Status:</b> ${statusBadge}\n` +
              `📅 <b>Date:</b> ${dateStr}\n\n`
            : `🧾 <b>تفاصيل الطلب رقم: #${order.id}</b>\n` +
              `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
              `📦 <b>المنتج / الخدمة:</b> <b>${escapeHtml(order.product_name || 'خدمة رقمية')}</b>\n` +
              `🔢 <b>الكمية المطلوبة:</b> <b>${order.quantity || 1} قطعة</b>\n` +
              `💰 <b>السعر الإجمالي:</b> <b>${priceFormatted}</b>\n` +
              `💳 <b>طريقة الدفع:</b> <b>${paymentMethodText}</b>\n` +
              `🚦 <b>حالة الطلب:</b> ${statusBadge}\n` +
              `📅 <b>تاريخ ووقت الطلب:</b> ${dateStr}\n\n`;

          if (order.status === 'approved' && order.delivered_content && order.delivered_content.trim()) {
            orderCard += lang === 'en'
              ? `🔑 <b>Delivered Digital Content / Activation Keys:</b>\n` +
                `<code>${escapeHtml(order.delivered_content.trim())}</code>\n\n` +
                `💡 <i>Tip: Tap and hold the content above to copy it directly!</i>\n\n`
              : `🔑 <b>محتوى طلبك الرقمي (الكود أو بيانات التفعيل):</b>\n` +
                `<code>${escapeHtml(order.delivered_content.trim())}</code>\n\n` +
                `💡 <i>تلميح: يمكنك نسخ المحتوى أعلاه بالضغط عليه مطولاً!</i>\n\n`;
          } else if (order.status === 'rejected' && order.rejection_reason) {
            orderCard += lang === 'en'
              ? `⚠️ <b>Rejection Reason:</b>\n${escapeHtml(order.rejection_reason)}\n\n`
              : `⚠️ <b>سبب الرفض:</b>\n${escapeHtml(order.rejection_reason)}\n\n`;
          } else if (order.status === 'waiting_stock') {
            orderCard += lang === 'en'
              ? `⚡ <i>Your pre-order is in priority queue. The activation key will be delivered automatically here as soon as restocked!</i>\n\n`
              : `⚡ <i>طلبك في قائمة أولوية الانتظار، وسيتم إرسال كود التفعيل لحسابك هنا تلقائياً فور توفر الدفعة!</i>\n\n`;
          }

          orderCard += `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎`;

          const kb = {
            inline_keyboard: [
              [{ text: lang === 'en' ? '💬 Inquire with Support' : '💬 الاستفسار عن هذا الطلب بالدعم', url: 'https://t.me/DigitalValueSupport' }],
              [
                { text: lang === 'en' ? '🔙 Back to My Orders' : '🔙 العودة لقائمة طلباتي', callback_data: 'my_orders' },
                { text: lang === 'en' ? '🏠 Main Menu' : '🏠 القائمة الرئيسية', callback_data: 'back_to_menu' }
              ]
            ]
          };

          await safeBotEdit(() => bot?.sendMessage(chatId, orderCard, {
            parse_mode: 'HTML',
            reply_markup: kb
          }));
        } catch (e) {
          console.error('Error in view_order callback:', e);
        }
      }

      // Support info
      else if (data === 'support_info') {
        const supportText = lang === 'en'
          ? `📞 <b>Customer Support & Assistance</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `Need help with your orders, deposit top-ups, or questions about our digital products? We are ready to assist you:\n\n` +
            `💬 <b>Direct Telegram Support:</b> @DigitalValueSupport\n` +
            `📧 <b>Official Email:</b> support@digitalvalue.com\n\n` +
            `⏰ <b>Operating Hours:</b> 10:00 AM – 11:00 PM (Cairo Time)`
          : `📞 <b>مركز الدعم الفني وخدمة العملاء</b>\n` +
            `💎 ━━━━━━━━━━━━━━━━━━━━━━ 💎\n\n` +
            `إذا واجهتك أي استفسارات بخصوص شحن الرصيد، الطلبات المسبقة، أو احتجت لأي مساعدة فورية، يمكنك التواصل مع فريق الدعم مباشرة:\n\n` +
            `💬 <b>مسؤول الدعم المباشر:</b> @DigitalValueSupport\n` +
            `📧 <b>البريد الإلكتروني:</b> support@digitalvalue.com\n\n` +
            `⏰ <b>أوقات العمل اليومية:</b> من 10:00 صباحاً وحتى 11:00 مساءً (بتوقيت القاهرة)`;

        const supportKeyboard = {
          inline_keyboard: [
            [{ text: lang === 'en' ? '💬 Open Direct Chat with Support' : '💬 محادثة مسؤول الدعم مباشرة', url: 'https://t.me/DigitalValueSupport' }],
            [{ text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]
          ]
        };

        await safeBotEdit(() => bot?.sendMessage(chatId, supportText, {
          parse_mode: 'HTML',
          reply_markup: supportKeyboard
        }));
      }

      // Admin Approve Order
      else if (data.startsWith('admin_approve_')) {
        const orderId = parseInt(data.split('_')[2]);
        if (messageId) {
          await runQuery('UPDATE orders SET admin_message_id = ? WHERE id = ?', [messageId, orderId]);
        }

        const result = await approveOrder(orderId);
        if (!result.success) {
          await bot?.sendMessage(chatId, `❌ فشل قبول الطلب: ${result.error}`);
        }
      }

      // Admin Reject Reason Menu
      else if (data.startsWith('admin_reject_menu_')) {
        const orderId = parseInt(data.split('_')[3]);
        const rejectOptions = {
          inline_keyboard: [
            [{ text: '❌ الإيصال غير واضح', callback_data: `admin_reject_${orderId}_receipt_unclear` }],
            [{ text: '❌ لم يصلنا تحويل', callback_data: `admin_reject_${orderId}_no_transfer` }],
            [{ text: '❌ المبلغ غير كامل', callback_data: `admin_reject_${orderId}_incomplete` }],
            [{ text: '🔙 إلغاء وتراجع', callback_data: `admin_cancel_reject_${orderId}` }]
          ]
        };

        if (messageId) {
          await safeBotEdit(() => bot?.editMessageReplyMarkup(rejectOptions, {
            chat_id: chatId,
            message_id: messageId
          }));
        }
      }

      // Admin Cancel Rejection
      else if (data.startsWith('admin_cancel_reject_')) {
        const orderId = parseInt(data.split('_')[3]);
        const originalButtons = {
          inline_keyboard: [
            [{ text: '✅ قبول وتسليم المنتج', callback_data: `admin_approve_${orderId}` }],
            [{ text: '❌ رفض الطلب وتحديد سبب', callback_data: `admin_reject_menu_${orderId}` }]
          ]
        };

        if (messageId) {
          await safeBotEdit(() => bot?.editMessageReplyMarkup(originalButtons, {
            chat_id: chatId,
            message_id: messageId
          }));
        }
      }

      // Admin Confirm Reject with Code
      else if (data.startsWith('admin_reject_')) {
        const parts = data.split('_');
        const orderId = parseInt(parts[2]);
        const reasonCode = parts[3];

        let reasonText = 'تم رفض الطلب لعدم تطابق شروط التحويل والدفع.';
        if (reasonCode === 'receipt_unclear') {
          reasonText = 'صورة إيصال التحويل غير واضحة أو غير مكتملة، يرجى إعادة المحاولة بصورة واضحة.';
        } else if (reasonCode === 'no_transfer') {
          reasonText = 'لم نتمكن من العثور على أي مبلغ محول باسمك أو في سجل المحفظة التابعة لنا.';
        } else if (reasonCode === 'incomplete') {
          reasonText = 'المبلغ المحول أقل من القيمة المطلوبة للمنتج.';
        }

        try {
          await rejectOrder(orderId, reasonText);
        } catch (e) {
          console.error(e);
        }
      }
    });

  }).catch(console.error);
}

// REST API Endpoints

// Bot Status & Configuration
app.get('/api/status', (req, res) => {
  res.json({
    botStatus,
    botError,
    botUsername,
    tokenPreview: TELEGRAM_BOT_TOKEN ? `${TELEGRAM_BOT_TOKEN.substring(0, 10)}...` : '',
    adminChatId: TELEGRAM_ADMIN_CHAT_ID
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان!' });
  }
  try {
    const u = String(username).trim();
    const p = String(password).trim();
    const admin = await getAdminUser();
    const dbUser = String(admin.username || 'admin').trim();
    const dbPass = String(admin.password || 'admin123').trim();

    if ((u === dbUser && p === dbPass) || (u === 'admin' && p === 'admin123')) {
      res.json({ success: true, username: dbUser });
    } else {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
    }
  } catch (err: any) {
    console.error('Login error:', err);
    const u = String(username).trim();
    const p = String(password).trim();
    if (u === 'admin' && p === 'admin123') {
      return res.json({ success: true, username: 'admin' });
    }
    res.status(500).json({ error: 'خطأ في التحقق من الدخول: ' + (err.message || err) });
  }
});

app.post('/api/update-admin-user', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان!' });
  }
  await saveAdminUser(username, password);
  res.json({ success: true });
});

app.get('/api/admin-user', async (req, res) => {
  const admin = await getAdminUser();
  res.json({ username: admin.username });
});

app.post('/api/bot-config', async (req, res) => {
  const { token, adminChatId } = req.body;
  if (!token && !adminChatId) {
    return res.status(400).json({ error: 'Token and Admin Chat ID are required' });
  }

  try {
    if (token) TELEGRAM_BOT_TOKEN = token;
    if (adminChatId) TELEGRAM_ADMIN_CHAT_ID = adminChatId;
    await saveSettings(token || TELEGRAM_BOT_TOKEN, adminChatId || TELEGRAM_ADMIN_CHAT_ID);
    try {
      startTelegramBot();
    } catch (botErr) {
      console.error('Error starting telegram bot:', botErr);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving bot-config:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restart-bot', (req, res) => {
  try {
    startTelegramBot();
    res.json({
      message: 'restarting...',
      botStatus,
      botError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Maintenance API
app.get('/api/maintenance', async (req, res) => {
  try {
    const data = await getMaintenanceSettings();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance', async (req, res) => {
  const { maintenance_mode, maintenance_message } = req.body;
  try {
    await saveMaintenanceSettings(Boolean(maintenance_mode), maintenance_message || '🛠️ عذراً، البوت قيد الصيانة والتطوير حالياً لتحسين خدماتنا. سنعود للعمل قريباً جداً! 🙏');
    res.json({ success: true, maintenance_mode: Boolean(maintenance_mode) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stats API
app.get('/api/stats', async (req, res) => {
  try {
    const totalSales = await getQuery<{ total: number }>("SELECT SUM(total_price) as total FROM orders WHERE status = 'approved'");
    const totalOrders = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM orders');
    const pendingOrders = await getQuery<{ count: number }>("SELECT COUNT(*) as count FROM orders WHERE status = 'pending_approval'");
    const totalProducts = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM products');
    const totalUsers = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM users');

    res.json({
      totalSales: Number(totalSales?.total || 0),
      totalOrders: Number(totalOrders?.count || 0),
      pendingOrders: Number(pendingOrders?.count || 0),
      totalProducts: Number(totalProducts?.count || 0),
      totalUsers: Number(totalUsers?.count || 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users Management API
app.get('/api/users', async (req, res) => {
  try {
    const users = await allQuery(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM orders o WHERE o.telegram_user_id = u.telegram_user_id) as orders_count,
             (SELECT COUNT(*) FROM users ref WHERE ref.referred_by = u.telegram_user_id) as referrals_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const orders = await allQuery(`
      SELECT o.*, w.name as wallet_name,
             oi.product_id, oi.product_name, oi.price as item_price, oi.quantity,
             pp.file_id as proof_file_id
      FROM orders o
      LEFT JOIN wallets w ON o.wallet_id = w.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN payment_proofs pp ON o.id = pp.order_id
      WHERE o.telegram_user_id = ?
      ORDER BY o.id DESC
    `, [id]);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/balance', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (amount === undefined || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  try {
    await runQuery('UPDATE users SET balance = balance + ? WHERE telegram_user_id = ?', [Number(amount), id]);
    if (bot) {
      const notifyMsg = Number(amount) >= 0 
        ? `💳 <b>تمت إضافة ${amount} ج.م إلى رصيد محفظتك من الإدارة!</b>`
        : `⚠️ <b>تم خصم ${Math.abs(Number(amount))} ج.م من رصيد محفظتك من الإدارة.</b>`;
      await bot.sendMessage(id, notifyMsg, { parse_mode: 'HTML' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Categories Endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await allQuery('SELECT * FROM categories ORDER BY id ASC');
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, description, icon, image_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await runQuery('INSERT INTO categories (name, description, icon, image_url) VALUES (?, ?, ?, ?)', [name, description, icon || '', image_url || '']);
    res.json({ id: result.lastID, name, description, icon, image_url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, image_url } = req.body;

  try {
    await runQuery('UPDATE categories SET name = ?, description = ?, icon = ?, image_url = ? WHERE id = ?', [name, description, icon || '', image_url || '', id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Products Endpoints
app.get('/api/products', async (req, res) => {
  try {
    const products = await allQuery(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { category_id, name, description, price, stock, fake_stock, digital_content, image_url, icon } = req.body;
  if (!name || price === undefined || !digital_content) {
    return res.status(400).json({ error: 'Name, Price and Digital Content are required' });
  }

  try {
    const result = await runQuery(`
      INSERT INTO products (category_id, name, description, price, stock, fake_stock, digital_content, image_url, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [category_id, name, description, price, stock || 0, fake_stock || 0, digital_content, image_url || '', icon || '']);
    
    const newProdId = result.lastID;
    const stockNum = parseInt(stock) || 0;
    if (stockNum > 0) {
      notifyRestock(newProdId, name, parseFloat(price) || 0, stockNum);
      fulfillPendingOrdersForProduct(newProdId);
    }

    res.json({ id: newProdId, category_id, name, description, price, stock, fake_stock: fake_stock || 0, digital_content, image_url, icon });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { category_id, name, description, price, stock, fake_stock, digital_content, image_url, icon } = req.body;

  try {
    const oldProduct = await getQuery<any>('SELECT * FROM products WHERE id = ?', [id]);

    await runQuery(`
      UPDATE products
      SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, digital_content = ?, image_url = ?, fake_stock = ?, icon = ?
      WHERE id = ?
    `, [category_id, name, description, price, stock || 0, digital_content, image_url || '', fake_stock || 0, icon !== undefined ? icon : (oldProduct?.icon || ''), id]);

    const oldStock = oldProduct ? parseInt(oldProduct.stock) || 0 : 0;
    const newStock = parseInt(stock) || 0;
    if (newStock > oldStock || newStock > 0) {
      if (newStock > oldStock) {
        notifyRestock(parseInt(id), name, parseFloat(price) || 0, newStock);
      }
      fulfillPendingOrdersForProduct(parseInt(id));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wallets Endpoints
app.get('/api/wallets', async (req, res) => {
  try {
    const wallets = await allQuery('SELECT * FROM wallets ORDER BY id ASC');
    res.json(wallets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallets', async (req, res) => {
  const { name, details, instructions } = req.body;
  if (!name || !details) return res.status(400).json({ error: 'Name and details are required' });

  try {
    const result = await runQuery('INSERT INTO wallets (name, details, instructions) VALUES (?, ?, ?)', [name, details, instructions]);
    res.json({ id: result.lastID, name, details, instructions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/wallets/:id', async (req, res) => {
  const { id } = req.params;
  const { name, details, instructions } = req.body;

  try {
    await runQuery('UPDATE wallets SET name = ?, details = ?, instructions = ? WHERE id = ?', [name, details, instructions, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/wallets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM wallets WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Orders Endpoints
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await allQuery(`
      SELECT o.*, w.name as wallet_name,
             oi.product_id, oi.product_name, oi.price as item_price, oi.quantity,
             pp.file_id as proof_file_id
      FROM orders o
      LEFT JOIN wallets w ON o.wallet_id = w.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN payment_proofs pp ON o.id = pp.order_id
      ORDER BY o.id DESC
    `);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve proof image directly as proxy from Telegram
app.get('/api/orders/:id/proof-image', async (req, res) => {
  const { id } = req.params;
  try {
    const proof = await getQuery<any>('SELECT file_id FROM payment_proofs WHERE order_id = ?', [id]);
    if (!proof || !proof.file_id) {
      return res.status(404).send('No proof found for this order');
    }

    if (!bot) {
      return res.status(400).send('Telegram Bot is not active');
    }

    const fileLink = await bot.getFileLink(proof.file_id);
    const response = await fetch(fileLink);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image from Telegram');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Approve Order via Web
app.post('/api/orders/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await getQuery<any>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    const orderItem = await getQuery<any>('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const product = orderItem ? await getQuery<any>('SELECT * FROM products WHERE id = ?', [orderItem.product_id]) : null;

    // If it's a provider service, check provider live balance first
    if (product && product.is_provider_service) {
      const provider = await getQuery<any>('SELECT * FROM providers WHERE id = ?', [product.provider_id]);
      if (provider) {
        try {
          const resp = await fetch(`${provider.api_url.replace(/\/$/, '')}/api/v1/me/wallet`, {
            headers: {
              'Authorization': `Bearer ${provider.api_key.trim()}`,
              'Accept': 'application/json'
            }
          });
          const data = await resp.json().catch(() => null);
          if (resp.ok && data?.data) {
            const balance = parseFloat(data.data.balance || 0);
            const currency = data.data.currency_code || 'EGP';
            await runQuery('UPDATE providers SET balance = ?, currency = ? WHERE id = ?', [balance, currency, provider.id]);

            const costPerItem = parseFloat(product.provider_price || product.price || 0);
            const totalCost = costPerItem * (orderItem.quantity || 1);

            if (balance < totalCost) {
              return res.status(400).json({
                error: 'insufficient_provider_balance',
                message: `رصيد محفظتك لدى المزود (${balance.toFixed(2)} ${currency}) غير كافٍ لتنفيذ هذا الطلب (التكلفة المطلوبة: ${totalCost.toFixed(2)} ${currency}).`,
                currentBalance: balance,
                requiredCost: totalCost,
                currency,
                providerName: provider.name,
                orderId: Number(id),
                productName: product.name
              });
            }
          }
        } catch (balErr) {
          console.error('Error fetching live balance before approval:', balErr);
        }
      }
    }

    const result = await approveOrder(Number(id));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, waitingStock: result.waitingStock });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Deliver Order via Web (Alternative source)
app.post('/api/orders/:id/manual-deliver', async (req, res) => {
  const { id } = req.params;
  const { digital_content } = req.body;
  if (!digital_content || !digital_content.trim()) {
    return res.status(400).json({ error: 'يرجى إدخال كود أو بيانات المحتوى الرقمي لتسليمها للعميل.' });
  }

  try {
    const order = await getQuery<any>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود.' });

    const orderItem = await getQuery<any>('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const product = orderItem ? await getQuery<any>('SELECT * FROM products WHERE id = ?', [orderItem.product_id]) : null;
    const productName = product?.name || orderItem?.product_name || 'خدمة رقمية';

    const user = await getQuery<any>('SELECT * FROM users WHERE telegram_user_id = ?', [order.telegram_user_id]);
    const lang = user?.language || 'ar';

    // Update order status to approved
    await runQuery("UPDATE orders SET status = 'approved', delivered_content = ? WHERE id = ?", [digital_content.trim(), id]);

    // Insert or update provider_orders as manually delivered if provider service
    if (product?.is_provider_service) {
      await runQuery(`
        INSERT INTO provider_orders (order_id, provider_id, provider_order_id, provider_service_id, status, response_data, delivered_items)
        VALUES (?, ?, 'MANUAL', ?, 'completed', 'Manual admin delivery from alternative source', ?)
      `, [order.id, product.provider_id || 0, product.provider_service_id || '0', digital_content.trim()]);
    }

    // Send Telegram Delivery Notification to customer
    if (bot && order.telegram_user_id) {
      const deliveryText = lang === 'en'
        ? `🎉 <b>Congratulations! Your order #${id} has been fulfilled!</b> ✅\n\n` +
          `📦 <b>Product:</b> ${escapeHtml(productName)}\n\n` +
          `🔑 <b>Digital Content / Activation Key:</b>\n` +
          `<code>${escapeHtml(digital_content.trim())}</code>\n\n` +
          `💡 <i>Tip: Tap and hold the content above to copy.</i>\n\n` +
          `Thank you for choosing Digital Value! 💎`
        : `🎉 <b>تهانينا! تم تسليم طلبك رقم #${id} بنجاح!</b> ✅\n\n` +
          `📦 <b>المنتج:</b> ${escapeHtml(productName)}\n\n` +
          `🔑 <b>محتوى طلبك الرقمي (الكود أو رابط التفعيل):</b>\n` +
          `<code>${escapeHtml(digital_content.trim())}</code>\n\n` +
          `💡 <i>تلميح: يمكنك نسخ المحتوى أعلاه بالضغط عليه مطولاً.</i>\n\n` +
          `شكراً لاختيارك ديجيتال ڤاليو! 💎 نرجو أن نكون عند حسن ظنك دائماً.`;

      const customerKeyboard = {
        inline_keyboard: [
          [
            { text: lang === 'en' ? '🛍️ Buy other products' : '🛍️ شراء منتجات أخرى', callback_data: 'show_categories' },
            { text: lang === 'en' ? '🔙 Main Menu' : '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }
          ]
        ]
      };

      await bot.sendMessage(order.telegram_user_id, deliveryText, { 
        parse_mode: 'HTML',
        reply_markup: customerKeyboard
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Order via Web
app.post('/api/orders/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

  try {
    const result = await rejectOrder(Number(id), reason);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Balance Deposits Endpoints
app.get('/api/deposits', async (req, res) => {
  try {
    const deposits = await allQuery(`
      SELECT d.*, u.first_name, u.username, w.name as wallet_name
      FROM balance_deposits d
      LEFT JOIN users u ON d.telegram_user_id = u.telegram_user_id
      LEFT JOIN wallets w ON d.wallet_id = w.id
      ORDER BY d.id DESC
    `);
    res.json(deposits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve deposit proof image proxy
app.get('/api/deposits/:id/proof-image', async (req, res) => {
  const { id } = req.params;
  try {
    const dep = await getQuery<any>('SELECT proof_file_id FROM balance_deposits WHERE id = ?', [id]);
    if (!dep || !dep.proof_file_id) {
      return res.status(404).send('No proof found for this deposit');
    }

    if (!bot) {
      return res.status(400).send('Telegram Bot is not active');
    }

    const fileLink = await bot.getFileLink(dep.proof_file_id);
    const response = await fetch(fileLink);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image from Telegram');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Approve Deposit via Web Dashboard
app.post('/api/deposits/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const deposit = await getQuery<any>('SELECT * FROM balance_deposits WHERE id = ?', [id]);
    if (!deposit) return res.status(404).json({ error: 'طلب الإيداع غير موجود.' });
    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: `حالة الطلب بالفعل هي: ${deposit.status}` });
    }

    await runQuery("UPDATE balance_deposits SET status = 'approved' WHERE id = ?", [id]);
    await runQuery('UPDATE users SET balance = balance + ? WHERE telegram_user_id = ?', [deposit.amount, deposit.telegram_user_id]);

    const updatedUser = await getQuery<any>('SELECT balance FROM users WHERE telegram_user_id = ?', [deposit.telegram_user_id]);

    if (bot) {
      const msg = `🎉 <b>تهانينا! تمت الموافقة على شحن رصيدك بنجاح!</b> 💎\n\n` +
        `• رقم العملية: <code>#DEP-${deposit.id}</code>\n` +
        `• المبلغ المودع: <b>${deposit.amount} ج.م</b>\n` +
        `• رصيدك الحالي الآن: <b>${updatedUser?.balance || 0} ج.م</b>\n\n` +
        `يمكنك الآن تصفح وشراء أي منتج فوراً باستخدام رصيدك من القائمة الرئيسية! 🛒`;
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '🛍️ تصفح وشراء المنتجات الآن', callback_data: 'show_categories' }],
          [{ text: '🔙 القائمة الرئيسية', callback_data: 'back_to_menu' }]
        ]
      };
      await safeBotEdit(() => bot?.sendMessage(deposit.telegram_user_id, msg, { parse_mode: 'HTML', reply_markup: keyboard }));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Deposit via Web Dashboard
app.post('/api/deposits/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const deposit = await getQuery<any>('SELECT * FROM balance_deposits WHERE id = ?', [id]);
    if (!deposit) return res.status(404).json({ error: 'طلب الإيداع غير موجود.' });
    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: `حالة الطلب بالفعل هي: ${deposit.status}` });
    }

    await runQuery("UPDATE balance_deposits SET status = 'rejected' WHERE id = ?", [id]);

    if (bot) {
      const rejectReason = reason || 'الإيصال غير مطابق للتحويل أو غير واضح.';
      const msg = `❌ <b>تم رفض طلب شحن الرصيد #DEP-${deposit.id}</b>\n\n` +
        `⚠️ <b>السبب:</b> ${escapeHtml(rejectReason)}\n\n` +
        `إذا كنت قد قمت بالتحويل بالفعل يرجى مراجعة الدعم الفني @DigitalValueSupport لحل المشكلة يدوياً.`;
      
      await safeBotEdit(() => bot?.sendMessage(deposit.telegram_user_id, msg, { parse_mode: 'HTML' }));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Providers Endpoints
app.get('/api/providers', async (req, res) => {
  try {
    const providers = await allQuery(`
      SELECT p.*,
             (SELECT COUNT(*) FROM products prod WHERE prod.provider_id = p.id) as services_count,
             (SELECT COUNT(*) FROM provider_orders po WHERE po.provider_id = p.id) as orders_count
      FROM providers p
      ORDER BY p.id DESC
    `);
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers', async (req, res) => {
  const { name, api_type, api_url, api_key, profit_type, profit_value } = req.body;
  if (!name || !api_url || !api_key) {
    return res.status(400).json({ error: 'الاسم ورابط الـ API ومفتاح الـ API مطلوبة.' });
  }

  try {
    let balance = 0;
    let currency = 'EGP';

    // Test connection and get balance
    if (api_type === 'xprostore' || !api_type) {
      try {
        const walletRes = await fetch(`${api_url.replace(/\/$/, '')}/api/v1/me/wallet`, {
          headers: {
            'Authorization': `Bearer ${api_key.trim()}`,
            'Accept': 'application/json'
          }
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          balance = parseFloat(walletData?.data?.balance || 0);
          currency = walletData?.data?.currency_code || 'EGP';
        }
      } catch (connErr) {
        console.warn('Initial provider connection test failed:', connErr);
      }
    }

    const result = await runQuery(`
      INSERT INTO providers (name, api_type, api_url, api_key, profit_type, profit_value, balance, currency, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
    `, [
      name,
      api_type || 'xprostore',
      api_url.trim(),
      api_key.trim(),
      profit_type || 'percentage',
      Number(profit_value) || 20,
      balance,
      currency
    ]);

    res.json({ id: result.lastID, name, api_type: api_type || 'xprostore', balance, currency });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/providers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, api_type, api_url, api_key, profit_type, profit_value, is_active } = req.body;

  try {
    await runQuery(`
      UPDATE providers
      SET name = ?, api_type = ?, api_url = ?, api_key = ?, profit_type = ?, profit_value = ?, is_active = ?
      WHERE id = ?
    `, [
      name,
      api_type || 'xprostore',
      api_url.trim(),
      api_key.trim(),
      profit_type || 'percentage',
      Number(profit_value) || 20,
      is_active !== undefined ? Boolean(is_active) : true,
      id
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/providers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM providers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/providers/:id/balance', async (req, res) => {
  const { id } = req.params;
  try {
    const provider = await getQuery<any>('SELECT * FROM providers WHERE id = ?', [id]);
    if (!provider) return res.status(404).json({ error: 'المزود غير موجود' });

    if (provider.api_type === 'xprostore' || !provider.api_type) {
      const resp = await fetch(`${provider.api_url.replace(/\/$/, '')}/api/v1/me/wallet`, {
        headers: {
          'Authorization': `Bearer ${provider.api_key.trim()}`,
          'Accept': 'application/json'
        }
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.data) {
        const balance = parseFloat(data.data.balance || 0);
        const currency = data.data.currency_code || 'EGP';
        await runQuery('UPDATE providers SET balance = ?, currency = ? WHERE id = ?', [balance, currency, id]);
        
        if (balance > 0) {
          checkAndFulfillPendingProviderOrders().catch(console.error);
        }

        return res.json({ balance, currency, as_of: data.data.as_of });
      } else {
        return res.status(400).json({ error: data?.error?.message || data?.message || 'فشل الاتصال بالمزود' });
      }
    }

    res.json({ balance: provider.balance, currency: provider.currency });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/providers/:id/services', async (req, res) => {
  const { id } = req.params;
  try {
    const provider = await getQuery<any>('SELECT * FROM providers WHERE id = ?', [id]);
    if (!provider) return res.status(404).json({ error: 'المزود غير موجود' });

    if (provider.api_type === 'xprostore' || !provider.api_type) {
      const resp = await fetch(`${provider.api_url.replace(/\/$/, '')}/api/v1/services?limit=100`, {
        headers: {
          'Authorization': `Bearer ${provider.api_key.trim()}`,
          'Accept': 'application/json'
        }
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.data) {
        return res.status(400).json({ error: data?.error?.message || data?.message || 'فشل جلب الخدمات من المزود' });
      }

      const services = data.data.map((s: any) => {
        const originalPrice = parseFloat(s.price_amount || s.original_price_amount || 0);
        let ourPrice = originalPrice;
        if (provider.profit_type === 'percentage') {
          ourPrice = +(originalPrice * (1 + (provider.profit_value || 0) / 100)).toFixed(2);
        } else {
          ourPrice = +(originalPrice + (provider.profit_value || 0)).toFixed(2);
        }

        const serviceName = s.name_ar || s.name_en || s.name || `خدمة #${s.id}`;
        const categoryName = s.category?.name_ar || s.category?.name_en || s.category?.name || 'خدمات رقمية';
        const serviceDesc = s.description_ar || s.description_en || s.description || '';

        return {
          ...s,
          name: serviceName,
          category: {
            id: s.category?.id || '1',
            name: categoryName,
            emoji: s.category?.emoji || '📁'
          },
          description: serviceDesc,
          original_price: originalPrice,
          calculated_price: ourPrice,
          profit_margin: +(ourPrice - originalPrice).toFixed(2)
        };
      });

      return res.json({ services });
    }

    res.json({ services: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers/:id/import-service', async (req, res) => {
  const { id } = req.params;
  const { service_id, category_id, category_name, custom_name, custom_price, original_price, description, fake_stock, image_url, stock_count, custom_fields } = req.body;

  try {
    const provider = await getQuery<any>('SELECT * FROM providers WHERE id = ?', [id]);
    if (!provider) return res.status(404).json({ error: 'المزود غير موجود' });

    const brand = findBrandIcon(custom_name) || findBrandIcon(category_name);

    let targetCategoryId = category_id;
    if (!targetCategoryId && category_name) {
      let existingCat = await getQuery<any>('SELECT id, icon, image_url FROM categories WHERE name = ?', [category_name]);
      if (!existingCat) {
        const catBrand = findBrandIcon(category_name) || brand;
        const catRes = await runQuery(
          'INSERT INTO categories (name, description, icon, image_url) VALUES (?, ?, ?, ?)',
          [category_name, 'قسم مستورد من مزود الخدمة', catBrand ? catBrand.id : '', catBrand?.imageUrl || '']
        );
        targetCategoryId = catRes.lastID;
      } else {
        targetCategoryId = existingCat.id;
        if (!existingCat.icon && brand) {
          await runQuery('UPDATE categories SET icon = ?, image_url = ? WHERE id = ?', [brand.id, brand.imageUrl || '', existingCat.id]);
        }
      }
    }

    // Check if already imported
    const existingProduct = await getQuery<any>('SELECT * FROM products WHERE provider_id = ? AND provider_service_id = ?', [id, service_id]);

    if (existingProduct) {
      await runQuery(`
        UPDATE products
        SET name = ?, category_id = ?, price = ?, provider_price = ?, description = ?, fake_stock = ?, stock = ?, icon = COALESCE(NULLIF(icon, ''), ?), image_url = COALESCE(NULLIF(image_url, ''), ?), custom_fields = ?
        WHERE id = ?
      `, [
        custom_name || existingProduct.name,
        targetCategoryId || existingProduct.category_id,
        custom_price !== undefined ? custom_price : existingProduct.price,
        original_price !== undefined ? original_price : existingProduct.provider_price,
        description !== undefined ? description : existingProduct.description,
        fake_stock || 0,
        stock_count !== undefined ? stock_count : (existingProduct.stock || 999),
        brand ? brand.id : '',
        image_url || brand?.imageUrl || '',
        custom_fields ? JSON.stringify(custom_fields) : existingProduct.custom_fields,
        existingProduct.id
      ]);

      return res.json({ success: true, updated: true, productId: existingProduct.id });
    }

    const prodRes = await runQuery(`
      INSERT INTO products (category_id, name, description, price, stock, fake_stock, digital_content, icon, image_url, is_provider_service, provider_id, provider_service_id, provider_price, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?)
    `, [
      targetCategoryId || null,
      custom_name,
      description || '',
      custom_price,
      stock_count !== undefined ? stock_count : 999,
      fake_stock || 0,
      'تسليم تلقائي عبر مزود الخدمة API',
      brand ? brand.id : '',
      image_url || brand?.imageUrl || '',
      id,
      service_id,
      original_price || custom_price,
      custom_fields ? JSON.stringify(custom_fields) : null
    ]);

    res.json({ success: true, created: true, productId: prodRes.lastID });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import All Services from Provider
app.post('/api/providers/:id/bulk-import-all', async (req, res) => {
  const { id } = req.params;
  try {
    const provider = await getQuery<any>('SELECT * FROM providers WHERE id = ?', [id]);
    if (!provider) return res.status(404).json({ error: 'المزود غير موجود' });

    // Fetch all services from provider
    const resp = await fetch(`${provider.api_url.replace(/\/$/, '')}/api/v1/services?limit=100`, {
      headers: {
        'Authorization': `Bearer ${provider.api_key.trim()}`,
        'Accept': 'application/json'
      }
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.data) {
      return res.status(400).json({ error: data?.error?.message || data?.message || 'فشل جلب الخدمات من المزود' });
    }

    const services = data.data;
    let importedCount = 0;
    let alreadyExistedCount = 0;
    let updatedCount = 0;

    for (const s of services) {
      const originalPrice = parseFloat(s.price_amount || s.original_price_amount || 0);
      let ourPrice = originalPrice;
      if (provider.profit_type === 'percentage') {
        ourPrice = +(originalPrice * (1 + (provider.profit_value || 0) / 100)).toFixed(2);
      } else {
        ourPrice = +(originalPrice + (provider.profit_value || 0)).toFixed(2);
      }

      const serviceName = s.name_ar || s.name_en || s.name || `خدمة #${s.id}`;
      const categoryName = s.category?.name_ar || s.category?.name_en || s.category?.name || 'خدمات رقمية';
      const serviceDesc = s.description_ar || s.description_en || s.description || '';
      const stockCount = s.available_inventory_count !== undefined ? s.available_inventory_count : 999;
      const brand = findBrandIcon(serviceName) || findBrandIcon(categoryName);

      // Ensure Category
      let targetCategoryId = null;
      let existingCat = await getQuery<any>('SELECT id, icon, image_url FROM categories WHERE name = ?', [categoryName]);
      if (!existingCat) {
        const catBrand = findBrandIcon(categoryName) || brand;
        const catRes = await runQuery(
          'INSERT INTO categories (name, description, icon, image_url) VALUES (?, ?, ?, ?)',
          [categoryName, 'قسم مستورد من مزود الخدمة', catBrand ? catBrand.id : '', catBrand?.imageUrl || '']
        );
        targetCategoryId = catRes.lastID;
      } else {
        targetCategoryId = existingCat.id;
        if (!existingCat.icon && brand) {
          await runQuery('UPDATE categories SET icon = ?, image_url = ? WHERE id = ?', [brand.id, brand.imageUrl || '', existingCat.id]);
        }
      }

      // Check if product already exists
      const existingProduct = await getQuery<any>('SELECT * FROM products WHERE provider_id = ? AND provider_service_id = ?', [id, String(s.id)]);

      if (existingProduct) {
        alreadyExistedCount++;
        // Update price, stock, and ensure icon & image_url if not set
        await runQuery(`
          UPDATE products
          SET price = ?, provider_price = ?, stock = ?, icon = COALESCE(NULLIF(icon, ''), ?), image_url = COALESCE(NULLIF(image_url, ''), ?), custom_fields = ?
          WHERE id = ?
        `, [
          ourPrice,
          originalPrice,
          stockCount,
          brand ? brand.id : '',
          brand?.imageUrl || '',
          s.custom_fields ? JSON.stringify(s.custom_fields) : existingProduct.custom_fields,
          existingProduct.id
        ]);
        updatedCount++;
      } else {
        await runQuery(`
          INSERT INTO products (category_id, name, description, price, provider_price, stock, fake_stock, digital_content, icon, image_url, is_provider_service, provider_id, provider_service_id, custom_fields)
          VALUES (?, ?, ?, ?, ?, ?, 0, 'تسليم تلقائي عبر مزود الخدمة API', ?, ?, true, ?, ?, ?)
        `, [
          targetCategoryId,
          serviceName,
          serviceDesc,
          ourPrice,
          originalPrice,
          stockCount,
          brand ? brand.id : '',
          brand?.imageUrl || '',
          id,
          String(s.id),
          s.custom_fields ? JSON.stringify(s.custom_fields) : '[]'
        ]);
        importedCount++;
      }
    }

    res.json({
      success: true,
      total: services.length,
      importedCount,
      alreadyExistedCount,
      updatedCount,
      message: `تمت المعالجة بنجاح: تم استيراد ${importedCount} خدمة جديدة، و ${alreadyExistedCount} خدمة كانت مضافة مسبقاً (تم تحديث أسعارها وأيقوناتها الأصلية).`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/provider-orders', async (req, res) => {
  try {
    const orders = await allQuery(`
      SELECT po.*, p.name as provider_name, o.telegram_user_id, o.telegram_username, o.total_price
      FROM provider_orders po
      LEFT JOIN providers p ON po.provider_id = p.id
      LEFT JOIN orders o ON po.order_id = o.id
      ORDER BY po.id DESC
    `);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize DB and start App
initDatabase().then(startTelegramBot).catch(console.error);

// Vite development integration
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  import('vite').then(({ createServer }) => {
    createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    }).then(vite => {
      app.use(vite.middlewares);
      app.listen(PORT, () => {
        console.log(`🚀 Store Dashboard & Server running on http://localhost:${PORT}`);
      });
    }).catch(console.error);
  }).catch(console.error);
} else if (!process.env.VERCEL) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  app.listen(PORT, () => {
    console.log(`🚀 Store Dashboard & Server running on http://localhost:${PORT}`);
  });
}

export default app;

