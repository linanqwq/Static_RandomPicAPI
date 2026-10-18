<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Gallery - Static Random Pic API</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
<style>
{{GALLERY_CSS}}
</style>
</head>
<body>
<div class="mesh-bg"><div class="mesh-orb"></div></div>
<div id="root"><div style="position:absolute;top:30vh;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:16px"><div style="width:40px;height:40px;border:3px solid rgba(255,255,255,.08);border-top-color:var(--a);border-radius:50%;animation:sp 1s linear infinite"></div><p style="color:rgba(255,255,255,.3);font-size:.85rem;letter-spacing:1px">Loading Gallery...</p></div></div>

<script>window.__GALLERY_DATA__={{GALLERY_DATA}};</script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7.23.10/babel.min.js"></script>
<script type="text/babel">
{{APP_CODE}}
</script>
</body>
</html>