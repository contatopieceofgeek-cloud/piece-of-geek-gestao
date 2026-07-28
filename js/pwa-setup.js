(function(){
  var pageUrl = window.location.origin + window.location.pathname;
  var scopeUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')+1);
  var defaultIconUri = scopeUrl + 'img/logo.png';
  var defaultName = 'Piece of Geek 3D';

  // Lê nome/logo do negócio direto do IndexedDB (mesmo banco/chave que o
  // app.js usa pra guardar settings) porque esse script roda ANTES do
  // app.js carregar o estado — não dá pra esperar o state normal.
  function readBusinessBranding(){
    return new Promise(function(resolve){
      if(!window.indexedDB){ resolve({}); return; }
      try{
        var req = indexedDB.open('piece_of_geek_db', 1);
        req.onupgradeneeded = function(){
          if(!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv');
        };
        req.onerror = function(){ resolve({}); };
        req.onsuccess = function(){
          try{
            var tx = req.result.transaction('kv','readonly');
            var getReq = tx.objectStore('kv').get('settings');
            getReq.onsuccess = function(){
              try{
                var raw = getReq.result;
                var settings = raw ? JSON.parse(raw) : {};
                resolve({ name: settings.businessName, logo: settings.businessLogo });
              }catch(e){ resolve({}); }
            };
            getReq.onerror = function(){ resolve({}); };
          }catch(e){ resolve({}); }
        };
      }catch(e){ resolve({}); }
    });
  }

  readBusinessBranding().then(function(branding){
    var name = (branding.name && branding.name.trim()) ? branding.name.trim() : defaultName;
    var iconUri = branding.logo || defaultIconUri;
    document.getElementById('pwaAppleIcon').href = iconUri;
    document.getElementById('pwaFavicon').href = iconUri;
    document.title = name + ' — Gestão';
    var appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if(appleTitleMeta) appleTitleMeta.setAttribute('content', name);
    var manifest = {
      name: name + ' — Gestão',
      short_name: name,
      start_url: pageUrl,
      scope: scopeUrl,
      display: 'standalone',
      background_color: '#F4F5F7',
      theme_color: '#F4F5F7',
      icons: [
        { src: iconUri, sizes: branding.logo ? 'any' : '480x480', type: 'image/png', purpose: 'any' }
      ]
    };
    var manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    document.getElementById('pwaManifestLink').href = URL.createObjectURL(manifestBlob);
  });

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register(scopeUrl + 'sw.js', { scope: scopeUrl }).catch(function(){ /* sw.js não encontrado — app funciona igual, só sem o selo de "instalar" em alguns Android */ });
  }
})();
