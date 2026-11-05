/**
 * JP Solution · respaldo en Google Sheets
 *
 * 1. Cambia la CLAVE de abajo por una frase secreta tuya (mínimo 12 caracteres).
 * 2. Implementar → Nueva implementación → Tipo: Aplicación web.
 *    Ejecutar como: Yo.  Quién tiene acceso: Cualquier usuario.
 * 3. Copia la dirección que termina en /exec y pégala en la app junto con la misma CLAVE.
 */
const CLAVE = 'CAMBIA-ESTA-CLAVE';

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (!req || CLAVE === 'CAMBIA-ESTA-CLAVE' || req.clave !== CLAVE) return salida({ ok: false, error: 'Clave incorrecta' });
    const libro = SpreadsheetApp.getActiveSpreadsheet();

    if (req.accion === 'probar') return salida({ ok: true, hoja: libro.getName() });

    if (req.accion === 'respaldar') {
      // Respaldo completo, en trozos de texto (una celda admite hasta 50 000 caracteres).
      const hoja = libro.getSheetByName('_respaldo') || libro.insertSheet('_respaldo');
      hoja.clear();
      const texto = String(req.respaldo || '');
      const filas = [[new Date().toISOString()]];
      for (let i = 0; i < texto.length; i += 45000) filas.push(['x' + texto.slice(i, i + 45000)]);
      const rango = hoja.getRange(1, 1, filas.length, 1);
      rango.setNumberFormat('@');
      rango.setValues(filas);
      hoja.hideSheet();
      // Pestañas para leer cómodamente.
      const tablas = req.tablas || {};
      Object.keys(tablas).forEach(function (nombre) {
        const datos = tablas[nombre];
        const pestaña = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
        pestaña.clearContents();
        if (datos.length) {
          pestaña.getRange(1, 1, datos.length, datos[0].length).setValues(datos);
          pestaña.setFrozenRows(1);
          pestaña.getRange(1, 1, 1, datos[0].length).setFontWeight('bold');
        }
      });
      return salida({ ok: true, fecha: filas[0][0] });
    }

    if (req.accion === 'restaurar') {
      const hoja = libro.getSheetByName('_respaldo');
      if (!hoja || hoja.getLastRow() < 2) return salida({ ok: false, error: 'Todavía no hay ningún respaldo guardado en esta hoja.' });
      const valores = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues();
      const texto = valores.map(function (f) { return String(f[0]).slice(1); }).join('');
      return salida({ ok: true, fecha: String(hoja.getRange(1, 1).getValue()), respaldo: texto });
    }

    return salida({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

function salida(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
