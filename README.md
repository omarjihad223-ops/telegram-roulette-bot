# 🎰 بوت الفرة المجانية — Telegram Bot + Mini App

مشروع كامل وحقيقي: بوت تيليجرام + Mini App لفرة حظ مجانية بالكامل (بدون أي دفع أو مقامرة)،
مع Backend حقيقي (Node.js + TypeScript + MongoDB)، نظام مخزون حقيقي، نظام إحالة اختياري
غير مرتبط بحجب الجوائز، ولوحة تحكم للمطورين.

---

## 📦 ما يحتويه المشروع

- **Backend**: Node.js + TypeScript + Express + MongoDB (Mongoose)
- **Telegram Bot**: node-telegram-bot-api (Long Polling — يعمل بدون رابط Webhook عام)
- **Mini App**: React + TypeScript + Vite، تصميم Dark/Premium بالكامل RTL
- **العجلة**: اختيار عشوائي موزون (Weighted Random) بالكامل من السيرفر، ما يقرر الفرونت إند النتيجة أبداً
- **المخزون**: لكل جائزة مخزون مستقل، إذا نفذ تصير نسبتها صفر تلقائياً وتُعاد توزيع الأوزان
- **الإحالة**: نظام اختياري بالكامل — كل إحالة مؤهلة تعطي مكافأة مباشرة، وما تحجب جوائز العجلة
- **الاستلام**: يدوي بالكامل — أي جائزة تحتاج موافقة من لوحة المطور قبل التسليم
- **الأمان**: تحقق كامل من Telegram initData (HMAC)، Rate Limiting، Idempotency، حماية Owner

---

## 🚀 التشغيل على Replit

### 1. استيراد المشروع
ارفع مجلد المشروع كامل إلى Replit (أو اعمل Import from GitHub بعد رفعه هناك).

### 2. إعداد قاعدة البيانات
أسهل طريقة: أنشئ حساب مجاني على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)،
أنشئ Cluster مجاني، واحصل على رابط الاتصال (Connection String).

### 3. إنشاء البوت
راسل [@BotFather](https://t.me/BotFather) على تيليجرام:
- `/newbot` لإنشاء بوت جديد واحصل على الـ Token
- `/newapp` لربط Mini App بالبوت (بعد ما يصير عندك رابط Replit)

### 4. معرفة الـ Owner ID
راسل [@userinfobot](https://t.me/userinfobot) للحصول على الـ Telegram ID الخاص فيك.

### 5. إعداد متغيرات البيئة
في Replit، افتح تبويب **Secrets** (🔒) وأضف كل المتغيرات الموجودة في `.env.example`:

```
BOT_TOKEN=توكن البوت من BotFather
BOT_USERNAME=اسم البوت بدون @
MONGODB_URI=رابط MongoDB Atlas
OWNER_ID=رقمك على تيليجرام
MINI_APP_URL=رابط Replit تبعك (يبان بعد أول تشغيل، مثال: https://xxx.repl.co)
SUPPORT_USERNAME=O1916
WEBAPP_SECRET=نص عشوائي طويل وآمن
NODE_ENV=production
PORT=3000
```

لتوليد `WEBAPP_SECRET` عشوائي وآمن، شغّل بالـ Shell:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. التشغيل
```bash
npm run install:all
npm run build
npm start
```

أو ببساطة اضغط زر **Run** — ملف `.replit` معدّ مسبقاً يسوي هذا تلقائياً.

بعد أول تشغيل، خذ رابط Replit (يبان فوق) وحطه في `MINI_APP_URL` بالـ Secrets، وأعد التشغيل،
وحطه أيضاً بإعدادات `/newapp` بـ BotFather.

### 7. تعبئة الجوائز الأولية (Seed)
شغّل مرة وحدة بس:
```bash
npx tsx server/src/workers/seed.ts
```
هذا يزرع الـ 15 جائزة بأوزانها الصحيحة + جائزة الإحالة، بمخزون ابتدائي تقدر تعدله من لوحة المطور.

---

## 🧪 التشغيل محلياً (Development)

```bash
npm run install:all
npm run dev:server   # في تيرمنال أول
npm run dev:client   # في تيرمنال ثاني
```

## ✅ تشغيل الاختبارات
```bash
npm run test
```
يغطي: الاختيار الموزون العشوائي (Weighted Random)، والتحقق من توقيع Telegram initData
(بما فيها رفض بيانات مزوّرة أو منتهية).

---

## 👨‍💻 لوحة المطور

أي شخص Owner أو Developer يشوف زر "👨‍💻 لوحة المطور" أعلى الصفحة داخل الـ Mini App، وتقدر منها:
- إدارة الجوائز: إضافة/إنقاص/تصفير المخزون، تفعيل/إيقاف أي جائزة
- مراجعة طلبات السحب (قبول/رفض مع سبب)
- تفعيل/إيقاف وضع الصيانة

لإضافة مطور جديد أو إدارة القنوات الإجبارية أو الحظر أو الإذاعة، استخدم نقاط الـ API التالية
مباشرة (عبر أي أداة API مثل Postman، أو وسّعها بواجهة إضافية لاحقاً):

```
POST   /api/admin/developers          { lookup: "@username أو ID" }
DELETE /api/admin/developers/:id
POST   /api/admin/forced-chats        { input: "@channel أو رابط أو ID" }
DELETE /api/admin/forced-chats/:chatId
POST   /api/admin/bans                { lookup, reason }
POST   /api/admin/bans/unban          { lookup }
POST   /api/admin/broadcast           { message, scope: "all" | "channels" | "direct", telegramIds?, buttons? }
GET    /api/admin/stats
GET    /api/admin/audit-logs
```

كل هالطلبات تحتاج Header باسم `X-Telegram-Init-Data` يحتوي initData صحيح من مستخدم عنده صلاحية admin.

---

## 🗂️ بنية المشروع

```
/server
  /src
    /config       اتصال قاعدة البيانات، البيئة، الـ logger
    /models       كل Mongoose Schemas
    /services     منطق العمل (العجلة، المخزون، الإحالة، الاستلام...)
    /controllers  معالجات الطلبات
    /routes       تعريف الـ API
    /middleware   المصادقة، الصلاحيات، Rate Limiting
    /bot          بوت تيليجرام (/start، الاشتراك الإجباري)
    /workers      Cron لفحص انتهاء الجوائز (يعمل حتى بعد Restart)
/client
  /src
    /pages        شاشات الـ Mini App (الرئيسية، الدوران، المهام، المتجر، السجل، الإدارة)
    /components   العجلة، الكابتشا، البوابات، عناصر واجهة عامة
```

---

## ⚠️ ملاحظات مهمة

- **العجلة بالكامل مجانية** — ما فيه أي دفع أو رهان أو سحب نقدي، فقط جوائز ترويجية.
- **النتيجة والاحتمالات محسوبة بالسيرفر فقط** — الفرونت إند يعرض أنيميشن فقط بناءً على نتيجة جاهزة.
- **الإحالة اختيارية بالكامل** — لا تحجب أي جائزة، وتُمنح مكافأتها تلقائياً بدون انتظار.
- **الاستلام يدوي دائماً** — أي جائزة (من العجلة أو من الإحالة) تحتاج موافقة يدوية من لوحة المطور
  قبل ما يوصل المستخدم للمنتج فعلياً، وبعدها يراسل الدعم لاستلامه.
- إذا احتجت تغيّر مدة التبريد (24 ساعة) أو مدة صلاحية الجائزة، عدّلها من `/api/admin/settings`.
