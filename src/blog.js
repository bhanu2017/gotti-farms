import { db, tx } from './db.js';
import { HttpError } from './store.js';

export const POST_CATEGORIES = ['pests', 'diseases', 'soil', 'water', 'general'];

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL DEFAULT 'general',
    image       TEXT NOT NULL DEFAULT '',
    title_en    TEXT NOT NULL,
    summary_en  TEXT NOT NULL DEFAULT '',
    body_en     TEXT NOT NULL,
    title_te    TEXT NOT NULL DEFAULT '',
    summary_te  TEXT NOT NULL DEFAULT '',
    body_te     TEXT NOT NULL DEFAULT '',
    published   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, created_at);
`);

// ---------------- Queries ----------------

const listColumns = `id, slug, category, image, title_en, summary_en, title_te, summary_te, published, created_at, updated_at,
  length(body_en) AS length_en, length(body_te) AS length_te`;

export function listPosts({ category, q, limit, includeDrafts = false } = {}) {
  const where = []; const params = [];
  if (!includeDrafts) where.push('published = 1');
  if (category && POST_CATEGORIES.includes(category)) { where.push('category = ?'); params.push(category); }
  if (q) {
    where.push('(title_en LIKE ? OR summary_en LIKE ? OR body_en LIKE ? OR title_te LIKE ? OR summary_te LIKE ? OR body_te LIKE ?)');
    const like = `%${q}%`; params.push(like, like, like, like, like, like);
  }
  const lim = Math.min(Number(limit) || 200, 200);
  return db.prepare(`SELECT ${listColumns} FROM posts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC, id DESC LIMIT ?`).all(...params, lim);
}

export function getPostBySlug(slug, { includeDrafts = false } = {}) {
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(String(slug ?? ''));
  if (!post || (!post.published && !includeDrafts)) return null;
  return post;
}

export const getPostById = (id) => db.prepare('SELECT * FROM posts WHERE id = ?').get(id);

function slugify(text) {
  const base = String(text).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[\s_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'post';
  let slug = base; let n = 2;
  while (db.prepare('SELECT 1 FROM posts WHERE slug = ?').get(slug)) slug = `${base}-${n++}`;
  return slug;
}

function cleanPost(input) {
  const s = (v, max) => String(v ?? '').trim().slice(0, max);
  const p = {
    category: s(input.category, 20),
    image: s(input.image, 500),
    title_en: s(input.title_en, 150), summary_en: s(input.summary_en, 400), body_en: s(input.body_en, 50000),
    title_te: s(input.title_te, 200), summary_te: s(input.summary_te, 600), body_te: s(input.body_te, 80000),
    published: input.published ? 1 : 0,
  };
  if (!POST_CATEGORIES.includes(p.category)) throw new HttpError(400, 'Choose a topic for the post.');
  if (p.title_en.length < 3) throw new HttpError(400, 'Enter an English title.');
  if (p.body_en.length < 20) throw new HttpError(400, 'Write the English article (at least a few sentences).');
  if ((p.title_te || p.body_te) && !(p.title_te && p.body_te)) throw new HttpError(400, 'Fill in both the Telugu title and Telugu article, or leave both empty.');
  if (p.image && !/^(\/(images|uploads)\/[\w.\-]+|https:\/\/\S+)$/.test(p.image)) throw new HttpError(400, 'Cover photo must be an uploaded image.');
  return p;
}

export function createPost(input) {
  const p = cleanPost(input);
  const slug = slugify(p.title_en);
  const r = db.prepare(`INSERT INTO posts (slug, category, image, title_en, summary_en, body_en, title_te, summary_te, body_te, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(slug, p.category, p.image, p.title_en, p.summary_en, p.body_en, p.title_te, p.summary_te, p.body_te, p.published);
  return getPostById(r.lastInsertRowid);
}

export function updatePost(id, input) {
  if (!getPostById(id)) throw new HttpError(404, 'Post not found.');
  const p = cleanPost(input);
  // The link (slug) stays the same after publishing so shared links keep working.
  db.prepare(`UPDATE posts SET category=?, image=?, title_en=?, summary_en=?, body_en=?, title_te=?, summary_te=?, body_te=?,
    published=?, updated_at=datetime('now') WHERE id=?`)
    .run(p.category, p.image, p.title_en, p.summary_en, p.body_en, p.title_te, p.summary_te, p.body_te, p.published, id);
  return getPostById(id);
}

export function deletePost(id) {
  if (!db.prepare('DELETE FROM posts WHERE id = ?').run(id).changes) throw new HttpError(404, 'Post not found.');
}

// ---------------- Starter posts (added once, on first run) ----------------

const STARTER_POSTS = [
  {
    slug: 'control-whiteflies-and-aphids-on-vegetables',
    category: 'pests',
    image: '/images/tip-pests.jpg',
    title_en: 'How to control whiteflies and aphids on vegetables',
    summary_en: 'Sticky, yellowing, curled leaves? Small sap-sucking pests are often the cause. Here is how to spot them early and control them with low-cost methods.',
    body_en: `Whiteflies and aphids are tiny insects that suck sap from the underside of leaves. They attack brinjal, tomato, chilli, okra and many other vegetables, and whiteflies also spread viral diseases such as leaf curl.

## Signs to look for

- Leaves turn yellow, curl, or look shiny and sticky
- A black, sooty coating appears on leaves
- Clouds of tiny white insects fly up when you shake the plant
- Groups of small green or black insects sit on tender shoots

## What you can do

- **Check the underside of leaves twice a week.** Catching pests early makes control much easier.
- **Put up yellow sticky traps** at crop height, about 10 per acre, to monitor and catch flying adults.
- **Spray 5% neem seed kernel extract (NSKE)** or a neem oil product as directed on its label. Spray in the early morning or evening and wet the underside of the leaves.
- **To make 5% NSKE,** soak 50 g of crushed neem seed kernels in 1 litre of water overnight, filter it, and add a little soap solution before spraying.
- **Remove weeds** around the field, because many of them shelter these pests.
- **Avoid too much nitrogen fertilizer.** Soft, lush growth attracts sap-sucking pests.
- **Protect helpful insects** such as ladybird beetles and spiders by avoiding unnecessary chemical sprays.

## When to get expert help

If the attack keeps spreading after two neem sprays, or many plants show curled, stunted leaves, contact your village agriculture assistant or the nearest Krishi Vigyan Kendra (KVK) before using any chemical pesticide. They can recommend the right product and dose for your crop.`,
    title_te: 'కూరగాయల పంటల్లో తెల్లదోమ, పేనుబంకను ఎలా నివారించాలి',
    summary_te: 'ఆకులు జిగటగా, పసుపు రంగులోకి మారి, ముడుచుకుపోతున్నాయా? రసం పీల్చే చిన్న పురుగులే తరచూ దీనికి కారణం. వాటిని ముందుగానే గుర్తించి, తక్కువ ఖర్చుతో ఎలా నివారించాలో తెలుసుకోండి.',
    body_te: `తెల్లదోమ, పేనుబంక ఆకుల అడుగు భాగంలో ఉండి రసం పీల్చే చిన్న పురుగులు. ఇవి వంగ, టమాటా, మిరప, బెండ వంటి ఎన్నో కూరగాయల పంటలను ఆశిస్తాయి. తెల్లదోమ ఆకుముడత వంటి వైరస్ తెగుళ్లను కూడా వ్యాపింపజేస్తుంది.

## గమనించాల్సిన లక్షణాలు

- ఆకులు పసుపు రంగులోకి మారడం, ముడుచుకుపోవడం లేదా జిగటగా మెరవడం
- ఆకులపై నల్లని మసి లాంటి పొర ఏర్పడటం
- మొక్కను కదిలిస్తే చిన్న తెల్లని పురుగులు గుంపులుగా ఎగరడం
- లేత చిగుళ్లపై చిన్న ఆకుపచ్చ లేదా నల్లని పురుగుల గుంపులు

## నివారణ చర్యలు

- **వారానికి రెండుసార్లు ఆకుల అడుగు భాగాన్ని పరిశీలించండి.** ముందుగానే గుర్తిస్తే నివారణ చాలా సులభం.
- **పసుపు రంగు జిగురు అట్టలను** పంట ఎత్తులో, ఎకరానికి సుమారు 10 చొప్పున అమర్చండి. ఎగిరే పురుగులు వాటికి అతుక్కుంటాయి.
- **5% వేప గింజల కషాయం (NSKE)** లేదా వేప నూనె మందును లేబుల్‌పై సూచించిన విధంగా పిచికారీ చేయండి. ఉదయం లేదా సాయంత్రం వేళల్లో, ఆకుల అడుగు భాగం తడిసేలా పిచికారీ చేయాలి.
- **5% వేప గింజల కషాయం తయారీ:** 50 గ్రాముల దంచిన వేప గింజలను 1 లీటరు నీటిలో రాత్రంతా నానబెట్టి, వడకట్టి, కొద్దిగా సబ్బు ద్రావణం కలిపి పిచికారీ చేయండి.
- **పొలం చుట్టూ కలుపు మొక్కలను తొలగించండి.** వాటిలో చాలా వరకు ఈ పురుగులకు ఆశ్రయం ఇస్తాయి.
- **నత్రజని ఎరువులు అధికంగా వాడకండి.** లేతగా, ఏపుగా పెరిగిన మొక్కలకు రసం పీల్చే పురుగులు ఎక్కువగా ఆకర్షితమవుతాయి.
- **అక్షింతల పురుగులు, సాలీడ్లు వంటి మిత్ర పురుగులను కాపాడండి.** అనవసరమైన రసాయన పిచికారీలు చేయకండి.

## నిపుణుల సలహా ఎప్పుడు తీసుకోవాలి

రెండుసార్లు వేప మందు పిచికారీ చేసిన తర్వాత కూడా ఉధృతి పెరుగుతుంటే, లేదా చాలా మొక్కల ఆకులు ముడుచుకుని ఎదుగుదల ఆగిపోతే, ఏదైనా రసాయన పురుగుమందు వాడే ముందు మీ గ్రామ వ్యవసాయ సహాయకుడిని లేదా దగ్గరలోని కృషి విజ్ఞాన కేంద్రాన్ని (KVK) సంప్రదించండి. మీ పంటకు సరైన మందు, మోతాదును వారు సూచిస్తారు.`,
  },
  {
    slug: 'leaf-curl-in-chilli-prevention',
    category: 'diseases',
    image: '/images/p-farm-fresh-chilli.jpg',
    title_en: 'Leaf curl in chilli: prevention is the only cure',
    summary_en: 'Leaf curl can wipe out a chilli crop. An infected plant cannot be cured, so the key is protecting seedlings and controlling the insects that spread it.',
    body_en: `Leaf curl is one of the most damaging problems in chilli, especially in Andhra Pradesh. Leaves curl upwards or downwards and become small and crinkled, and the plants stop growing and flowering. It is caused by a virus spread by whiteflies. Thrips and mites cause similar curling, so the problem is often a mix of all three.

## Why prevention matters

No spray can cure a plant infected with the virus. Sprays only control the insects that spread it. That is why the first 30 to 45 days after transplanting are the most important.

## Steps to protect your crop

- **Raise seedlings under insect-proof net** (40 to 50 mesh) so they reach the field free of infection.
- **Plant 2 to 3 rows of maize or jowar around the field** as a barrier crop. It stops many flying insects from entering.
- **Pull out and destroy plants with curled leaves** as soon as you see them, far away from the field. Do not leave them on the bunds.
- **Control whiteflies and thrips early** with yellow and blue sticky traps and neem-based sprays.
- **Do not grow chilli in the same field season after season.** Rotate with cereals or pulses.
- **Keep the field and bunds free of weeds,** which shelter the virus and the insects.

## Get the problem identified

Virus, thrips and mites each need a different treatment. Show a few affected plants to your agriculture officer or the nearest KVK before buying chemicals. The wrong spray wastes money and harms helpful insects.`,
    title_te: 'మిరపలో ఆకుముడత: నివారణే ఏకైక మార్గం',
    summary_te: 'ఆకుముడత మిరప పంటను పూర్తిగా దెబ్బతీయగలదు. ఒకసారి సోకిన మొక్కను నయం చేయలేము. కాబట్టి నారును కాపాడటం, ఈ తెగులును వ్యాపింపజేసే పురుగులను నియంత్రించడమే ముఖ్యం.',
    body_te: `మిరపలో, ముఖ్యంగా ఆంధ్రప్రదేశ్‌లో, ఎక్కువ నష్టం కలిగించే సమస్యల్లో ఆకుముడత ఒకటి. ఆకులు పైకి లేదా కిందికి ముడుచుకుని, చిన్నవిగా, ముడతలు పడినట్లుగా మారతాయి. మొక్కల ఎదుగుదల, పూత ఆగిపోతాయి. ఇది తెల్లదోమ ద్వారా వ్యాపించే వైరస్ వల్ల వస్తుంది. తామర పురుగులు, నల్లి కూడా ఇలాంటి ముడతనే కలిగిస్తాయి, కాబట్టి తరచూ ఈ మూడూ కలిసి సమస్యగా మారతాయి.

## నివారణ ఎందుకు ముఖ్యం

వైరస్ సోకిన మొక్కను ఏ మందూ నయం చేయలేదు. పిచికారీలు దానిని వ్యాపింపజేసే పురుగులను మాత్రమే నియంత్రిస్తాయి. అందుకే నాటిన తర్వాత మొదటి 30 నుండి 45 రోజులు చాలా కీలకం.

## పంటను కాపాడుకునే మార్గాలు

- **నారును పురుగులు చొరబడని వల (40 నుండి 50 మెష్) కింద పెంచండి.** అప్పుడు నారు తెగులు లేకుండా పొలానికి చేరుతుంది.
- **పొలం చుట్టూ 2 నుండి 3 వరుసల మొక్కజొన్న లేదా జొన్నను రక్షణ పంటగా వేయండి.** ఇది ఎగిరే పురుగులు పొలంలోకి రాకుండా అడ్డుకుంటుంది.
- **ముడత ఆకులు ఉన్న మొక్కలను గమనించిన వెంటనే పీకి, పొలానికి దూరంగా నాశనం చేయండి.** వాటిని గట్లపై వదిలేయకండి.
- **తెల్లదోమ, తామర పురుగులను మొదట్లోనే నియంత్రించండి.** పసుపు, నీలం రంగు జిగురు అట్టలు, వేప ఆధారిత మందులు వాడండి.
- **ఒకే పొలంలో ప్రతి సీజన్ మిరప వేయకండి.** తృణధాన్యాలు లేదా పప్పుధాన్యాలతో పంట మార్పిడి చేయండి.
- **పొలం, గట్లపై కలుపు లేకుండా చూసుకోండి.** కలుపు మొక్కలు వైరస్‌కు, పురుగులకు ఆశ్రయం ఇస్తాయి.

## సమస్యను సరిగ్గా గుర్తించండి

వైరస్, తామర పురుగులు, నల్లి ఒక్కొక్కదానికి వేర్వేరు చికిత్స అవసరం. మందులు కొనే ముందు, కొన్ని దెబ్బతిన్న మొక్కలను మీ వ్యవసాయ అధికారికి లేదా దగ్గరలోని KVKకి చూపించండి. తప్పు మందు డబ్బు వృథా చేస్తుంది, మిత్ర పురుగులకు హాని చేస్తుంది.`,
  },
  {
    slug: 'how-to-take-a-soil-sample',
    category: 'soil',
    image: '/images/tip-soil.jpg',
    title_en: 'How to take a soil sample for testing',
    summary_en: 'A soil test tells you exactly which nutrients your field needs, so you spend less on fertilizer. Here is how to collect a sample the right way.',
    body_en: `Many farmers apply the same fertilizers every season without knowing what the soil actually needs. A soil test shows the levels of nitrogen, phosphorus, potassium, organic carbon and pH in your field. With it you can cut unnecessary fertilizer costs and get better yields.

## When to collect

Collect samples after harvest and before applying any fertilizer or manure for the next crop. Test each field once every two to three years.

## How to collect a good sample

1. **Divide the field** if parts of it differ in colour, slope or crop history, and take a separate sample from each part.
2. **Choose 8 to 10 spots** in a zig-zag pattern across the field.
3. **Clear the surface** of grass, stones and crop residue at each spot.
4. **Dig a V-shaped pit 15 cm (6 inches) deep,** then cut a thin slice of soil from one side of the pit, from top to bottom.
5. **Mix all the slices** together in a clean bucket or on a clean sheet.
6. **Reduce it to about half a kilo.** Spread the soil in a circle, divide it into four parts, and discard two opposite parts. Repeat until about 500 g remains.
7. **Dry it in the shade,** put it in a clean cloth or plastic bag, and label it with your name, field details and the crop you plan to grow.

## Avoid these spots

Do not take samples near bunds, trees, irrigation channels, compost or manure heaps, or places where fertilizer was recently spread. They give misleading results.

## Where to test

Give the sample to your village agriculture assistant or the nearest government soil testing laboratory. Under the Soil Health Card scheme you receive a card with your results and fertilizer recommendations for your crop.`,
    title_te: 'భూసార పరీక్ష కోసం మట్టి నమూనాను ఎలా సేకరించాలి',
    summary_te: 'మీ పొలానికి ఏ పోషకాలు ఎంత అవసరమో భూసార పరీక్ష ఖచ్చితంగా చెబుతుంది. దీనివల్ల ఎరువుల ఖర్చు తగ్గుతుంది. మట్టి నమూనాను సరైన పద్ధతిలో ఎలా తీయాలో తెలుసుకోండి.',
    body_te: `చాలా మంది రైతులు నేలకు నిజంగా ఏమి అవసరమో తెలియకుండానే ప్రతి సీజన్ ఒకే రకమైన ఎరువులు వేస్తుంటారు. భూసార పరీక్ష మీ పొలంలో నత్రజని, భాస్వరం, పొటాష్, సేంద్రియ కర్బనం, ఉదజని సూచిక (pH) స్థాయిలను తెలియజేస్తుంది. దీనితో అనవసరమైన ఎరువుల ఖర్చు తగ్గించుకుని మంచి దిగుబడి పొందవచ్చు.

## ఎప్పుడు సేకరించాలి

పంట కోత తర్వాత, తదుపరి పంటకు ఎరువులు లేదా పశువుల ఎరువు వేయక ముందు నమూనాలు సేకరించండి. ప్రతి పొలాన్ని రెండు మూడు సంవత్సరాలకు ఒకసారి పరీక్ష చేయించండి.

## సరైన నమూనా తీసే విధానం

1. **పొలాన్ని విభజించండి.** పొలంలో కొన్ని భాగాలు రంగు, వాలు లేదా పంటల చరిత్రలో వేరుగా ఉంటే, ప్రతి భాగం నుండి వేరుగా నమూనా తీయండి.
2. **పొలం అంతటా జిగ్‌జాగ్ పద్ధతిలో 8 నుండి 10 చోట్లను ఎంచుకోండి.**
3. **ప్రతి చోట ఉపరితలంపై ఉన్న గడ్డి, రాళ్లు, పంట అవశేషాలను తొలగించండి.**
4. **15 సెం.మీ. (6 అంగుళాలు) లోతులో V ఆకారపు గుంత తవ్వండి.** తర్వాత గుంత ఒక వైపు నుండి పై నుండి కింది వరకు పలుచని మట్టి పొరను కోయండి.
5. **సేకరించిన మట్టి మొత్తాన్ని** శుభ్రమైన బకెట్‌లో లేదా శుభ్రమైన పట్టాపై బాగా కలపండి.
6. **అర కిలో వరకు తగ్గించండి.** మట్టిని గుండ్రంగా పరిచి, నాలుగు భాగాలుగా విభజించి, ఎదురెదురుగా ఉన్న రెండు భాగాలను తీసివేయండి. సుమారు 500 గ్రాములు మిగిలే వరకు ఇలా చేయండి.
7. **నీడలో ఆరబెట్టి,** శుభ్రమైన గుడ్డ లేదా ప్లాస్టిక్ సంచిలో వేసి, మీ పేరు, పొలం వివరాలు, వేయబోయే పంట పేరుతో లేబుల్ చేయండి.

## ఈ చోట్ల నమూనా తీయకండి

గట్లు, చెట్లు, కాలువలు, కంపోస్టు లేదా పశువుల ఎరువు కుప్పల దగ్గర, ఇటీవల ఎరువులు చల్లిన చోట్ల నమూనాలు తీయకండి. అవి తప్పుడు ఫలితాలు ఇస్తాయి.

## ఎక్కడ పరీక్ష చేయించాలి

నమూనాను మీ గ్రామ వ్యవసాయ సహాయకుడికి లేదా దగ్గరలోని ప్రభుత్వ భూసార పరీక్షా కేంద్రానికి అందజేయండి. భూసార ఆరోగ్య కార్డు (Soil Health Card) పథకం కింద మీ పరీక్ష ఫలితాలు, మీ పంటకు ఎరువుల సిఫార్సులతో కూడిన కార్డు మీకు అందుతుంది.`,
  },
  {
    slug: 'save-water-with-drip-irrigation-and-mulching',
    category: 'water',
    image: '/images/tip-water.jpg',
    title_en: 'Save water with drip irrigation and mulching',
    summary_en: 'Falling groundwater and erratic rains make every drop count. Drip irrigation and mulching cut water use while keeping crops healthy.',
    body_en: `With groundwater levels falling and rains becoming less predictable, giving the crop enough water with less of it is one of the biggest challenges on the farm. Two simple practices make a large difference: drip irrigation and mulching.

## Drip irrigation

Drip delivers water slowly, right at the roots of each plant, instead of flooding the whole field.

- It uses much less water than flood irrigation, often 30 to 50 percent less.
- Fewer weeds grow, because the space between rows stays dry.
- Fertilizers can be given through the drip line (fertigation), so less is wasted.
- **Clean the filter regularly** and flush the lines. Blocked drippers are the most common problem.

Government subsidies are available for drip and sprinkler systems. Ask your agriculture or horticulture office about the micro-irrigation scheme before you buy.

## Mulching

Mulch is a layer that covers the soil around plants.

- **Organic mulch:** spread a 5 to 8 cm layer of paddy straw, dry leaves or crop residue between the rows.
- **Plastic mulch:** sheets laid over raised beds, with holes for the plants. It is widely used for chilli, tomato and other vegetables.

Mulch keeps the soil moist for longer, keeps it cooler in summer, and stops weeds.

## Water at the right time

- Irrigate in the early morning or evening, when less water is lost to evaporation.
- Check before you water: take a handful of soil from root depth and squeeze it. If it holds together, the crop does not need water yet.
- Avoid over-watering. It causes root rot and washes away nutrients.`,
    title_te: 'బిందు సేద్యం, మల్చింగ్‌తో నీటిని ఆదా చేయండి',
    summary_te: 'భూగర్భ జలాలు తగ్గడం, వర్షాలు సక్రమంగా లేకపోవడంతో ప్రతి నీటి బొట్టు విలువైనది. బిందు సేద్యం, మల్చింగ్ పంటను ఆరోగ్యంగా ఉంచుతూ నీటి వినియోగాన్ని తగ్గిస్తాయి.',
    body_te: `భూగర్భ జలాలు తగ్గిపోతూ, వర్షాలు అనిశ్చితంగా మారుతున్న ఈ రోజుల్లో, తక్కువ నీటితో పంటకు సరిపడా నీరు అందించడం వ్యవసాయంలో పెద్ద సవాలు. రెండు సులభమైన పద్ధతులు పెద్ద మార్పు తెస్తాయి: బిందు సేద్యం (డ్రిప్), మల్చింగ్.

## బిందు సేద్యం (డ్రిప్)

పొలం మొత్తం నీరు పారించే బదులు, డ్రిప్ ప్రతి మొక్క వేర్ల దగ్గర నెమ్మదిగా నీటిని అందిస్తుంది.

- వరద పద్ధతి కంటే చాలా తక్కువ నీరు సరిపోతుంది, తరచూ 30 నుండి 50 శాతం తక్కువ.
- వరుసల మధ్య నేల పొడిగా ఉండటం వల్ల కలుపు తక్కువగా పెరుగుతుంది.
- ఎరువులను డ్రిప్ ద్వారా (ఫర్టిగేషన్) అందించవచ్చు, కాబట్టి వృథా తగ్గుతుంది.
- **ఫిల్టర్‌ను తరచుగా శుభ్రం చేయండి,** లైన్లను ఫ్లష్ చేయండి. డ్రిప్పర్లు మూసుకుపోవడమే సాధారణంగా వచ్చే సమస్య.

డ్రిప్, స్ప్రింక్లర్ పరికరాలకు ప్రభుత్వ సబ్సిడీలు అందుబాటులో ఉన్నాయి. కొనుగోలు చేసే ముందు సూక్ష్మ సేద్య పథకం గురించి మీ వ్యవసాయ లేదా ఉద్యాన శాఖ కార్యాలయంలో అడగండి.

## మల్చింగ్

మొక్కల చుట్టూ నేలను కప్పి ఉంచే పొరను మల్చ్ అంటారు.

- **సేంద్రియ మల్చ్:** వరి గడ్డి, ఎండు ఆకులు లేదా పంట అవశేషాలను వరుసల మధ్య 5 నుండి 8 సెం.మీ. మందంలో పరచండి.
- **ప్లాస్టిక్ మల్చ్:** ఎత్తు మడులపై పరిచే షీట్లు, మొక్కల కోసం రంధ్రాలతో ఉంటాయి. మిరప, టమాటా, ఇతర కూరగాయల్లో విస్తృతంగా వాడుతారు.

మల్చ్ నేలలో తేమను ఎక్కువ కాలం నిలుపుతుంది, వేసవిలో నేలను చల్లగా ఉంచుతుంది, కలుపును అరికడుతుంది.

## సరైన సమయంలో నీరు ఇవ్వండి

- ఆవిరి రూపంలో నీరు తక్కువగా పోయే ఉదయం లేదా సాయంత్రం వేళల్లో నీరు పెట్టండి.
- నీరు పెట్టే ముందు పరిశీలించండి: వేర్ల లోతు నుండి గుప్పెడు మట్టి తీసుకుని పిండండి. ముద్దగా ఉంటే పంటకు ఇంకా నీరు అవసరం లేదు.
- అధికంగా నీరు పెట్టకండి. దానివల్ల వేరుకుళ్లు వస్తుంది, పోషకాలు కొట్టుకుపోతాయి.`,
  },
];

if (db.prepare('SELECT COUNT(*) AS n FROM posts').get().n === 0) {
  tx(() => {
    const ins = db.prepare(`INSERT INTO posts (slug, category, image, title_en, summary_en, body_en, title_te, summary_te, body_te, published, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', ?))`);
    STARTER_POSTS.forEach((p, i) => ins.run(p.slug, p.category, p.image, p.title_en, p.summary_en, p.body_en,
      p.title_te, p.summary_te, p.body_te, `-${i} days`));
  });
  console.log('[db] Added starter blog posts.');
}
