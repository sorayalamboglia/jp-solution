# JP Solution · versión personal

Finanzas personales y familiares que funcionan **dentro de tu teléfono**: movimientos, cuentas y tarjetas,
presupuesto, calendario de facturas, metas, deudas con cuotas, informes, español/inglés y montos en dólares.
Tus datos no se envían a ningún servidor de JP Solution.

## Instalar en Android
1. Abre el enlace de la app en **Chrome**.
2. Toca **⋮ → Instalar app** (o «Agregar a la pantalla principal»).
3. Aparece el ícono **JP Solution**; se abre en pantalla completa y funciona sin internet.

## Instalar en iPhone
1. Abre el enlace en **Safari**.
2. Toca **Compartir → Agregar a pantalla de inicio**.

Cada teléfono guarda sus propios datos. Para pasarlos de uno a otro usa el respaldo de Google Sheets.

## Respaldo en Google Sheets (gratis)
1. En Google Sheets crea una hoja nueva, por ejemplo «JP Solution respaldo».
2. Menú **Extensiones → Apps Script**. Borra lo que aparece y pega el código de `apps-script/Codigo.gs`
   (en la app: Menú → Respaldo, exportación y privacidad → «Copiar el código del Apps Script»).
3. En la línea `const CLAVE = 'CAMBIA-ESTA-CLAVE';` escribe una frase secreta tuya (12 caracteres o más) y guarda.
4. **Implementar → Nueva implementación** → tipo **Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**.
   Google te pedirá autorizar el acceso a tu hoja: acéptalo (es tu propio código).
5. Copia la dirección que termina en **/exec**.
6. En la app: Menú → Respaldo, exportación y privacidad → pega la dirección y la clave → **Conectar y probar**.

Desde entonces la app respalda sola unos segundos después de cada cambio. Guarda la dirección y la clave en un lugar seguro:
las necesitarás para restaurar en otro teléfono.

## Bloqueo con usuario y contraseña (opcional)
Menú → Seguridad y bloqueo. La información del teléfono queda cifrada; sin la contraseña no se puede leer.
Si la olvidas, no se puede recuperar: borra los datos del teléfono y restaura desde Google Sheets.

## Actualizar la app
Cuando se publique una versión nueva, la app se actualiza sola la próxima vez que la abras con internet.
