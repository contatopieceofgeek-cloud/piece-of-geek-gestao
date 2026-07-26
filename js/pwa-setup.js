(function(){
  var pageUrl = window.location.origin + window.location.pathname;
  var scopeUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')+1);
  var iconUri = scopeUrl + 'img/logo.png';
  document.getElementById('pwaAppleIcon').href = iconUri;
  document.getElementById('pwaFavicon').href = iconUri;
  var manifest = {
    name: 'Piece of Geek 3D — Gestão',
    short_name: 'Piece of Geek',
    start_url: pageUrl,
    scope: scopeUrl,
    display: 'standalone',
    background_color: '#F4F5F7',
    theme_color: '#F4F5F7',
    icons: [
      { src: iconUri, sizes: '480x480', type: 'image/png', purpose: 'any' }
    ]
  };
  var manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  document.getElementById('pwaManifestLink').href = URL.createObjectURL(manifestBlob);
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register(scopeUrl + 'sw.js', { scope: scopeUrl }).catch(function(){ /* sw.js não encontrado — app funciona igual, só sem o selo de "instalar" em alguns Android */ });
  }
})();
