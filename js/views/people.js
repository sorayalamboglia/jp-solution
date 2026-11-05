// Agregar nombres de integrantes sin cuenta (por ejemplo, hijos) sobre la marcha.
import { post } from '../api.js';
import { H, refreshHousehold } from '../store.js';
import { confirmDialog, toast } from '../ui.js';

export async function addPersonPrompt() {
  const name = await confirmDialog({
    title: 'Agregar un nombre',
    text: 'Para asignar movimientos o metas a alguien que no necesita su propia cuenta, como tus hijos.',
    confirm: 'Agregar', input: { label: 'Nombre' },
  });
  if (!name || !String(name).trim()) return null;
  try {
    const r = await post(H('/people'), { name: String(name).trim() });
    await refreshHousehold();
    toast(r.existing ? 'Ese nombre ya estaba en la lista.' : 'Nombre agregado.');
    return r.id;
  } catch (err) { toast(err.message, { error: true }); return null; }
}
