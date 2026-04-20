// WhatsApp popup + botón Volver Arriba — se auto-inicializa en todas las páginas
(function () {
  var waNumero         = '5491143000000';
  var waMsgBienvenida  = '';

  async function cargarNumeroWA() {
    try {
      if (typeof db !== 'undefined') {
        var { data } = await db.from('configuracion').select('clave, valor').in('clave', ['wa_flotante', 'wa_mensaje_bienvenida']);
        (data || []).forEach(function(r) {
          if (r.clave === 'wa_flotante'           && r.valor) waNumero        = r.valor;
          if (r.clave === 'wa_mensaje_bienvenida' && r.valor) waMsgBienvenida = r.valor;
        });
      }
    } catch (e) {}
  }

  function waUrl(texto) {
    var isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
    if (isMobile) {
      return 'https://wa.me/' + waNumero + '?text=' + encodeURIComponent(texto);
    }
    return 'https://web.whatsapp.com/send?phone=' + waNumero + '&text=' + encodeURIComponent(texto);
  }

  function mensajeProducto() {
    if (window.location.pathname.includes('producto.html')) {
      var titulo = document.title.split(' —')[0].trim();
      if (titulo) return 'Hola! Vi el producto "' + titulo + '" en Piezauto y quisiera consultar disponibilidad y precio.';
    }
    return 'Hola! Quisiera consultar por un producto en Piezauto.';
  }

  function initWA() {
    // Quitar botón estático si existe
    var viejo = document.getElementById('wsp-flotante');
    if (viejo) viejo.remove();

    var wrap = document.createElement('div');
    wrap.id = 'wa-widget';
    wrap.setAttribute('role', 'complementary');
    wrap.setAttribute('aria-label', 'Chat de WhatsApp');
    wrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:1000;display:flex;flex-direction:column;align-items:flex-end;gap:0';

    wrap.innerHTML =
      '<div id="wa-popup" role="dialog" aria-label="Opciones de WhatsApp" style="display:none;margin-bottom:10px;background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.18);width:268px;overflow:hidden">' +
        '<div style="background:#1a1a1a;color:#fff;padding:13px 16px;font-size:13px;font-weight:700;display:flex;justify-content:space-between;align-items:center">' +
          '<span>💬 ¿En qué te ayudamos?</span>' +
          '<button onclick="document.getElementById(\'wa-popup\').style.display=\'none\'" aria-label="Cerrar" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;line-height:1">×</button>' +
        '</div>' +
        '<div style="padding:8px">' +
          '<button id="wa-op-producto" class="wa-popup-btn" aria-label="Consultar por un producto">🔩 Consultar por un producto</button>' +
          '<button id="wa-op-pedido"   class="wa-popup-btn" aria-label="Consultar un pedido">📦 Consultar un pedido</button>' +
          '<button id="wa-op-asesor"   class="wa-popup-btn" aria-label="Hablar con un asesor">🙋 Hablar con un asesor</button>' +
        '</div>' +
        '<div style="padding:6px 8px 10px;text-align:center;font-size:10px;color:#bbb">Respondemos en horario comercial · Lun–Vie 9–18hs</div>' +
      '</div>' +
      '<button id="wa-btn-principal" aria-label="Abrir chat de WhatsApp" ' +
        'style="width:56px;height:56px;background:#25d366;border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;box-shadow:0 4px 20px rgba(37,211,102,0.5);transition:transform .2s,box-shadow .2s">' +
        '<svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
      '</button>';

    document.body.appendChild(wrap);

    var popup  = document.getElementById('wa-popup');
    var btnPpal = document.getElementById('wa-btn-principal');

    btnPpal.addEventListener('click', function (e) {
      e.stopPropagation();
      popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    });
    btnPpal.addEventListener('mouseenter', function () { btnPpal.style.transform = 'scale(1.1)'; btnPpal.style.boxShadow = '0 6px 28px rgba(37,211,102,0.6)'; });
    btnPpal.addEventListener('mouseleave', function () { btnPpal.style.transform = 'scale(1)';   btnPpal.style.boxShadow = '0 4px 20px rgba(37,211,102,0.5)'; });

    document.getElementById('wa-op-producto').addEventListener('click', function () {
      window.open(waUrl(mensajeProducto()), '_blank');
      popup.style.display = 'none';
    });
    document.getElementById('wa-op-pedido').addEventListener('click', function () {
      window.open(waUrl('Hola! Quiero hacer el seguimiento de mi pedido en Piezauto.'), '_blank');
      popup.style.display = 'none';
    });
    document.getElementById('wa-op-asesor').addEventListener('click', function () {
      window.open(waUrl(waMsgBienvenida || 'Hola! Necesito hablar con un asesor de Piezauto.'), '_blank');
      popup.style.display = 'none';
    });

    // Click fuera cierra el popup
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) popup.style.display = 'none';
    });

    cargarNumeroWA();
  }

  function initVolverArriba() {
    var btn = document.createElement('button');
    btn.id = 'btn-volver-arriba';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Volver al inicio de la página');
    btn.style.cssText =
      'position:fixed;bottom:90px;right:26px;width:42px;height:42px;' +
      'background:var(--negro,#1a1a1a);color:#fff;border:none;border-radius:50%;' +
      'font-size:20px;font-weight:700;cursor:pointer;z-index:999;' +
      'display:none;align-items:center;justify-content:center;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.22);' +
      'transition:opacity .22s,transform .22s;opacity:0;transform:translateY(12px)';

    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', function () {
      if (window.scrollY > 300) {
        btn.style.display = 'flex';
        requestAnimationFrame(function () {
          btn.style.opacity = '1';
          btn.style.transform = 'translateY(0)';
        });
      } else {
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(12px)';
        setTimeout(function () {
          if (window.scrollY <= 300) btn.style.display = 'none';
        }, 240);
      }
    }, { passive: true });
  }

  function init() {
    initWA();
    initVolverArriba();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
