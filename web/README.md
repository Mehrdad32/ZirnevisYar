# ZirnevisYar Web — زیرنویس‌یار

Official target URL: https://zirnevisyar.mehrdad32.ir/

The original WPF / .NET Framework 4.0 application remains in the repository root. The new web application lives in this directory and follows the design language of TarikhDaar (React + TypeScript + Vite, Vazirmatn, dark background and emerald accents).

## Features

- SRT subtitles converted locally inside the browser; no upload, API or backend.
- Automatic UTF-8 / UTF-8 BOM / UTF-16 LE / UTF-16 BE / Windows-1256 detection.
- Manual source-encoding override when auto-detection is ambiguous.
- Batch conversion, ZIP download for multiple files, preview, optional UTF-8 BOM.
- Optional naming from the movie file name for a single subtitle.
- Original subtitle files never modified or deleted.

## Run

Requires Node.js 22 or newer.

1. cd web
2. npm install
3. npm run dev

Verify with npm test and npm run build. The output is web/dist/.

## Deploy

Create a static Pages project with repository Mehrdad32/ZirnevisYar:

- Root directory: web
- Build command: npm run build
- Output directory: dist
- Node version: 22
- Custom domain: zirnevisyar.mehrdad32.ir

Do not publish a custom domain until it has been configured and secured by the hosting provider. DNS and hosting configuration are deliberately not changed by this source-code PR.

## Important browser difference

The old WPF app could inspect neighboring video files and delete / overwrite original subtitle files. Websites cannot silently access directories or rewrite originals. The web app instead supports an optional video name field, always keeps the source files, and downloads converted copies. This is safer and portable across desktop and mobile browsers.

Encoding auto-detection cannot distinguish every possible legacy encoding. Users can manually choose Windows-1256 if a subtitle is displayed incorrectly.

Per-file limit: 5,000 KiB. Batch limit: 50 files and 40 MiB.
