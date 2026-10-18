const fs = require('fs');
const path = require('path');

// Builder Version: 2.0.0 (Cloudflare Pages ready, dynamic types)

const ROOT = __dirname;
const SRC_RI = path.join(ROOT, 'ri');
const DIST = path.join(ROOT, 'dist');
const DIST_RI = path.join(DIST, 'ri');
const CONFIG_FILE = path.join(ROOT, 'config.json');
const ASSETS = path.join(ROOT, 'assets');
const TEMPLATES = path.join(ROOT, 'templates');

const IMAGE_EXTS = /\.(webp|jpg|jpeg|png|gif)$/i;
const TYPE_NAME_RE = /^[a-z][a-z0-9_-]*$/i;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function readFileSafe(filePath, { required = false } = {}) {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
    if (required) throw new Error(`Required file not found: ${filePath}`);
    console.warn(`WARNING: file not found: ${filePath}`);
    return '';
}

function readAsset(name, { required = false } = {}) {
    const p = path.join(ASSETS, name);
    if (fs.existsSync(p)) {
        console.log(`Inlining ${name}`);
        return fs.readFileSync(p, 'utf8');
    }
    if (required) throw new Error(`Required asset missing: assets/${name}`);
    console.warn(`WARNING: assets/${name} not found!`);
    return '';
}

function renderTemplate(name, vars) {
    let content = readFileSafe(path.join(TEMPLATES, name), { required: true });
    for (const key of Object.keys(vars || {})) {
        content = content.split(`{{${key}}}`).join(String(vars[key]));
    }
    return content;
}

// 防止内联内容出现 </script> 提前闭合外层 <script> 标签。
// 在 JS 字符串/JSON 中，\/ 等价于 /，运行时值不变。
function escapeInlineScript(code) {
    return String(code).replace(/<\/script/gi, '<\\/script');
}

function scanTypes() {
    if (!fs.existsSync(SRC_RI)) {
        console.warn(`WARNING: ri/ not found: ${SRC_RI}`);
        return [];
    }
    return fs.readdirSync(SRC_RI, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => !name.startsWith('.') && !name.startsWith('_'))
        .filter(name => TYPE_NAME_RE.test(name))
        .sort();
}

function processImages(types) {
    const counts = {};
    types.forEach(type => {
        const srcFolder = path.join(SRC_RI, type);
        const distFolder = path.join(DIST_RI, type);
        fs.mkdirSync(distFolder, { recursive: true });

        let files = fs.readdirSync(srcFolder).filter(f => IMAGE_EXTS.test(f));
        files = shuffle(files);

        if (files.length === 0) {
            console.warn(`  ${type}: 0 images, skipped`);
            counts[type] = 0;
            return;
        }

        files.forEach((file, index) => {
            fs.copyFileSync(
                path.join(srcFolder, file),
                path.join(distFolder, `${index + 1}.webp`)
            );
        });
        counts[type] = files.length;
        console.log(`  ${type}: ${files.length} images`);
    });
    return counts;
}

function cleanObsoleteTypes(activeTypes) {
    if (!fs.existsSync(DIST_RI)) return;
    const existing = fs.readdirSync(DIST_RI, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    existing.forEach(name => {
        if (!activeTypes.includes(name)) {
            fs.rmSync(path.join(DIST_RI, name), { recursive: true, force: true });
            console.log(`  Removed obsolete type: ${name}`);
        }
    });
}

function writeHeaders() {
    const headers = [
        '# Cloudflare Pages / Netlify _headers',
        '',
        '/*',
        '  Cache-Control: public, max-age=0, must-revalidate',
        '  X-Content-Type-Options: nosniff',
        '',
        '/ri/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
        '/random.js',
        '  Cache-Control: public, max-age=300, must-revalidate',
        '  X-Content-Type-Options: nosniff',
        '',
        '/api.json',
        '  Cache-Control: public, max-age=300, must-revalidate',
        '  X-Content-Type-Options: nosniff',
        ''
    ].join('\n');
    fs.writeFileSync(path.join(DIST, '_headers'), headers);
    console.log('Generated _headers');
}

function build() {
    console.log('Build starting...');
    console.time('build');

    // 1. Config
    let config = { domain: '' };
    if (process.env.DOMAIN) {
        config.domain = process.env.DOMAIN;
        console.log('Domain source: env');
    } else if (fs.existsSync(CONFIG_FILE)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (parsed.domain) {
                config.domain = parsed.domain;
                console.log('Domain source: config.json');
            }
        } catch (e) {
            console.warn('config.json parse failed, using default');
        }
    }
    if (config.domain) config.domain = config.domain.replace(/\/$/, '');
    console.log(`Domain: "${config.domain}"`);

    // 2. Prepare dist
    fs.mkdirSync(DIST_RI, { recursive: true });
    fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

    // 3. Scan + process
    const allTypes = scanTypes();
    console.log(`Scanned types: [${allTypes.join(', ') || 'none'}]`);
    const counts = processImages(allTypes);

    const activeTypes = Object.keys(counts).filter(t => counts[t] > 0);
    const activeCounts = {};
    activeTypes.forEach(t => { activeCounts[t] = counts[t]; });
    console.log(`Active types: [${activeTypes.join(', ') || 'none'}]`);

    cleanObsoleteTypes(activeTypes);

    // 4. random.js
    const randomJs = renderTemplate('random.js.tpl', {
        COUNTS: JSON.stringify(activeCounts),
        DOMAIN: config.domain
    });
    fs.writeFileSync(path.join(DIST, 'random.js'), randomJs.trim());
    console.log('Generated random.js');

    // 5. api.json
    const images = {};
    activeTypes.forEach(type => {
        images[type] = Array.from(
            { length: activeCounts[type] },
            (_, i) => `${config.domain}/ri/${type}/${i + 1}.webp`
        );
    });
    const apiData = {
        lastBuild: new Date().toISOString(),
        domain: config.domain,
        types: activeTypes,
        counts: activeCounts,
        images: images
    };
    fs.writeFileSync(path.join(DIST, 'api.json'), JSON.stringify(apiData, null, 2));
    console.log('Generated api.json');

    // 6. Pages
    createGalleryHtml(activeCounts);
    createDemoHtml(activeCounts);

    // 7. Cloudflare headers
    writeHeaders();

    console.timeEnd('build');
    console.log('Build complete. Output: /dist');
}

function createGalleryHtml(counts) {
    const appCode = readAsset('gallery-app.jsx', { required: true });
    const css = readFileSafe(path.join(TEMPLATES, 'gallery.css'), { required: true });

    const imageData = {};
    Object.keys(counts).forEach(type => {
        const count = counts[type];
        const max = 100;
        const step = count > max ? Math.floor(count / max) : 1;
        const imgs = [];
        for (let i = 1; i <= count && imgs.length < max; i += step) {
            imgs.push({ id: type + '-' + i, src: '/ri/' + type + '/' + i + '.webp', type });
        }
        imageData[type] = { images: imgs, total: count };
    });

    const html = renderTemplate('gallery.html.tpl', {
        GALLERY_CSS: css,
        GALLERY_DATA: escapeInlineScript(JSON.stringify(imageData)),
        APP_CODE: escapeInlineScript(appCode)
    });
    fs.writeFileSync(path.join(DIST, 'gallery.html'), html);
    console.log('Generated gallery.html');
}

function createDemoHtml(counts) {
    const homeCode = readAsset('home-app.jsx', { required: true });
    const etherCode = readAsset('liquid-ether-engine.js');   // 可选，缺失只是没有粒子背景
    const css = readFileSafe(path.join(TEMPLATES, 'home.css'), { required: true });

    const html = renderTemplate('home.html.tpl', {
        HOME_CSS: css,
        ETHER_CODE: escapeInlineScript(etherCode),
        COUNTS: escapeInlineScript(JSON.stringify(counts)),
        HOME_CODE: escapeInlineScript(homeCode)
    });
    fs.writeFileSync(path.join(DIST, 'index.html'), html);
    console.log('Generated index.html');
}

build();