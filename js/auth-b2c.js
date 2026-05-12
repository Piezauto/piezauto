// v2 — columnas corregidas: expira_at, sin activo
// Auth B2C — Supabase Auth real para clientes finales (Hito 4)
// Convive con js/usuario.js (auth legacy) sin tocarlo.

const _B2C_URL = 'https://mqxowotdeibllkitkije.supabase.co';
const _B2C_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8';

const dbB2C = supabase.createClient(_B2C_URL, _B2C_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'pz_b2c_session',
  },
});

async function validarCodigoInvitacion(codigo) {
  const codigoNorm = (codigo || '').trim().toUpperCase();
  if (!codigoNorm) return { valido: false, error: 'Ingresá un código de invitación.' };

  const { data, error } = await dbB2C
    .from('cat_invitaciones_b2c')
    .select('id, codigo, max_usos, usos_actuales, usado, expira_at')
    .eq('codigo', codigoNorm)
    .single();

  if (error || !data) return { valido: false, error: 'Código de invitación inválido.' };
  if (data.usado === true) return { valido: false, error: 'Este código ya fue utilizado.' };
  if (data.usos_actuales >= data.max_usos) return { valido: false, error: 'Este código ya alcanzó su límite de usos.' };
  if (data.expira_at && new Date(data.expira_at) < new Date()) return { valido: false, error: 'Este código de invitación venció.' };
  return { valido: true, invitacion: data };
}

async function registrarCliente(datos, codigo) {
  const validacion = await validarCodigoInvitacion(codigo);
  if (!validacion.valido) return { ok: false, error: validacion.error };

  const { data: authData, error: authError } = await dbB2C.auth.signUp({
    email: datos.email.trim().toLowerCase(),
    password: datos.password,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: 'Ya existe una cuenta con ese email.' };
    }
    if (authError.message.toLowerCase().includes('password')) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    return { ok: false, error: authError.message };
  }

  if (!authData.user) {
    return { ok: false, error: 'No se pudo crear la cuenta. Intentá de nuevo.' };
  }

  const { data: clienteData, error: insertError } = await dbB2C
    .from('cat_clientes_finales')
    .insert({
      auth_user_id: authData.user.id,
      email: datos.email.trim().toLowerCase(),
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      telefono: datos.telefono ? datos.telefono.trim() : null,
      localidad: datos.localidad ? datos.localidad.trim() : null,
      provincia: datos.provincia || null,
    })
    .select('id');

  if (insertError || !clienteData?.length) {
    return { ok: false, error: 'Error al crear el perfil: ' + (insertError?.message ?? 'sin datos') };
  }

  const clienteId = clienteData[0].id;
  const nuevosUsos = validacion.invitacion.usos_actuales + 1;
  const { data: updateData, error: updateError } = await dbB2C
    .from('cat_invitaciones_b2c')
    .update({
      usos_actuales: nuevosUsos,
      usado: nuevosUsos >= validacion.invitacion.max_usos,
      usado_por: clienteId,                 // UUID FK a cat_clientes_finales.id
      usado_at: new Date().toISOString(),
    })
    .eq('id', validacion.invitacion.id)
    .select('id');

  if (updateError || !updateData?.length) {
    console.warn('[auth-b2c] No se pudo incrementar usos_actuales:', updateError?.message ?? '0 filas afectadas');
  }

  return { ok: true, user: authData.user, session: authData.session };
}

async function loginCliente(email, password) {
  const { data, error } = await dbB2C.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid login') ||
        error.message.toLowerCase().includes('invalid credentials')) {
      return { ok: false, error: 'Email o contraseña incorrectos.' };
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { ok: false, error: 'Tenés que confirmar tu email antes de ingresar. Revisá tu bandeja.' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, user: data.user, session: data.session };
}

async function logoutCliente() {
  await dbB2C.auth.signOut();
}

async function getClienteActual() {
  const { data: { session } } = await dbB2C.auth.getSession();
  if (!session) return null;

  const { data, error } = await dbB2C
    .from('cat_clientes_finales')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single();

  if (error || !data) return null;
  return { ...data, email: session.user.email };
}

async function resetPasswordCliente(email) {
  const { error } = await dbB2C.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: window.location.origin + '/login.html' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
