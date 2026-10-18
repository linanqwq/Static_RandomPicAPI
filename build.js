const fs = require('fs');
const path = require('path');

// Builder Version: 1.1.0 (Templates extracted)

const ROOT = __dirname;
const SRC_RI = path.join(ROOT, 'ri');
const DIST = path.join(ROOT, 'dist');
const DIST_RI = path.join(DIST, 'ri');
const CONFIG_FILE = path.join(ROOT, 'config.json');
const ASSETS = path.join(ROOT, 'assets');
const TEMPLATES = path.join(ROOT, 'templates');

// Helper: Shuffle Array (Fisher-Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Helper: read file with warning
function readFileSafe(filePath) {
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
    }
    console.warn(`WARNING: file not found: ${filePath}`);
    return '';
}

// Helper: read asset (with log)
function readAsset(name) {
    const p = path.join(ASSETS, name);
    if (fs.existsSync(p)) {
        console.log(`Inlining ${name}`);
        return fs.readFileSync(p, 'utf8');
    }
    console.warn(`WARNING: assets/${name} not found!`);
    return '';
}

// Helper: render template by replacing {{KEY}} placeholders
// Uses split/join (not String.replace) to avoid "$&" / "$1" being treated as special patterns.
function renderTemplate(name, vars) {
    let content = readFileSafe(path.join(TEMPLATES, name));
    for (const key of Object.keys(vars || {})) {
        content = content.split(`{{${key}}}`).join(vars[key]);
    }
    return content;
}

// Main function
function build() {
    console.log('Starting build...');

    // Load Config
    let config = { domain: '' };

    // Priority 1: Environment Variable
    if (process.env.DOMAIN) {
        config.domain = process.env.DOMAIN;
        console.log('Loaded domain from environment variable.');
    }
    // Priority 2: Config File
    else if (fs.existsSync(CONFIG_FILE)) {
        try {
            const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(configContent);
            if (parsed.domain) {
                config.domain = parsed.domain;
            }
            console.log('Loaded domain from config.json.');
        } catch (e) {
            console.warn('Failed to parse config.json, using default settings.');
        }
    }

    // Normalize domain (remove trailing slash)
    if (config.domain) {
        config.domain = config.domain.replace(/\/$/, '');
    }

    console.log(`Using domain prefix: "${config.domain}"`);

    // 1. Prepare Dist
    if (!fs.existsSync(DIST)) {
        fs.mkdirSync(DIST, { recursive: true });
    }
    if (!fs.existsSync(DIST_RI)) fs.mkdirSync(DIST_RI, { recursive: true });

    fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

    // 2. Process Folders
    const types = ['h', 'v'];
    let counts = {};

    types.forEach(type => {
        const srcFolder = path.join(SRC_RI, type);
        const distFolder = path.join(DIST_RI, type);

        if (!fs.existsSync(srcFolder)) {
            console.warn(`Source folder not found: ${srcFolder}`);
            counts[type] = 0;
            return;
        }

        fs.mkdirSync(distFolder, { recursive: true });

        let files = fs.readdirSync(srcFolder).filter(f => f.match(/\.(webp|jpg|jpeg|png|gif)$/i));
        files = shuffle(files);

        files.forEach((file, index) => {
            const srcPath = path.join(srcFolder, file);
            const destPath = path.join(distFolder, `${index + 1}.webp`);
            fs.copyFileSync(srcPath, destPath);
        });

        counts[type] = files.length;
        console.log(`Processed ${type}: ${counts[type]} images.`);
    });

    // 3. Generate random.js from template
    const randomJs = renderTemplate('random.js.tpl', {
        COUNTS: JSON.stringify(counts),
        DOMAIN: config.domain
    });
    fs.writeFileSync(path.join(DIST, 'random.js'), randomJs.trim());

    // 4. Copy index.html if exists and not empty
    const indexSrc = path.join(ROOT, 'index.html');
    if (fs.existsSync(indexSrc)) {
        const stats = fs.statSync(indexSrc);
        if (stats.size > 0) {
            fs.copyFileSync(indexSrc, path.join(DIST, 'index.html'));
            console.log('Copied index.html to dist');
        } else {
            console.log('index.html is empty, creating a demo page in dist...');
            createDemoHtml(counts);
        }
    } else {
        createDemoHtml(counts);
    }

    // 5. Generate Hero Home Page (always from template)
    createDemoHtml(counts);

    // 6. Generate api.json
    const apiData = {
        lastBuild: new Date().toISOString(),
        domain: config.domain,
        counts: counts,
        images: {
            h: Array.from({ length: counts.h }, (_, i) => `${config.domain}/ri/h/${i + 1}.webp`),
            v: Array.from({ length: counts.v }, (_, i) => `${config.domain}/ri/v/${i + 1}.webp`)
        }
    };
    fs.writeFileSync(path.join(DIST, 'api.json'), JSON.stringify(apiData, null, 2));
    console.log('Generated api.json');

    // 7. Generate Gallery Page
    createGalleryHtml(counts, config);

    console.log('Build complete. Output is in /dist folder.');
}

function createGalleryHtml(counts, config) {
    const types = Object.keys(counts);

    const appCode = readAsset('gallery-app.jsx');
    const css = renderTemplate('gallery.css', {});

    const imageData = {};
    types.forEach(type => {
        const count = counts[type];
        if (count === 0) return;
        const max = 100, step = count > max ? Math.floor(count / max) : 1, imgs = [];
        for (let i = 1; i <= count && imgs.length < max; i += step)
            imgs.push({ id: type + '-' + i, src: '/ri/' + type + '/' + i + '.webp', type });
        imageData[type] = { images: imgs, total: count };
    });

    const html = renderTemplate('gallery.html.tpl', {
        GALLERY_CSS: css,
        GALLERY_DATA: JSON.stringify(imageData),
        APP_CODE: appCode
    });

    fs.writeFileSync(path.join(DIST, 'gallery.html'), html);
    console.log('Generated gallery.html');
}

function createDemoHtml(counts) {
    const homeCode = readAsset('home-app.jsx');
    const etherCode = readAsset('liquid-ether-engine.js');
    const css = renderTemplate('home.css', {});

    const html = renderTemplate('home.html.tpl', {
        HOME_CSS: css,
        ETHER_CODE: etherCode,
        COUNTS: JSON.stringify(counts),
        HOME_CODE: homeCode
    });

    fs.writeFileSync(path.join(DIST, 'index.html'), html);
    console.log('Created premium index.html (React 18) in dist');
}

build();