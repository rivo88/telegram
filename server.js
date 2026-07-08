const { Telegraf, session, Markup } = require('telegraf');
const OpenAI = require('openai');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
require('dotenv').config();

const TEMPLATE_PATH = path.join(__dirname, 'template.html');
const AMP_PATH = path.join(__dirname, 'amp.html');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
bot.use(session());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ======================================================
// FAQ QUESTIONS FIXED
// ======================================================
const FAQ_QUESTIONS = [
  "Apa yang dimaksud Pubtogel sebagai situs alternatif John resmi?",
  "Kenapa banyak pemain memilih Pubtogel?",
  "Apa fungsi link alternatif John di Pubtogel?",
  "Apa yang dimaksud daftar togel online Selection Terbaik Asia?",
  "Apakah Pubtogel menyediakan informasi beragam pasaran Toto 4D?",
  "Apa yang membuat Pubtogel berbeda dibanding situs Toto 4D lainnya?"
];

// ======================================================
// HELPERS
// ======================================================
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : fallback;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url = '') {
  return String(url).trim().replace(/\/+$/, '');
}

function makeSlug(keyword) {
  let slug = String(keyword || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) slug = `article-${Date.now()}`;
  return slug;
}

function replaceAllText(source, search, replace) {
  if (!source) return source;
  return source.split(search).join(replace);
}

function wordCount(text = '') {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

// ======================================================
// CONTENT BUILDERS
// ======================================================
function buildArticleHtml(paragraphs = [], loginUrl = '') {
  const safeLogin = escapeHtml(loginUrl);

  if (!Array.isArray(paragraphs)) {
    paragraphs = [String(paragraphs || '')];
  }

  return paragraphs
    .filter(Boolean)
    .map(paragraph => {
      const text = escapeHtml(paragraph);
      return `<p>${text} <a href="${safeLogin}" target="_blank" rel="noopener noreferrer">Kunjungi</a></p>`;
    })
    .join('\n');
}

function buildFaqItemsHtml(faqAnswers = []) {
  return FAQ_QUESTIONS.map((question, i) => {
    const answer = safeString(
      faqAnswers[i],
      "Informasi ini disusun untuk membantu pengguna memahami topik dengan lebih mudah."
    );

    return `
<details class="tgl138-item">
  <summary>${escapeHtml(question)}</summary>
  <div class="tgl138-ans">${escapeHtml(answer)}</div>
</details>`.trim();
  }).join('\n');
}

function buildTestimoniItemsHtml(testimoniItems = []) {
  const defaults = [
    {
      title: "John Mempermudah Menemukan Link Resmi",
      name: "Rizqan Mahardika",
      text: "Saya mengenal Pubtogel melalui situs alternatif John dan menurut saya jalur resminya lebih mudah dikenali."
    },
    {
      title: "Daftar Pasaran Lebih Teratur",
      name: "Davin Prakoso",
      text: "Cara Pubtogel menyusun daftar togel online terasa lebih rapi sehingga mudah dipahami."
    },
    {
      title: "Referensi Toto 4D Lebih Jelas",
      name: "Arvindo Saputra",
      text: "Link Toto 4D yang tersedia membantu saya menemukan informasi penting dalam satu tempat."
    }
  ];

  const items = Array.isArray(testimoniItems) && testimoniItems.length
    ? testimoniItems
    : defaults;

  return items.map(item => `
<article class="tgl138-testi">
  <div class="tgl138-top">
    <div class="tgl138-title">${escapeHtml(safeString(item.title, "Testimoni Pengguna"))}</div>
    <div class="tgl138-stars">★★★★★</div>
  </div>
  <div class="tgl138-name">${escapeHtml(safeString(item.name, "Pengguna"))}</div>
  <div class="tgl138-text">${escapeHtml(safeString(item.text, "Konten testimoni contoh."))}</div>
</article>`.trim()).join('\n');
}

// ======================================================
// FALLBACK CONTENT
// ======================================================
function buildFallbackDesc(keyword, brand) {
  return `${keyword} dari ${brand} disusun sebagai halaman informatif yang membahas konteks utama, ringkasan isi, serta poin-poin penting dengan gaya bahasa yang lebih natural, nyaman dibaca, dan relevan untuk pengguna mobile. Konten ini dibuat agar pembaca dapat memahami inti topik dengan cepat tanpa kehilangan detail penting, mulai dari penjelasan umum, manfaat, hingga struktur halaman yang lebih rapi. Dengan penyusunan yang lebih panjang, deskripsi ini juga membantu memperkuat relevansi topik, memperjelas fokus artikel, dan membuat halaman terasa lebih lengkap ketika dibuka dari perangkat apa pun.`;
}

function buildFallbackArticle(keyword, brand) {
  return [
    `${keyword} menjadi topik yang banyak dicari karena memberikan informasi yang relevan bagi pengguna yang ingin memahami akses, referensi, dan susunan konten dengan lebih jelas. Dalam konteks pembaca modern, artikel yang baik harus terasa natural, mudah dipindai, dan memiliki alur yang nyaman dibaca dari awal hingga akhir. Karena itu, pembahasan ${keyword} disusun dengan gaya yang lebih informatif, ringkas namun tetap kaya konteks agar sesuai untuk kebutuhan Google Discover.`,
    `Brand ${brand} hadir sebagai identitas yang membantu memperkuat kepercayaan pembaca terhadap isi artikel. Ketika sebuah halaman memadukan keyword utama, struktur yang rapi, dan penjelasan yang konsisten, peluang konten untuk dibaca sampai selesai akan lebih besar. Itulah sebabnya penulisan artikel tidak hanya fokus pada kata kunci, tetapi juga pada pengalaman pengguna, keterbacaan, dan susunan paragraf yang mengalir dengan baik.`,
    `Dalam praktik SEO yang baik, artikel seharusnya tidak terlalu pendek karena pembahasan yang dangkal cenderung kurang membantu pembaca. Sebaliknya, artikel yang cukup panjang memberi ruang untuk menjelaskan konteks, manfaat, karakteristik, dan poin-poin penting lain secara lebih lengkap. Untuk kebutuhan Discover, isi yang terasa manusiawi dan informatif biasanya lebih disukai dibanding teks yang terlalu kaku atau terasa dibuat hanya untuk mesin pencari.`,
    `Melalui penyusunan yang lebih terarah, ${keyword} dapat dijelaskan dari beberapa sudut pandang seperti fungsi, keunggulan, kemudahan akses, dan alasan mengapa pembaca tertarik untuk melihat informasi lebih lanjut. Penjelasan seperti ini membantu pembaca memahami topik tanpa harus membuka banyak sumber berbeda. Selain itu, penempatan CTA yang halus di dalam paragraf juga dapat membuat halaman terasa lebih hidup tanpa mengganggu kenyamanan membaca.`,
    `Kualitas artikel juga dipengaruhi oleh variasi kalimat, panjang paragraf, dan pemilihan kata yang tidak berulang secara berlebihan. Dengan menyusun konten sekitar 500 sampai 800 kata, halaman akan terasa lebih matang, lebih informatif, dan lebih cocok untuk tampilan artikel unggulan. Pada saat yang sama, struktur yang rapi memudahkan pembaca menelusuri isi halaman secara cepat, terutama di perangkat mobile yang menjadi mayoritas trafik Discover.`,
    `Pada akhirnya, ${keyword} dengan dukungan brand ${brand} harus tampil sebagai konten yang mudah dipahami, cukup panjang, dan tetap enak dibaca. Kombinasi antara judul yang kuat, deskripsi yang panjang, paragraf yang informatif, FAQ yang relevan, serta testimoni yang mendukung akan membantu artikel terlihat lebih lengkap. Dengan pendekatan ini, halaman memiliki peluang lebih baik untuk diterima sebagai konten yang layak tampil di Google Discover.`
  ];
}

function validateAIData(data, keyword, brand) {
  if (!data || typeof data !== 'object') return null;

  // title
  let title = safeString(data.title);
  if (!title) title = `${keyword} - ${brand}`;
  if (title.length > 80) title = title.substring(0, 80).trim();

  // meta description
  let metaDesc = safeString(data.metaDesc);
  if (!metaDesc) metaDesc = `${keyword} terbaru dan informatif dari ${brand}.`;
  if (metaDesc.length > 160) metaDesc = metaDesc.substring(0, 160).trim();

  // long description
  let desc = safeString(data.desc);
  if (!desc) desc = buildFallbackDesc(keyword, brand);

  // article
  let article = data.article;
  if (Array.isArray(article)) {
    article = article.map(p => safeString(p)).filter(Boolean);
  } else if (typeof article === 'string') {
    article = article.split(/\n{2,}/).map(p => safeString(p)).filter(Boolean);
  } else {
    article = [];
  }

  const totalWords = wordCount(article.join(' '));
  if (article.length < 5 || totalWords < 500 || totalWords > 800) {
    article = buildFallbackArticle(keyword, brand);
  } else {
    article = article.slice(0, 8);
  }

  // faq answers
  let faqAnswers = Array.isArray(data.faqAnswers) ? data.faqAnswers : [];
  faqAnswers = faqAnswers.map(item => safeString(item)).filter(Boolean);
  while (faqAnswers.length < FAQ_QUESTIONS.length) {
    faqAnswers.push("Informasi ini disajikan untuk membantu pengguna memahami topik dengan lebih mudah.");
  }
  faqAnswers = faqAnswers.slice(0, FAQ_QUESTIONS.length);

  // testimoni
  let testimoniItems = Array.isArray(data.testimoniItems) ? data.testimoniItems : [];
  testimoniItems = testimoniItems.map(item => ({
    title: safeString(item?.title, "Testimoni Pengguna"),
    name: safeString(item?.name, "Pengguna"),
    text: safeString(item?.text, "Konten testimoni contoh.")
  }));

  if (testimoniItems.length === 0) {
    testimoniItems = [
      { title: "Kemudahan Akses", name: "Rizqan", text: "Halaman terasa lebih rapi dan mudah dipahami." },
      { title: "Informasi Lebih Jelas", name: "Davin", text: "Susunan kontennya membantu saya membaca lebih cepat." },
      { title: "Tampilan Nyaman", name: "Arvindo", text: "Strukturnya sederhana dan enak dilihat." }
    ];
  }

  return {
    title,
    metaDesc,
    desc,
    article,
    faqAnswers,
    testimoniItems
  };
}

// ======================================================
// OPENAI TEXT GENERATION
// ======================================================
async function generateAIContent(keyword, brand, loginUrl) {
  const prompt = `
Buat JSON murni tanpa markdown, tanpa code block.

Keyword: "${keyword}"
Brand: "${brand}"
Link: "${loginUrl}"

Format wajib:
{
  "title": "string",
  "metaDesc": "string",
  "desc": "string",
  "article": [
    "paragraf 1",
    "paragraf 2",
    "paragraf 3",
    "paragraf 4",
    "paragraf 5",
    "paragraf 6"
  ],
  "faqAnswers": [
    "jawaban untuk FAQ 1",
    "jawaban untuk FAQ 2",
    "jawaban untuk FAQ 3",
    "jawaban untuk FAQ 4",
    "jawaban untuk FAQ 5",
    "jawaban untuk FAQ 6"
  ],
  "testimoniItems": [
    { "title": "string", "name": "string", "text": "string" },
    { "title": "string", "name": "string", "text": "string" },
    { "title": "string", "name": "string", "text": "string" }
  ]
}

Aturan:
- title maksimal 80 karakter
- metaDesc maksimal 160 karakter
- desc panjang sekitar 180-230 kata
- article total 500-800 kata
- article minimal 5 paragraf, ideal 6 paragraf
- faqAnswers harus menjawab 6 pertanyaan yang sudah ditentukan
- testimoniItems minimal 3 item
- gunakan bahasa Indonesia
- output harus valid JSON saja
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const text = completion.choices[0].message.content;
    const rawData = JSON.parse(text);

    return validateAIData(rawData, keyword, brand);
  } catch (e) {
    console.error('❌ OPENAI TEXT ERROR:', e.message);
    return validateAIData(null, keyword, brand);
  }
}

// ======================================================
// OPENAI IMAGE PROMPT
// ======================================================
function buildImagePrompt(keyword, brand) {
  return `
Buat desain banner promosi digital ultra premium bertema togel online dengan nuansa anime fantasy futuristik, kualitas 8K, sangat detail, pencahayaan sinematik, warna dominan ungu neon, emas, hitam, dan efek petir listrik berwarna ungu.

Keyword utama visual: ${keyword}
Brand utama: ${brand}

Karakter utama berada di tengah berupa gadis anime cantik dengan rambut hitam panjang berkilau, mata ungu bercahaya, wajah imut dan elegan, mengenakan hoodie putih-ungu modern, sarung tangan hitam, pakaian ninja bergaya anime, pose mengangkat dua jari dengan efek energi petir ungu mengelilingi tangan dan tubuh.

Latar belakang berupa kuil Jepang futuristik di malam hari dengan pohon sakura bermekaran, langit penuh cahaya neon, partikel cahaya, kabut tipis, dan suasana cyber fantasy.

Di sisi kiri terdapat 4 panel fitur premium dengan icon neon:
- BETTING 4D – Diskon Terbesar
- AMAN & TERPERCAYA – Sistem Keamanan Terbaik
- DEPOSIT & WD – Cepat Tanpa Ribet
- BONUS MEMBER – Setiap Hari

Di sisi kanan terdapat kartu bertuliskan "TOGEL 4D PRIMER ASIA", bola togel mengambang bernomor 8, 1, 3, dan 4 dengan efek glow ungu.

Bagian tengah bawah terdapat tulisan besar:

LINK TOTO 4D

menggunakan font 3D premium warna emas dengan outline putih dan efek neon ungu, sangat mencolok.

Di bagian paling bawah terdapat tulisan:

SITUS RESMI ${brand}
LINK TOTO 4D TERPERCAYA
DAFTAR TOGEL ONLINE PRIMER ASIA

Tambahkan logo premium di pojok kiri atas bertuliskan:

${brand}

menggunakan font gaming modern warna emas dan biru dengan emblem berbentuk perisai serta sayap emas.

Tambahkan efek petir, cahaya neon, bunga sakura beterbangan, kilauan emas, lens flare, depth of field, ultra realistic anime illustration, highly detailed, sharp focus, HDR, cinematic lighting, masterpiece, trending on ArtStation, tanpa watermark, tanpa blur, komposisi simetris, kualitas poster promosi profesional.
`.trim();
}

function sanitizePublicId(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uploadBufferToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ai-banners',
        public_id: publicId,
        resource_type: 'image'
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

async function generateAndUploadBanner(keyword, brand, slug) {
  try {
    const prompt = buildImagePrompt(keyword, brand);

    const image = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024',
      quality: 'hd',
      n: 1
    });

    const imageUrl = image?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('OpenAI tidak mengembalikan URL gambar.');
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Gagal mengambil gambar hasil generate: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const publicId = sanitizePublicId(`${brand}-${keyword}-${slug}-${Date.now()}`);

    try {
      const upload = await uploadBufferToCloudinary(buffer, publicId);
      return upload.secure_url;
    } catch (uploadErr) {
      console.error('❌ CLOUDINARY UPLOAD ERROR:', uploadErr.message);
      return imageUrl; // fallback: pakai URL hasil generate OpenAI
    }
  } catch (e) {
    console.error('❌ IMAGE GENERATION ERROR:', e.message);
    return null;
  }
}

// ======================================================
// REPLACEMENT ENGINE
// ======================================================
function applyReplacement(html, data, bannerUrl, sess) {
  const title = escapeHtml(data.title);
  const metaDesc = escapeHtml(data.metaDesc);
  const desc = escapeHtml(data.desc);

  const canonicalUrl = normalizeUrl(sess.baseUrl);
  const ampUrl = normalizeUrl(sess.ampUrl);
  const altUrl = normalizeUrl(sess.altUrl || sess.baseUrl);
  const loginUrl = normalizeUrl(sess.loginUrl);

  const articleHtml = buildArticleHtml(data.article, loginUrl);
  const faqItemsHtml = buildFaqItemsHtml(data.faqAnswers);
  const testimoniItemsHtml = buildTestimoniItemsHtml(data.testimoniItems);

  let res = html;

  // placeholders modern
  res = replaceAllText(res, '{{TITLE}}', title);
  res = replaceAllText(res, '{{META_DESC}}', metaDesc);
  res = replaceAllText(res, '{{DESC}}', desc);
  res = replaceAllText(res, '{{CANONICAL_URL}}', canonicalUrl);
  res = replaceAllText(res, '{{AMP_URL}}', ampUrl);
  res = replaceAllText(res, '{{ALT_URL}}', altUrl);
  res = replaceAllText(res, '{{LOGIN_URL}}', loginUrl);
  res = replaceAllText(res, '{{BANNER_URL}}', bannerUrl || '');
  res = replaceAllText(res, '{{ARTICLE}}', articleHtml);
  res = replaceAllText(res, '{{FAQ_TITLE}}', 'FAQ Eksklusif');
  res = replaceAllText(res, '{{TESTIMONI_TITLE}}', 'TESTIMONI PENGGUNA');
  res = replaceAllText(res, '{{FAQ_ITEMS}}', faqItemsHtml);
  res = replaceAllText(res, '{{TESTIMONI_ITEMS}}', testimoniItemsHtml);

  // fallback template lama
  res = replaceAllText(
    res,
    'TOTO TOGEL 138: Situs Alternatif John Resmi Link Toto 4D Terpercaya Dan Daftar Togel Online Primer Asia',
    data.title
  );

  res = replaceAllText(res, 'TOTO TOGEL 138', sess.brandName);

  const oldDesc = 'TOTO TOGEL 138 adalah situs alternatif John Resmi Toto 4D terpercaya & daftar togel online. Nikmati game mudah WD, sistem aman, nyaman, jaminan proses top up instan dan beragam pilihan primer asia ada di sini.';
  res = replaceAllText(res, oldDesc, data.desc);

  res = replaceAllText(res, 'https://johncockerillda.com/', canonicalUrl);
  res = replaceAllText(res, 'https://toto.johncockerillda.com/', ampUrl);
  res = res.replace(/href="https:\/\/toto\.johncockerillda\.com\/"/g, `href="${loginUrl}"`);

  if (bannerUrl) {
    res = replaceAllText(
      res,
      'https://pixel.gambar-lp.com/santos/banner-togel138-situs-toto4d.webp',
      bannerUrl
    );
    res = replaceAllText(
      res,
      'https://pixel.gambar-lp.com/gdn/togel138/amp/banner-99.webp',
      bannerUrl
    );
  }

  return res;
}

// ======================================================
// BOT HANDLERS
// ======================================================
bot.start((ctx) => {
  ctx.session = {};
  ctx.reply(
    'Auto-LP Pro siap generate.\nTekan tombol di bawah untuk mulai.',
    Markup.inlineKeyboard([
      [Markup.button.callback('Mulai Sekarang', 'start_steps')]
    ])
  );
});

bot.action('start_steps', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.step = 1;
  ctx.reply('Langkah 1: Masukkan NAMA BRAND');
});

bot.on('text', async (ctx) => {
  const sess = ctx.session || {};
  if (!sess.step) return;

  const input = ctx.message.text.trim();

  // STEP 1 - BRAND
  if (sess.step === 1) {
    sess.brandName = input || 'Brand';
    sess.step = 2;
    return ctx.reply('Langkah 2: URL Canonical Utama');
  }

  // STEP 2 - CANONICAL
  if (sess.step === 2) {
    if (!isValidUrl(input)) {
      return ctx.reply('❌ URL Canonical tidak valid. Contoh: https://domain.com');
    }
    sess.baseUrl = normalizeUrl(input);
    sess.step = 3;
    return ctx.reply('Langkah 3: URL AMP Utama');
  }

  // STEP 3 - AMP
  if (sess.step === 3) {
    if (!isValidUrl(input)) {
      return ctx.reply('❌ URL AMP tidak valid. Contoh: https://amp.domain.com');
    }
    sess.ampUrl = normalizeUrl(input);
    sess.step = 4;
    return ctx.reply('Langkah 4: URL Alternatif');
  }

  // STEP 4 - ALT
  if (sess.step === 4) {
    if (!isValidUrl(input)) {
      return ctx.reply('❌ URL Alternatif tidak valid. Contoh: https://alt.domain.com');
    }
    sess.altUrl = normalizeUrl(input);
    sess.step = 5;
    return ctx.reply('Langkah 5: Link Login (Tujuan)');
  }

  // STEP 5 - LOGIN
  if (sess.step === 5) {
    if (!isValidUrl(input)) {
      return ctx.reply('❌ Link Login tidak valid. Contoh: https://domain.com/login');
    }
    sess.loginUrl = normalizeUrl(input);
    sess.step = 6;
    return ctx.reply('Langkah 6: Masukkan KEYWORDS (pisahkan dengan koma)');
  }

  // STEP 6 - KEYWORDS
  if (sess.step === 6) {
    const keywords = input
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      return ctx.reply('❌ Keywords kosong. Masukkan minimal 1 keyword.');
    }

    const zip = new AdmZip();
    let successCount = 0;

    await ctx.reply(`⚙ Memproses ${keywords.length} keyword...`);

    if (!fs.existsSync(TEMPLATE_PATH)) {
      return ctx.reply('❌ Error: template.html tidak ada!');
    }
    if (!fs.existsSync(AMP_PATH)) {
      return ctx.reply('❌ Error: amp.html tidak ada!');
    }

    const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const ampHtml = fs.readFileSync(AMP_PATH, 'utf8');

    for (const kw of keywords) {
      try {
        const data = await generateAIContent(kw, sess.brandName, sess.loginUrl);

        if (!data) {
          console.log(`❌ Data invalid untuk keyword: ${kw}`);
          continue;
        }

        const slug = makeSlug(kw);

        // generate image -> upload Cloudinary -> pakai URL hasil upload
        let bannerUrl = await generateAndUploadBanner(kw, sess.brandName, slug);

        if (!bannerUrl) {
          console.warn(`⚠ Banner gagal untuk keyword: ${kw}`);
          bannerUrl = '';
        }

        const lp = applyReplacement(templateHtml, data, bannerUrl, sess);
        const amp = applyReplacement(ampHtml, data, bannerUrl, sess);

        zip.addFile(`${slug}.html`, Buffer.from(lp, 'utf8'));
        zip.addFile(`amp-${slug}.html`, Buffer.from(amp, 'utf8'));

        successCount++;
        await ctx.reply(`✅ Berhasil: ${kw}`);
      } catch (e) {
        console.error(`❌ Gagal keyword ${kw}:`, e.message);
      }
    }

    if (successCount > 0) {
      await ctx.replyWithDocument({
        source: zip.toBuffer(),
        filename: `Export_${Date.now()}.zip`
      });
    } else {
      await ctx.reply('❌ Gagal total.');
    }

    ctx.session.step = 0;
  }
});

bot.catch((err) => {
  console.error('BOT ERROR:', err);
});

bot.launch();
console.log('🔥 BOT ONLINE!');
