// Copies .ejs templates into dist after compilation.
//
// `tsc` emits JavaScript only, so templates never reached dist and every
// template render threw ENOENT under `npm start`. Dev did not show it because
// nodemon runs from src, where the templates sit next to the code.
//
// Uses fs.cp rather than a copy dependency so it works the same on Windows and
// Linux with nothing extra installed.

const fs = require('fs');
const path = require('path');

const ASSET_DIRS = [path.join('utilities', 'email', 'templates')];

const ROOT = path.resolve(__dirname, '..');

async function main() {
    let copied = 0;

    for (const relative of ASSET_DIRS) {
        const from = path.join(ROOT, 'src', relative);
        const to = path.join(ROOT, 'dist', relative);

        if (!fs.existsSync(from)) {
            console.warn(`skipped (missing in src): ${relative}`);
            continue;
        }

        await fs.promises.cp(from, to, { recursive: true });

        const files = (await fs.promises.readdir(to)).filter((name) => name.endsWith('.ejs'));
        copied += files.length;
        console.log(`copied ${files.length} template(s) -> dist/${relative.replace(/\\/g, '/')}`);
    }

    if (copied === 0) {
        // Shipping a build that cannot render a single email is worse than a
        // failed build, so make it loud.
        console.error('no email templates were copied - emails would fail at runtime');
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('failed to copy email templates:', error.message);
    process.exit(1);
});
