(async () => {
  const { data } = await db.from('configuracion').select('clave, valor');
  if (!data || !data.length) return;
  const cfg = Object.fromEntries(data.map(r => [r.clave, r.valor]));

  const info = document.getElementById('topbar-info');
  if (info) {
    const partes = [];
    if (cfg.direccion) partes.push('📍 ' + cfg.direccion);

    // Preferir horarios_por_dia sobre el campo horario genérico
    if (cfg.horarios_por_dia) {
      try {
        const hors = JSON.parse(cfg.horarios_por_dia);
        const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const abiertos = dias.filter(d => !hors[d]?.cerrado && hors[d]?.apertura);
        if (abiertos.length) {
          const abr = d => d.slice(0, 3);
          const h0  = hors[abiertos[0]];
          const hN  = hors[abiertos[abiertos.length - 1]];
          const sameHour = abiertos.every(d => hors[d]?.apertura === h0.apertura && hors[d]?.cierre === h0.cierre);
          if (sameHour) {
            partes.push(`${abr(abiertos[0])}–${abr(abiertos[abiertos.length - 1])} ${h0.apertura?.slice(0,5)}–${h0.cierre?.slice(0,5)}hs`);
          } else {
            partes.push(`${abr(abiertos[0])}–${abr(abiertos[abiertos.length - 1])} desde ${h0.apertura?.slice(0,5)}hs`);
          }
        }
      } catch (_) {
        if (cfg.horario) partes.push(cfg.horario);
      }
    } else if (cfg.horario) {
      partes.push(cfg.horario);
    }

    if (partes.length) info.textContent = partes.join(' · ');
  }

  const elTel = document.getElementById('topbar-telefono');
  if (elTel && cfg.telefono) {
    const num = cfg.telefono.replace(/\D/g, '');
    elTel.href        = 'tel:+' + num;
    elTel.textContent = '📞 ' + cfg.telefono;
  }

  const elWa = document.getElementById('topbar-whatsapp');
  if (elWa && cfg.whatsapp) {
    const num = cfg.whatsapp.replace(/\D/g, '');
    elWa.href = 'https://wa.me/' + num;
  }
})();
