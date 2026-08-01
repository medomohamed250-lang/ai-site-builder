# AI Agent Site Builder — MVP

منصة عربية صغيرة تولّد مواقع Vanilla HTML/CSS/JS عبر Gemini، وتستطيع إنشاء Supabase، رفع الملفات إلى GitHub، ثم نشرها على Vercel.

## الحدود المقصودة في النسخة الحالية

- الواجهة كلها في `index.html` واحد.
- توجد 4 ملفات API فقط داخل `api/`.
- تستخدم توكنات مالك المنصة؛ لذلك هذه نسخة شخصية/MVP. قبل فتحها لمستخدمين آخرين يجب استبدال التوكنات العامة بـ OAuth أو GitHub App وSupabase/Vercel integrations لكل مستخدم.
- إنشاء مشروع Supabase جديد قد يفشل عندما يصل الحساب إلى حد المشاريع أو يتطلب خطة مدفوعة.
- endpoint تشغيل SQL في Supabase Management API مصنف Beta وقد يتغير.
- المشروع الناتج Vanilla لتقليل أخطاء البناء والتكلفة.

## 1) المتطلبات

- Node.js 22
- حساب Gemini API
- حساب Supabase
- حساب GitHub
- حساب Vercel

## 2) إعداد Supabase الخاص بالمنصة

هذا المشروع يحتاج مشروع Supabase ثابت لتخزين build jobs.

1. أنشئ Project عاديًا في Supabase Dashboard.
2. افتح SQL Editor.
3. انسخ وشغّل محتوى `supabase/builder-schema.sql`.
4. من Project Settings > API انسخ:
   - Project URL إلى `BUILDER_SUPABASE_URL`
   - Secret/service-role key إلى `BUILDER_SUPABASE_SERVICE_ROLE_KEY`
5. لا تضع service-role key في المتصفح أو داخل GitHub.

## 3) Gemini

1. أنشئ API key من Google AI Studio.
2. ضع المفتاح في `GEMINI_API_KEY`.
3. اترك `GEMINI_MODEL=gemini-2.5-flash` أو غيّره إلى موديل متاح في حسابك.

## 4) GitHub

### MVP شخصي

1. أنشئ Fine-grained Personal Access Token.
2. امنحه صلاحية إنشاء/إدارة repositories وContents: Read and write للحساب أو المنظمة المطلوبة.
3. ضع التوكن في `GITHUB_TOKEN`.
4. ضع اسم حساب GitHub في `GITHUB_OWNER`.
5. تأكد أن حساب GitHub مربوط بحساب Vercel وأن Vercel GitHub App مسموح له بالوصول إلى الـrepository، خصوصًا لو كان Private.

> للإنتاج متعدد المستخدمين: استخدم GitHub App أو OAuth بدل توكن واحد.

## 5) Supabase Management API لإنشاء قواعد للعملاء

هذا الجزء اختياري. لو المستخدم ألغى اختيار Supabase، لن يتم استدعاؤه.

1. من Supabase Account Tokens أنشئ Personal Access Token.
2. ضعه في `SUPABASE_MANAGEMENT_TOKEN`.
3. افتح organization settings وخذ Organization ID وضعه في `SUPABASE_ORGANIZATION_ID`.
4. ضع منطقة صحيحة في `SUPABASE_DEFAULT_REGION`، مثال `eu-central-1` بحسب المناطق المتاحة لحسابك.

التوكن يحمل صلاحيات حسابك، لذلك احتفظ به في Vercel Environment Variables فقط.

## 6) Vercel

1. أنشئ Access Token من Vercel Account Settings.
2. ضعه في `VERCEL_TOKEN`.
3. لو تنشر داخل Team، ضع Team ID في `VERCEL_TEAM_ID`. اتركه فارغًا للحساب الشخصي.
4. اربط GitHub بحساب Vercel من Integrations، واسمح له بالوصول للمستودعات التي ستنشئها المنصة.

## 7) تشغيل محلي

```bash
cp .env.example .env.local
npm install
npm run check
npx vercel dev
```

ثم افتح العنوان الذي يظهر، غالبًا `http://localhost:3000`.

ملاحظة: `vercel dev` يقرأ `.env.local` عند ربط المشروع أو حسب إعداد CLI. يمكنك أيضًا تشغيل `vercel env pull .env.local` بعد ربطه.

## 8) رفع المشروع إلى GitHub

من داخل مجلد المشروع:

```bash
git init
git add .
git commit -m "Initial AI Site Builder"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-site-builder.git
git push -u origin main
```

لا ترفع `.env.local`؛ الملف موجود في `.gitignore`.

## 9) النشر على Vercel

### من Dashboard

1. افتح Vercel ثم Add New > Project.
2. اختر repository الخاص بالـBuilder.
3. Framework Preset: Other.
4. لا تحتاج Build Command أو Output Directory.
5. أضف كل متغيرات `.env.example` في Settings > Environment Variables.
6. اضغط Deploy.

### من CLI

```bash
npx vercel
npx vercel env add GEMINI_API_KEY
# كرر للأسرار المطلوبة
npx vercel --prod
```

## 10) اختبار الإعداد

بعد النشر افتح:

```text
https://YOUR-BUILDER.vercel.app/api/health
```

سيعرض أسماء المتغيرات وحالتها كـ true/false، ولن يعرض قيم المفاتيح.

## 11) حماية واجهة المنصة

ضع قيمة عشوائية طويلة في `BUILDER_ACCESS_KEY`. عند استخدام الواجهة، أدخل نفس القيمة في الحقل المخصص. هذا مناسب للحماية الشخصية البسيطة، وليس بديلًا عن Login وRate Limiting.

## 12) دورة التنفيذ

1. `/api/start` ينشئ Job.
2. `/api/step` يولد الملفات عبر Gemini.
3. ينشئ Supabase ويشغّل SQL لو كان مطلوبًا.
4. ينشئ GitHub repository ويدفع كل الملفات في Commit واحد.
5. ينشئ Vercel project ويضيف المتغيرات العامة.
6. يشغل production deployment ويتابع حالته.
7. `/api/status` يعيد رابط الموقع وGitHub.

## 13) قبل فتح المشروع للجمهور

أضف Auth حقيقي، Rate limiting، نظام credits، تشفير OAuth tokens، webhook/queue لاستكمال المهام حتى عند إغلاق الصفحة، وفحص build داخل sandbox. لا تسمح لنموذج AI بتشغيل أوامر shell أو SQL غير مفحوصة.
