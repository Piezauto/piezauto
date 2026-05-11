// Utilidades UI globales B2C — reemplaza alert() y confirm() nativos

function mostrarNotificacion(mensaje, tipo) {
  tipo = tipo || 'info';
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:12px 20px;border-radius:8px;color:white;font-weight:600;font-size:14px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,0.18);transition:opacity .3s';
  div.style.background = tipo === 'error' ? '#e53e3e' : tipo === 'success' ? '#38a169' : '#3182ce';
  div.textContent = mensaje;
  document.body.appendChild(div);
  setTimeout(function() {
    div.style.opacity = '0';
    setTimeout(function() { div.remove(); }, 300);
  }, 3500);
}
window.mostrarNotificacion = mostrarNotificacion;

function mostrarConfirm(mensaje, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
    + '<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#1a1a1a">' + mensaje + '</p>'
    + '<div style="display:flex;gap:12px;justify-content:flex-end">'
    + '<button id="confirm-no" style="padding:8px 18px;border:1.5px solid #e0e0e0;border-radius:8px;background:white;font-size:14px;font-weight:600;cursor:pointer;color:#333">Cancelar</button>'
    + '<button id="confirm-yes" style="padding:8px 18px;border:none;border-radius:8px;background:#E63946;color:white;font-size:14px;font-weight:600;cursor:pointer">Confirmar</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#confirm-yes').onclick = function() { overlay.remove(); if (onConfirm) onConfirm(); };
  overlay.querySelector('#confirm-no').onclick  = function() { overlay.remove(); if (onCancel)  onCancel(); };
}
window.mostrarConfirm = mostrarConfirm;
