<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Static Random Pic API - Premium Delivery</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
<style>
{{HOME_CSS}}
</style>
</head>
<body>
<div id="ether-bg"></div>
<div id="root"></div>

<script src="https://unpkg.com/three@0.149.0/build/three.min.js"></script>
<script>
{{ETHER_CODE}}
</script>
<script>
document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('ether-bg');if(b&&typeof LiquidEtherEngine!=='undefined'){try{new LiquidEtherEngine(b,{colors:['#FF2A54','#a78bfa','#38BDF8'],autoIntensity:1.5,resolution:0.3,iterations_poisson:16,BFECC:false})}catch(e){console.warn('LiquidEther:',e)}}});
</script>
<script>window.__COUNTS__={{COUNTS}};</script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7.23.10/babel.min.js"></script>
<script type="text/babel">
{{HOME_CODE}}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HomeApp />);
</script>
</body>
</html>