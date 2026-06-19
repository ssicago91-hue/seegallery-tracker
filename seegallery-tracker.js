(function() {

  /* 갤러리 시즌 페이지에서만 실행 */
  var season = (function(){
    var m = location.href.match(/\/(spring|summer|autumn|winter)/);
    return m ? m[1] : null;
  })();
  if (!season) return;

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src; s.onload = cb;
    document.head.appendChild(s);
  }

  function sgMain() {
    var _app;
    try { _app = firebase.app('sgt'); }
    catch(e) {
      _app = firebase.initializeApp({
        apiKey:            'AIzaSyCkIHJ-hCwRGpoZw7334sqpNO-0dfZdCDg',
        authDomain:        'seeguy-c05bc.firebaseapp.com',
        projectId:         'seeguy-c05bc',
        storageBucket:     'seeguy-c05bc.firebasestorage.app',
        messagingSenderId: '676638822070',
        appId:             '1:676638822070:web:b3536584e12fbe8730a017'
      }, 'sgt');
    }
    var db  = _app.firestore();
    var INC = firebase.firestore.FieldValue.increment;
    var UNI = firebase.firestore.FieldValue.arrayUnion;

    function today() {
      var d = new Date();
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
    function timeStr() {
      var d = new Date();
      return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    }
    function getSource() {
      var stored = sessionStorage.getItem('sg_source');
      if (stored === 'seegenemedical') { sessionStorage.removeItem('sg_source'); return 'seegenemedical'; }
      var ref = document.referrer || '';
      if (ref.indexOf('seegenemedical.com') !== -1) return 'seegenemedical';
      if (ref === '') return 'direct';
      return 'other';
    }

    /* 브라우저 고유 ID - IP 대신 사용 */
    function getUID() {
      var uid = localStorage.getItem('sg_uid');
      if (!uid) {
        uid = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('sg_uid', uid);
      }
      return uid;
    }

    /* 방문자 기록 - 접속마다 totalVisits 카운트, 같은 UID는 uniqueIPs 중복 제외 */
    function recordVisit(uid, source) {
      var t   = today();
      var ts  = timeStr();
      var ref = db.collection('visitors').doc(t);
      var upd = { date: t };
      upd['totalVisits']              = INC(1);
      upd['seasons.' + season]        = INC(1);
      upd['sources.' + source]        = INC(1);
      upd['uniqueIPs']                = UNI(uid);
      upd['ipLog.' + uid + '.source'] = source;
      upd['ipLog.' + uid + '.times']  = UNI(ts);
      return ref.set(upd, { merge: true })
        .catch(function(e){ console.log('[SG] visit error:', e.message); });
    }

    /* 클릭 기록 */
    function recordClick(title, uid, source) {
      var t    = today();
      var safe = title.replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 80);
      var ref  = db.collection('clicks').doc(t + '__' + safe);
      var upd  = { date: t, title: title, season: season };
      upd['totalClicks']       = INC(1);
      upd['sources.' + source] = INC(1);

      var ipRef = db.collection('click_ips').doc(t + '__' + safe + '__' + uid.slice(0, 20));
      var ipUpd = { date: t, title: title, season: season, uid: uid, source: source };
      ipUpd['count'] = INC(1);

      return Promise.all([
        ref.set(upd, { merge: true }),
        ipRef.set(ipUpd, { merge: true })
      ]).catch(function(e){ console.log('[SG] click error:', e.message); });
    }

    function getTitle(img) {
      return (img.alt && img.alt.trim()) ? img.alt.trim()
        : img.src.split('/').pop().replace(/\.[^.]+$/, '');
    }

    function bindThumbs(uid, source) {
      document.querySelectorAll('img.thumb').forEach(function(img) {
        if (img._sgBound) return;
        img._sgBound = true;
        img.addEventListener('click', function() {
          var title = getTitle(img);
          recordClick(title, uid, source);
        }, true);
      });
    }

    function init() {
      var source = getSource();
      var uid    = getUID();
      recordVisit(uid, source);
      bindThumbs(uid, source);
      new MutationObserver(function() {
        bindThumbs(uid, source);
      }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js', function() {
    loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js', function() {
      sgMain();
    });
  });

})();
