(function(){
  var iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#FF6A39"/><stop offset="1" stop-color="#C93F1C"/></linearGradient></defs>'
    + '<rect width="512" height="512" rx="100" fill="url(#g)"/>'
    + '<text x="256" y="330" font-family="Arial, Helvetica, sans-serif" font-size="230" font-weight="700" fill="#ffffff" text-anchor="middle">PG</text>'
    + '</svg>';
  var iconUri = 'data:image/svg+xml;base64,' + btoa(iconSvg);
  document.getElementById('pwaAppleIcon').href = iconUri;
  document.getElementById('pwaFavicon').href = iconUri;
  var pageUrl = window.location.origin + window.location.pathname;
  var scopeUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')+1);
  var manifest = {
    name: 'Piece of Geek 3D — Gestão',
    short_name: 'Piece of Geek',
    start_url: pageUrl,
    scope: scopeUrl,
    display: 'standalone',
    background_color: '#F4F5F7',
    theme_color: '#F4F5F7',
    icons: [
      { src: iconUri, sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: iconUri, sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: iconUri, sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
    ]
  };
  var manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  document.getElementById('pwaManifestLink').href = URL.createObjectURL(manifestBlob);
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register(scopeUrl + 'sw.js', { scope: scopeUrl }).catch(function(){ /* sw.js não encontrado — app funciona igual, só sem o selo de "instalar" em alguns Android */ });
  }
})();
