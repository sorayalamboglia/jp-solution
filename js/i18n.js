// Idioma de la interfaz: español (predeterminado) o inglés.
// La interfaz se escribe en español; al elegir inglés se traducen los textos visibles con este diccionario.
// Entradas con {0}, {1}… son plantillas; {#0} solo acepta cifras o importes (para no tocar textos de la persona).

const EN = [
  // Navegación y estructura
  ['Inicio', 'Home'], ['Movimientos', 'Transactions'], ['Presupuesto', 'Budget'], ['Calendario', 'Calendar'], ['Metas', 'Goals'],
  ['Calendario de pagos', 'Payment calendar'], ['Metas familiares', 'Family goals'], ['Cuentas y tarjetas', 'Accounts & cards'], ['Informes', 'Reports'],
  ['Deudas', 'Debts'], ['Categorías', 'Categories'], ['Recurrentes', 'Recurring'], ['Importar CSV', 'Import CSV'], ['Respaldo y datos', 'Backup & data'],
  ['Hogar e integrantes', 'Household & members'], ['Mi cuenta', 'My account'], ['Menú', 'Menu'], ['Abrir menú', 'Open menu'], ['Ir a inicio', 'Go to home'],
  ['Navegación principal', 'Main navigation'], ['Registrar movimiento', 'Add transaction'], ['Cerrar', 'Close'], ['Cambiar', 'Switch'],
  ['Facturas y recordatorios', 'Bills & reminders'], ['Facturas y recordatorios: hay pagos que requieren atención', 'Bills & reminders: some payments need attention'],
  ['Modo demostración.', 'Demo mode.'], ['Estos datos son de ejemplo y están separados de tu hogar real.', 'This is sample data, kept separate from your real household.'],
  ['No se pudo cargar esta pantalla.', 'This screen could not be loaded.'], ['Reintentar', 'Retry'], ['Finanzas familiares', 'Family finances'],
  ['{0} · JP Solution', '{0} · JP Solution'],
  // General
  ['Confirmar', 'Confirm'], ['Cancelar', 'Cancel'], ['Guardar', 'Save'], ['Guardar cambios', 'Save changes'], ['Eliminar', 'Delete'], ['Editar', 'Edit'],
  ['Agregar', 'Add'], ['Quitar', 'Remove'], ['Ver', 'View'], ['Ver todos', 'See all'], ['Ver todas', 'See all'], ['Volver', 'Back'], ['Continuar', 'Continue'],
  ['Deshacer', 'Undo'], ['Ir', 'Go'], ['Aplicar', 'Apply'], ['Limpiar', 'Clear'], ['Archivar', 'Archive'], ['Reactivar', 'Reactivate'], ['Administrar', 'Manage'],
  ['Gestionar', 'Manage'], ['Anular', 'Revoke'], ['Salir', 'Leave'], ['Detener', 'Stop'], ['Pagar', 'Pay'], ['Anterior', 'Previous'], ['Siguiente', 'Next'],
  ['Mes anterior', 'Previous month'], ['Mes siguiente', 'Next month'], ['Hoy', 'Today'], ['Ayer', 'Yesterday'], ['Mañana', 'Tomorrow'],
  ['En {#0} días', 'In {0} days'], ['Hace {#0} días', '{0} days ago'], ['Algo salió mal. Inténtalo de nuevo.', 'Something went wrong. Please try again.'],
  ['No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 'Cannot reach the server. Check your connection and try again.'],
  ['No se pudo completar la operación. Inténtalo de nuevo.', 'The operation could not be completed. Please try again.'],
  ['Ver importes exactos', 'Show exact amounts'], ['Saldo', 'Balance'], ['Importe', 'Amount'], ['Fecha', 'Date'], ['Nombre', 'Name'], ['Nota', 'Note'],
  ['Nota (opcional)', 'Note (optional)'], ['Notas', 'Notes'], ['Tipo', 'Type'], ['Estado', 'Status'], ['Desde', 'From'], ['Hasta', 'To'], ['Todas', 'All'], ['Todos', 'All'],
  ['Icono', 'Icon'], ['Color', 'Color'], ['Color {0}', 'Color {0}'], ['Sección', 'Section'], ['Historial', 'History'], ['Elige…', 'Choose…'], ['Fin', 'End'],
  ['Exintegrante', 'Former member'], ['Recurrente', 'Recurring'], ['Con comprobante', 'With receipt'], ['Administrador', 'Administrator'], ['Miembro', 'Member'],
  ['Administrador:', 'Administrator:'], ['Miembro:', 'Member:'], ['Tú', 'You'], ['(tú)', '(you)'], ['Escribe un importe válido.', 'Enter a valid amount.'],
  ['Escribe un importe mayor que cero.', 'Enter an amount greater than zero.'], ['Elige una fecha.', 'Choose a date.'], ['Elige una categoría.', 'Choose a category.'],
  // Inicio
  ['Resumen del mes', 'Monthly summary'], ['Período: {0}', 'Period: {0}'], ['Saldo disponible', 'Available balance'],
  ['Suma de efectivo, bancos y ahorros a hoy. Las tarjetas se restan aparte.', 'Cash, bank and savings as of today. Cards are subtracted separately.'],
  ['Comprometido en pagos', 'Committed to bills'], ['{#0} factura hasta fin de período', '{0} bill until the end of the period'], ['{#0} facturas hasta fin de período', '{0} bills until the end of the period'],
  ['Libre después de pagos', 'Free after bills'], ['Saldo disponible − comprometido', 'Available balance − committed'], ['Debes en tarjetas:', 'Owed on cards:'],
  ['· Patrimonio neto:', '· Net worth:'], ['Ingresos', 'Income'], ['Gastos', 'Expenses'], ['Ingreso', 'Income'], ['Gasto', 'Expense'], ['Devolución', 'Refund'],
  ['Transferencia', 'Transfer'], ['vs. mes anterior', 'vs. last month'], ['Sin datos del mes anterior', 'No data from last month'],
  ['Ingresos y gastos del período. Las transferencias y pagos de tarjeta no cuentan; las devoluciones restan al gasto.', 'Income and expenses for the period. Transfers and card payments don’t count; refunds reduce spending.'],
  ['Registrar gasto', 'Add expense'], ['Empecemos', 'Let’s get started'], ['Registra tu primer gasto o ingreso. También puedes revisar tus cuentas o importar movimientos desde un archivo CSV.', 'Add your first expense or income. You can also review your accounts or import transactions from a CSV file.'],
  ['Revisar cuentas', 'Review accounts'], ['Presupuesto restante', 'Remaining budget'], ['de {0}', 'of {0}'], ['Aún no tienes presupuesto para este mes.', 'You don’t have a budget for this month yet.'],
  ['Crear presupuesto', 'Create budget'], ['Presupuesto general menos gastos del período ({0}).', 'Overall budget minus spending for the period ({0}).'],
  ['Presupuesto por categorías menos gastos del período ({0}).', 'Category budgets minus spending for the period ({0}).'],
  ['Próximos pagos', 'Upcoming payments'], ['No hay pagos pendientes. Agrega tus facturas para ver los próximos vencimientos.', 'No pending payments. Add your bills to see upcoming due dates.'],
  ['Agregar factura', 'Add bill'], ['Ahorro y metas', 'Savings & goals'], ['Ahorro acumulado', 'Total savings'],
  ['Saldo de tus cuentas de ahorro. Las metas de «solo seguimiento» no se suman aquí para no contar dos veces el mismo dinero.', 'Balance of your savings accounts. “Tracking only” goals aren’t added here, so the same money isn’t counted twice.'],
  ['{#0} de {#1} ·', '{0} of {1} ·'], ['Crea una meta para la casa, las vacaciones o tu fondo de emergencia.', 'Create a goal for a home, a vacation or your emergency fund.'],
  ['Gastos por categoría', 'Spending by category'], ['gastado', 'spent'], ['Otras', 'Other'], ['Cuando registres gastos verás aquí en qué se va el dinero.', 'Once you add expenses, you’ll see here where the money goes.'],
  ['Comparación con el mes anterior', 'Comparison with last month'], ['Este período', 'This period'], ['Período', 'Period'], ['Gastado', 'Spent'], ['Diferencia', 'Difference'],
  ['Cuentas', 'Accounts'], ['Debes {0}', 'You owe {0}'], ['Sin cuentas activas.', 'No active accounts.'], ['Últimos movimientos', 'Latest transactions'],
  ['Sin movimientos todavía', 'No transactions yet'], ['Toca «Registrar gasto» para agregar el primero.', 'Tap “Add expense” to add the first one.'],
  ['Estás viendo un período anterior. Los saldos siempre son los de hoy.', 'You’re viewing a past period. Balances always reflect today.'],
  // Movimientos
  ['Este mes', 'This month'], ['Últimos 90 días', 'Last 90 days'], ['Este año', 'This year'], ['Todo', 'All time'], ['Personalizado', 'Custom'], ['Rango', 'Range'],
  ['Todos los tipos', 'All types'], ['Devoluciones', 'Refunds'], ['Transferencias', 'Transfers'], ['Buscar movimientos', 'Search transactions'], ['Filtros', 'Filters'],
  ['Categoría', 'Category'], ['Cuenta', 'Account'], ['Integrante', 'Member'], ['Quitar filtro {0}', 'Remove filter {0}'], ['{#0} movimientos', '{0} transactions'],
  ['Exportar CSV', 'Export CSV'], ['La fecha inicial debe ser anterior a la final.', 'The start date must be before the end date.'], ['Sin resultados', 'No results'],
  ['No hay movimientos con estos filtros. Prueba con otro período o quita filtros.', 'No transactions match these filters. Try another period or remove filters.'],
  ['Quitar filtros', 'Remove filters'], ['Aún no hay movimientos', 'No transactions yet'], ['Registra tu primer gasto o ingreso, o importa un archivo CSV de tu banco.', 'Add your first expense or income, or import a CSV file from your bank.'],
  ['Programado ·', 'Scheduled ·'], ['Cargar más', 'Load more'], ['{#0} categorías', '{0} categories'], ['(archivada)', '(archived)'],
  // Formulario de movimiento
  ['Nuevo movimiento', 'New transaction'], ['Editar movimiento', 'Edit transaction'], ['Tipo de movimiento', 'Transaction type'], ['Cuenta', 'Account'],
  ['Desde la cuenta', 'From account'], ['Hacia la cuenta', 'To account'], ['Descripción', 'Description'], ['Se usa la categoría si lo dejas vacío', 'The category is used if left empty'],
  ['Más detalles', 'More details'], ['Comercio', 'Merchant'], ['Etiquetas', 'Tags'], ['Separadas por comas: escuela, viaje', 'Comma separated: school, trip'],
  ['Comprobante (foto o PDF)', 'Receipt (photo or PDF)'], ['Ver comprobante', 'View receipt'], ['Comprobante', 'Receipt'], ['Descargar PDF', 'Download PDF'],
  ['Repetir', 'Repeat'], ['No se repite', 'Doesn’t repeat'], ['Cada semana', 'Every week'], ['Cada 15 días (quincenal)', 'Every 15 days (biweekly)'], ['Cada mes', 'Every month'],
  ['Cada año', 'Every year'], ['Hasta (opcional)', 'Until (optional)'], ['Eliminar movimiento', 'Delete transaction'],
  ['Las transferencias mueven dinero entre tus cuentas; no son gasto ni ingreso. Para pagar una tarjeta, transfiere desde tu banco hacia la tarjeta.', 'Transfers move money between your accounts; they aren’t income or expenses. To pay a card, transfer from your bank to the card.'],
  ['Compra dividida en {#0} categorías', 'Purchase split into {0} categories'], ['Dividir entre categorías', 'Split across categories'], ['Dividir la compra', 'Split the purchase'],
  ['Agregar categoría', 'Add category'], ['Asignado {0} de {1}', 'Assigned {0} of {1}'], ['Usar una sola categoría', 'Use a single category'], ['Categoría {#0}', 'Category {0}'], ['Importe {#0}', 'Amount {0}'],
  ['Registrado por {0} · {1}', 'Added by {0} · {1}'], ['· Pago de «{0}»', '· Payment for “{0}”'],
  ['Este movimiento es parte de una serie recurrente. Los cambios aplican solo a este; la serie se gestiona en «Recurrentes».', 'This transaction is part of a recurring series. Changes apply only to this one; manage the series in “Recurring”.'],
  ['Se eliminará «{0}» por {1}. Podrás deshacerlo durante unos segundos.', '“{0}” for {1} will be deleted. You can undo it for a few seconds.'],
  ['Movimiento eliminado.', 'Transaction deleted.'], ['Movimiento recuperado.', 'Transaction restored.'], ['Cambios guardados.', 'Changes saved.'],
  ['Gasto de {0} registrado.', 'Expense of {0} added.'], ['Ingreso de {0} registrado.', 'Income of {0} added.'], ['Devolución de {0} registrado.', 'Refund of {0} added.'], ['Transferencia de {0} registrado.', 'Transfer of {0} added.'],
  ['Completa la categoría y el importe de cada división.', 'Fill in the category and amount for each split.'], ['Compra dividida', 'Split purchase'],
  ['Primero agrega una cuenta en «Cuentas y tarjetas».', 'First add an account in “Accounts & cards”.'], ['El PDF es demasiado grande (máximo 2 MB).', 'The PDF is too large (2 MB max).'],
  ['El comprobante debe ser una foto o un PDF.', 'The receipt must be a photo or a PDF.'], ['+ Agregar un nombre…', '+ Add a name…'], ['Transferencia a {0}', 'Transfer to {0}'],
  // Nombres sin cuenta
  ['Agregar un nombre', 'Add a name'], ['Para asignar movimientos o metas a alguien que no necesita su propia cuenta, como tus hijos.', 'To assign transactions or goals to someone who doesn’t need their own account, like your children.'],
  ['Ese nombre ya estaba en la lista.', 'That name was already on the list.'], ['Nombre agregado.', 'Name added.'], ['Nombres sin cuenta', 'Names without an account'], ['Agregar nombre', 'Add name'],
  ['Sin cuenta · se puede asignar a movimientos y metas', 'No account · can be assigned to transactions and goals'],
  ['Agrega a tus hijos u otras personas que no necesitan entrar a la app, para saber a quién corresponde cada gasto.', 'Add your children or others who don’t need to sign in, so you know who each expense belongs to.'],
  ['Quitar nombre', 'Remove name'], ['«{0}» ya no aparecerá en las listas. Sus movimientos conservan el nombre.', '“{0}” will no longer appear in lists. Their transactions keep the name.'], ['Nombre quitado.', 'Name removed.'], ['Quitar {0}', 'Remove {0}'],
  // Presupuesto
  ['Restante del mes', 'Left this month'], ['Usado', 'Used'], ['Usado {0} de {1}', 'Used {0} of {1}'],
  ['Presupuesto general del hogar menos todos los gastos del período.', 'The household’s overall budget minus all spending for the period.'],
  ['Suma de los presupuestos por categoría (incluye lo acumulado) menos todos los gastos del período.', 'Sum of category budgets (including rollover) minus all spending for the period.'],
  ['{0} se gastaron en categorías sin presupuesto.', '{0} was spent in categories without a budget.'], ['superó su límite por', 'went over its limit by'], ['ya usó el {#0} % de su presupuesto.', 'has used {0}% of its budget.'],
  ['Copiar de {0}', 'Copy from {0}'], ['Definir presupuesto general', 'Set overall budget'], ['Editar presupuesto general', 'Edit overall budget'], ['Completar con el mes anterior', 'Fill in from last month'],
  ['Por categoría', 'By category'], ['restante', 'left'], ['excedido', 'over'], ['Acumula sobrante', 'Rolls over'], ['+{0} del mes anterior', '+{0} from last month'],
  ['Límite superado', 'Over limit'], ['Cerca del límite', 'Near limit'], ['Editar presupuesto de {0}', 'Edit budget for {0}'], ['Sin presupuesto por categoría', 'No category budgets'],
  ['Asigna un importe a las categorías donde quieres controlar el gasto, como supermercado o transporte.', 'Set an amount for the categories you want to control, like groceries or transportation.'],
  ['Categorías sin presupuesto', 'Categories without a budget'], ['Las categorías se pueden editar en Menú → Categorías.', 'Categories can be edited in Menu → Categories.'],
  ['Se copiaron {#0} importes del mes anterior.', '{0} amounts were copied from last month.'], ['No había importes nuevos para copiar.', 'There were no new amounts to copy.'],
  ['Presupuesto · {0}', 'Budget · {0}'], ['Presupuesto general', 'Overall budget'], ['Importe presupuestado', 'Budgeted amount'], ['Acumular el sobrante al mes siguiente', 'Roll leftover over to next month'],
  ['Si sobra dinero en esta categoría, se suma al presupuesto del mes siguiente. Si te pasas, el mes siguiente empieza sin acumulado.', 'If money is left in this category, it’s added to next month’s budget. If you overspend, next month starts with no rollover.'],
  ['El presupuesto general es el tope de gasto total del hogar en el período. Si no lo defines, se usa la suma de las categorías.', 'The overall budget is the household’s total spending cap for the period. If you don’t set it, the sum of the categories is used.'],
  ['Gastado en este período:', 'Spent this period:'], ['Quitar del presupuesto', 'Remove from budget'], ['Presupuesto actualizado.', 'Budget updated.'],
  // Calendario y facturas
  ['Pendiente', 'Pending'], ['Pagada', 'Paid'], ['Vencida', 'Overdue'], ['Vencidas', 'Overdue'], ['Pendiente · parcial', 'Pending · partial'], ['Vencida · parcial', 'Overdue · partial'],
  ['Total del mes', 'Month total'], ['Calendario de pagos', 'Payment calendar'], ['Ver próximos', 'See upcoming'], ['No hay pagos este día.', 'No payments on this day.'],
  ['Próximos 30 días', 'Next 30 days'], ['No hay vencimientos pendientes en los próximos 30 días.', 'No payments due in the next 30 days.'], ['Nueva factura', 'New bill'],
  ['Facturas del hogar', 'Household bills'], ['Mensual', 'Monthly'], ['Una sola vez', 'One time'], ['Semanal', 'Weekly'], ['Quincenal (cada 15 días)', 'Biweekly (every 15 days)'],
  ['Quincenal', 'Biweekly'], ['Anual', 'Yearly'], ['· próxima {0}', '· next {0}'], ['· Inactiva', '· Inactive'], ['pagado {0}', 'paid {0}'],
  ['Sin facturas registradas', 'No bills yet'], ['Agrega la renta, la luz, el internet o los seguros para ver tus próximos pagos y no olvidar ninguno.', 'Add rent, electricity, internet or insurance to see upcoming payments and never miss one.'],
  ['Al marcar una factura como pagada se registra el gasto una sola vez. Si ya lo registraste, puedes enlazarlo en lugar de crear otro.', 'Marking a bill as paid records the expense once. If you already recorded it, you can link it instead of creating another.'],
  ['«{0}» ya está pagada.', '“{0}” is already paid.'], ['Agrega una cuenta antes de registrar pagos.', 'Add an account before recording payments.'], ['Pagar {0}', 'Pay {0}'],
  ['Vence', 'Due'], ['de {0} · pagado {1}', 'of {0} · paid {1}'], ['Importe pagado', 'Amount paid'], ['Si pagas menos, queda como pago parcial y el resto sigue pendiente.', 'If you pay less, it’s recorded as a partial payment and the rest stays pending.'],
  ['Fecha de pago', 'Payment date'], ['Registrar pago', 'Record payment'], ['Ya registré este gasto: enlazarlo', 'I already recorded this expense: link it'], ['Buscando gastos parecidos…', 'Looking for similar expenses…'],
  ['No encontramos gastos sin enlazar cerca de esta fecha.', 'No unlinked expenses found near this date.'], ['Pago parcial registrado. Quedan {0}.', 'Partial payment recorded. {0} left.'],
  ['«{0}» marcada como pagada.', '“{0}” marked as paid.'], ['Gasto enlazado a la factura.', 'Expense linked to the bill.'], ['Editar factura', 'Edit bill'], ['Ej. Electricidad', 'E.g. Electricity'],
  ['Frecuencia', 'Frequency'], ['Primer vencimiento', 'First due date'], ['Próximo vencimiento', 'Next due date'], ['Cuenta de pago', 'Payment account'], ['Elegir al pagar', 'Choose when paying'],
  ['Servicios (predeterminada)', 'Utilities (default)'], ['Recordatorio', 'Reminder'], ['El mismo día', 'Same day'], ['1 día antes', '1 day before'], ['3 días antes', '3 days before'], ['1 semana antes', '1 week before'],
  ['Los recordatorios se muestran en Inicio y en este calendario. Las notificaciones push o por correo requieren configuración adicional del servidor.', 'Reminders show on Home and in this calendar. Push or email notifications require extra server setup.'],
  ['Factura activa', 'Active bill'], ['Eliminar factura', 'Delete bill'], ['Factura guardada.', 'Bill saved.'],
  ['Se quitarán los vencimientos sin pagar. Los pagos ya registrados se conservan como movimientos.', 'Unpaid due dates will be removed. Payments already recorded stay as transactions.'],
  ['Factura desactivada; su historial de pagos se conserva.', 'Bill deactivated; its payment history is kept.'], ['Factura eliminada.', 'Bill deleted.'], ['Calendario de pagos', 'Payment calendar'],
  ['Pagado desde el calendario', 'Paid from the calendar'], ['(pago parcial)', '(partial payment)'],
  // Metas
  ['Metas de ahorro', 'Savings goals'], ['Apartado en cuentas', 'Set aside in accounts'], ['Solo seguimiento', 'Tracking only'],
  ['«Apartado en cuentas» es dinero que está en una cuenta dedicada a la meta. «Solo seguimiento» registra lo que reservas mentalmente, pero el dinero sigue en tus otras cuentas y no se suma de nuevo.', '“Set aside in accounts” is money held in an account dedicated to the goal. “Tracking only” records what you mentally reserve, but the money stays in your other accounts and isn’t added again.'],
  ['Crea tu primera meta', 'Create your first goal'], ['La casa, unas vacaciones, la educación de los hijos o un fondo de emergencia. Define cuánto y para cuándo.', 'A home, a vacation, your kids’ education or an emergency fund. Set how much and by when.'],
  ['Nueva meta', 'New goal'], ['Metas archivadas ({#0})', 'Archived goals ({0})'], ['¡Meta alcanzada!', 'Goal reached!'],
  ['Para llegar a tiempo: {0} al mes. Supuesto: aportes iguales cada mes y sin intereses.', 'To get there on time: {0} per month. Assumption: equal monthly contributions and no interest.'],
  ['{#0} de {#1}', '{0} of {1}'], ['Ahorrado', 'Saved'], ['Objetivo', 'Target'], ['Faltan {0}', '{0} to go'], ['Aportar', 'Contribute'], ['Retirar', 'Withdraw'],
  ['El avance es el saldo actual de «{0}». Aportar o retirar registra una transferencia entre tus cuentas.', 'Progress is the current balance of “{0}”. Contributing or withdrawing records a transfer between your accounts.'],
  ['Meta de seguimiento: las aportaciones no mueven dinero entre cuentas.', 'Tracking goal: contributions don’t move money between accounts.'], ['· con transferencia', '· with transfer'],
  ['Aún no hay aportaciones registradas desde la app. El avance usa el saldo actual de la cuenta.', 'No contributions recorded in the app yet. Progress uses the account’s current balance.'], ['Aún no hay aportaciones.', 'No contributions yet.'],
  ['Eliminar registro', 'Delete entry'], ['Eliminar meta', 'Delete goal'], ['Meta reactivada.', 'Goal reactivated.'], ['Meta archivada.', 'Goal archived.'],
  ['También se eliminará la transferencia asociada y los saldos volverán a como estaban.', 'The related transfer will also be deleted and balances will go back to how they were.'],
  ['Se quitará del historial de la meta.', 'It will be removed from the goal’s history.'], ['Registro eliminado.', 'Entry deleted.'],
  ['Se eliminará «{0}» y su historial. Las transferencias ya registradas entre cuentas se conservan.', '“{0}” and its history will be deleted. Transfers already recorded between accounts are kept.'],
  ['Meta eliminada.', 'Goal deleted.'], ['Aportar a {0}', 'Contribute to {0}'], ['Retirar de {0}', 'Withdraw from {0}'],
  ['Se registrará una transferencia hacia «{0}». No cuenta como gasto.', 'A transfer to “{0}” will be recorded. It doesn’t count as an expense.'],
  ['Se registrará una transferencia desde «{0}». No cuenta como gasto.', 'A transfer from “{0}” will be recorded. It doesn’t count as an expense.'],
  ['Necesitas otra cuenta (no de crédito) para mover el dinero.', 'You need another (non-credit) account to move the money.'], ['Aportaste {0} a «{1}».', 'You contributed {0} to “{1}”.'],
  ['Retiraste {0} de «{1}».', 'You withdrew {0} from “{1}”.'], ['Editar meta', 'Edit goal'], ['Ej. Vacaciones en familia', 'E.g. Family vacation'], ['Importe objetivo', 'Target amount'],
  ['Fecha objetivo (opcional)', 'Target date (optional)'], ['¿Dónde está el dinero?', 'Where is the money?'], ['Solo seguimiento: el dinero sigue en mis cuentas normales', 'Tracking only: the money stays in my regular accounts'],
  ['Apartado en una cuenta dedicada', 'Set aside in a dedicated account'], ['Cuenta de la meta', 'Goal account'],
  ['El avance será el saldo de esa cuenta. Úsala solo para esta meta para no mezclar dinero.', 'Progress will be that account’s balance. Use it only for this goal so money doesn’t get mixed.'],
  ['Integrantes que participan', 'Participating members'], ['Guardar meta', 'Save goal'], ['Escribe un importe objetivo mayor que cero.', 'Enter a target amount greater than zero.'], ['Meta guardada.', 'Goal saved.'],
  ['Nuestra casa', 'Our home'], ['Fondo de emergencia', 'Emergency fund'], ['Viaje en familia', 'Family trip'],
  // Deudas
  ['Deuda total en seguimiento', 'Total tracked debt'], ['Registra aquí préstamos o deudas que no son tarjetas. Las tarjetas se controlan en «Cuentas y tarjetas».', 'Track loans or debts that aren’t cards here. Cards are managed in “Accounts & cards”.'],
  ['Agregar deuda', 'Add debt'], ['Deudas archivadas', 'Archived debts'], ['Sin acreedor', 'No lender'], ['· paga el día {#0}', '· due on day {0}'],
  ['Pago', 'Payment'], ['pago restante', 'payment left'], ['pagos restantes', 'payments left'], ['Pagado {0} de {1} ({#2} %)', 'Paid {0} of {1} ({2}%)'],
  ['Próximo pago {0}', 'Next payment {0}'], ['Alerta en calendario', 'Calendar alert'], ['Saldada', 'Paid off'], ['¡Deuda saldada!', 'Debt paid off!'],
  ['Proyección: {#0} pagos más de {1} para liquidarla, con {2} de intereses.', 'Projection: {0} more payments of {1} to pay it off, with {2} in interest.'],
  ['Supuestos: pago mensual fijo de {0}; tasa anual de {#1} % aplicada cada mes como tasa/12; sin cargos nuevos.', 'Assumptions: fixed monthly payment of {0}; {1}% annual rate applied monthly as rate/12; no new charges.'],
  ['Agrega un pago mensual para calcular la proyección.', 'Add a monthly payment to calculate the projection.'], ['El pago mensual no cubre los intereses: la deuda no bajaría.', 'The monthly payment doesn’t cover the interest: the debt wouldn’t go down.'],
  ['Ver y editar', 'View & edit'], ['Eliminar deuda', 'Delete debt'], ['Eliminar deuda {0}', 'Delete debt {0}'], ['Sin deudas en seguimiento', 'No debts tracked'],
  ['Agrega un préstamo personal, del auto o hipotecario para saber cuántos pagos te faltan y recibir la alerta en el calendario.', 'Add a personal, car or mortgage loan to know how many payments you have left and get a calendar alert.'],
  ['Se eliminará «{0}», su historial de pagos y su alerta del calendario. Los gastos ya registrados en tus cuentas se conservan.', '“{0}”, its payment history and its calendar alert will be deleted. Expenses already recorded in your accounts are kept.'],
  ['Deuda eliminada.', 'Debt deleted.'], ['Primero indica el día de pago de la deuda.', 'First set the debt’s payment day.'],
  ['Abre el archivo descargado para agregarlo al calendario de tu teléfono.', 'Open the downloaded file to add it to your phone’s calendar.'], ['Saldo actual', 'Current balance'],
  ['Tasa anual {0} %', 'Annual rate {0}%'], ['Pago mensual {0}', 'Monthly payment {0}'], ['Pagos hechos', 'Payments made'], ['· faltan', '· left'], ['de', 'of'],
  ['Agregar al calendario de mi teléfono', 'Add to my phone’s calendar'], ['Descarga un archivo de calendario con el pago mensual y su aviso; ábrelo en tu teléfono para guardarlo.', 'Downloads a calendar file with the monthly payment and its reminder; open it on your phone to save it.'],
  ['Pagos registrados en la app', 'Payments recorded in the app'], ['Aún no hay pagos.', 'No payments yet.'], ['· registrado como gasto', '· recorded as an expense'], ['Eliminar pago', 'Delete payment'],
  ['Si el pago se registró como gasto, ese movimiento también se eliminará.', 'If the payment was recorded as an expense, that transaction will also be deleted.'], ['Pago eliminado.', 'Payment deleted.'],
  ['Editar deuda', 'Edit debt'], ['Nueva deuda', 'New debt'], ['Ej. Préstamo del auto', 'E.g. Car loan'], ['Acreedor (opcional)', 'Lender (optional)'], ['Saldo pendiente', 'Outstanding balance'],
  ['A la fecha', 'As of'], ['Pago mensual', 'Monthly payment'], ['Tasa anual (%)', 'Annual rate (%)'], ['Total de pagos (cuotas)', 'Total number of payments'], ['Pagos ya hechos', 'Payments already made'],
  ['Ej. 48', 'E.g. 48'], ['Ejemplo: un préstamo a 48 meses del que ya pagaste 12 → total 48, ya hechos 12. La app te dirá cuántos pagos faltan; los pagos que registres aquí se suman solos.', 'Example: a 48-month loan you’ve already paid 12 of → total 48, already made 12. The app tells you how many payments are left; payments you record here are added automatically.'],
  ['Día de pago', 'Payment day'], ['Mostrar los pagos en el calendario y avisarme', 'Show payments in the calendar and remind me'], ['Aviso', 'Reminder'], ['Se paga desde', 'Paid from'],
  ['Cada mes aparecerá «Pago: nombre de la deuda» en el Calendario y en Próximos pagos. Al marcarlo pagado, también se descuenta de la deuda.', 'Each month, “Payment: debt name” will appear in the Calendar and Upcoming payments. Marking it paid also reduces the debt.'],
  ['Revisa los importes y la tasa.', 'Check the amounts and the rate.'], ['Deuda guardada. Sus pagos ya aparecen en el calendario.', 'Debt saved. Its payments now appear in the calendar.'], ['Deuda guardada.', 'Debt saved.'],
  ['Pago · {0}', 'Payment · {0}'], ['Pago: {0}', 'Payment: {0}'], ['Pagado desde', 'Paid from'], ['Solo registrar el pago', 'Just record the payment'],
  ['Si eliges una cuenta, también se registra el gasto en «Deudas y préstamos» y se marca pagado el vencimiento del calendario.', 'If you choose an account, the expense is also recorded under “Debts & loans” and the calendar due date is marked paid.'],
  ['Si eliges una cuenta, también se registra el gasto en «Deudas y préstamos».', 'If you choose an account, the expense is also recorded under “Debts & loans”.'], ['Pago registrado.', 'Payment recorded.'],
  // Cuentas
  ['Patrimonio en cuentas', 'Net worth in accounts'], ['Disponible', 'Available'], ['Deuda en tarjetas', 'Card debt'],
  ['Disponible = efectivo + bancos + ahorros. Deuda en tarjetas = saldo pendiente de todas las tarjetas.', 'Available = cash + bank + savings. Card debt = outstanding balance on all cards.'],
  ['Cuentas bancarias', 'Bank accounts'], ['Efectivo', 'Cash'], ['Ahorros', 'Savings'], ['Tarjetas de crédito', 'Credit cards'], ['Cuenta bancaria', 'Bank account'], ['Tarjeta de crédito', 'Credit card'],
  ['Sin cuentas activas', 'No active accounts'], ['Agrega tu efectivo, tu cuenta bancaria, tus ahorros o tus tarjetas con el saldo que tienen hoy.', 'Add your cash, bank account, savings or cards with today’s balance.'],
  ['Agregar cuenta o tarjeta', 'Add account or card'], ['Solo un administrador del hogar puede crear o editar cuentas.', 'Only a household administrator can create or edit accounts.'],
  ['Cuentas archivadas ({#0})', 'Archived accounts ({0})'], ['· Archivada', '· Archived'], ['Límite', 'Limit'], ['Corte: {0}', 'Statement: {0}'], ['Sin fecha de corte', 'No statement date'],
  ['Sin fecha de pago', 'No due date'], ['Movimientos ({#0})', 'Transactions ({0})'], ['Pagar tarjeta', 'Pay card'], ['Pago de {0}', 'Payment of {0}'], ['Editar cuenta', 'Edit account'],
  ['Nueva cuenta o tarjeta', 'New account or card'], ['Ej. Banco Nacional', 'E.g. National Bank'], ['Saldo inicial', 'Opening balance'], ['Lo que debes a esa fecha', 'Amount owed on that date'],
  ['Fecha del saldo', 'Balance date'], ['Límite de crédito', 'Credit limit'], ['Día de corte', 'Statement day'],
  ['El saldo de la cuenta se calcula así: saldo inicial + ingresos y devoluciones − gastos ± transferencias, desde la fecha del saldo inicial.', 'Account balance = opening balance + income and refunds − expenses ± transfers, since the opening balance date.'],
  ['Las compras con tarjeta se registran como gasto el día de la compra. El pago de la tarjeta es una transferencia desde tu banco: no se cuenta dos veces.', 'Card purchases are recorded as expenses on the purchase date. Paying the card is a transfer from your bank, so it isn’t counted twice.'],
  ['Archivar oculta la cuenta pero conserva su historial. Solo se pueden eliminar cuentas sin movimientos.', 'Archiving hides the account but keeps its history. Only accounts without transactions can be deleted.'],
  ['Escribe un saldo válido.', 'Enter a valid balance.'], ['Escribe un límite válido.', 'Enter a valid limit.'], ['Cuenta guardada.', 'Account saved.'], ['Cuenta reactivada.', 'Account reactivated.'],
  ['Cuenta archivada.', 'Account archived.'], ['Eliminar cuenta', 'Delete account'], ['Se eliminará «{0}». Esta acción no se puede deshacer.', '“{0}” will be deleted. This can’t be undone.'], ['Cuenta eliminada.', 'Account deleted.'],
  ['Saldo hoy', 'Balance today'], ['Nombre (ej. Banco, Efectivo)', 'Name (e.g. Bank, Cash)'], ['Nombre de la cuenta', 'Account name'], ['Quitar cuenta', 'Remove account'], ['Tipo de cuenta', 'Account type'],
  ['En tarjetas de crédito, escribe lo que debes hoy.', 'For credit cards, enter what you owe today.'],
  // Informes
  ['Mes', 'Month'], ['Trimestre', 'Quarter'], ['Año', 'Year'], ['Trimestre {#0} de {#1}', 'Quarter {0} of {1}'], ['Año {#0}', 'Year {0}'], ['Tipo de informe', 'Report type'], ['CSV', 'CSV'], ['Imprimir', 'Print'],
  ['Gastos = gastos − devoluciones. Las transferencias entre cuentas propias no se incluyen.', 'Expenses = expenses − refunds. Transfers between your own accounts are excluded.'],
  ['Ingresos frente a gastos', 'Income vs. expenses'], ['Semana desde', 'Week from'], ['Evolución del saldo', 'Balance over time'], ['Saldo total', 'Total balance'], ['Inicio', 'Home'],
  ['Saldo total de todas las cuentas (las tarjetas restan) al cierre de cada período.', 'Total balance of all accounts (cards subtract) at the end of each period.'], ['Al cierre de', 'As of'],
  ['Categorías con mayor gasto', 'Top spending categories'], ['total', 'total'], ['Sin gastos en este período.', 'No expenses in this period.'], ['Comparación con el presupuesto', 'Budget comparison'],
  ['No hay presupuestos en este período. Crea uno en la sección Presupuesto.', 'No budgets in this period. Create one in the Budget section.'], ['Avance de las metas', 'Goal progress'],
  ['Aún no hay metas.', 'No goals yet.'], ['Por integrante', 'By member'], ['Movimientos asignados a cada integrante en el período.', 'Transactions assigned to each member in the period.'], ['Sin movimientos.', 'No transactions.'],
  ['Elige un rango válido: la fecha inicial debe ser anterior a la final.', 'Choose a valid range: the start date must be before the end date.'], ['Aplicar', 'Apply'],
  // Importar y respaldo
  ['Importar movimientos desde CSV', 'Import transactions from CSV'], ['Descarga el estado de cuenta de tu banco en formato CSV y súbelo aquí. Verás una vista previa antes de guardar nada.', 'Download your bank statement as CSV and upload it here. You’ll see a preview before anything is saved.'],
  ['Cuenta a la que pertenecen los movimientos', 'Account these transactions belong to'], ['Archivo CSV', 'CSV file'], ['Primero crea una cuenta en', 'First create an account in'],
  ['Conexión bancaria automática: no está activada. Cuando se agregue, deberá usar un proveedor autorizado (por ejemplo Plaid, Belvo o un agregador regulado de tu país) con autorización explícita y sin guardar contraseñas bancarias en la app.', 'Automatic bank connection: not enabled. When added, it must use an authorized provider (e.g. Plaid, Belvo or a regulated aggregator in your country) with explicit consent and without storing bank passwords in the app.'],
  ['El archivo es demasiado grande (máximo 5 MB).', 'The file is too large (5 MB max).'], ['El archivo no tiene filas para importar.', 'The file has no rows to import.'], ['Asigna las columnas', 'Map the columns'],
  ['{#0} filas encontradas. Indica qué columna corresponde a cada dato.', '{0} rows found. Choose which column holds each field.'], ['Formato de fecha', 'Date format'], ['Detectar (AAAA-MM-DD o DD/MM/AAAA)', 'Detect (YYYY-MM-DD or DD/MM/YYYY)'],
  ['— No usar —', '— Don’t use —'], ['Importe (con signo)', 'Amount (signed)'], ['O bien: columna de cargos', 'Or: debits column'], ['O bien: columna de abonos', 'Or: credits column'], ['Categoría (opcional)', 'Category (optional)'],
  ['Comercio (opcional)', 'Merchant (optional)'], ['Mi banco muestra los gastos como números positivos (invertir signos)', 'My bank shows expenses as positive numbers (invert signs)'],
  ['Gastos = importes negativos; ingresos = positivos. Si una categoría del archivo no existe, se usará «Otros gastos» u «Otros ingresos».', 'Expenses = negative amounts; income = positive. If a category in the file doesn’t exist, “Other expenses” or “Other income” is used.'],
  ['Ver vista previa', 'Preview'], ['Elige la columna de fecha.', 'Choose the date column.'], ['Elige la columna de importe o las de cargos y abonos.', 'Choose the amount column or the debit and credit columns.'], ['Vista previa', 'Preview'],
  ['{#0} listas', '{0} ready'], ['{#0} posibles duplicados', '{0} possible duplicates'], ['{#0} con errores', '{0} with errors'],
  ['Los posibles duplicados (mismo importe y fecha cercana en esta cuenta, o repetidos en el archivo) quedan desmarcados. Márcalos si quieres importarlos de todos modos.', 'Possible duplicates (same amount and a nearby date in this account, or repeated in the file) are unchecked. Check them to import anyway.'],
  ['Lista', 'Ready'], ['Ya existe ({0})', 'Already exists ({0})'], ['Repetida en el archivo', 'Repeated in the file'], ['Fecha no válida', 'Invalid date'], ['Importe no válido', 'Invalid amount'],
  ['Cambiar columnas', 'Change columns'], ['Importar seleccionadas', 'Import selected'], ['No hay filas seleccionadas.', 'No rows selected.'], ['Importación completa', 'Import complete'],
  ['Se importaron', 'Imported'], ['movimientos.', 'transactions.'], ['Ver movimientos', 'View transactions'], ['Deshacer importación', 'Undo import'],
  ['Se eliminarán los {#0} movimientos de esta importación.', 'The {0} transactions from this import will be deleted.'], ['Se quitaron {#0} movimientos.', '{0} transactions removed.'],
  ['Dónde se guardan tus datos', 'Where your data is stored'],
  ['Los datos del hogar se guardan en el servidor de JP Solution, en una base de datos SQLite (archivo', 'Household data is stored on the JP Solution server, in an SQLite database (file'],
  ['Solo los integrantes del hogar pueden verlos: el servidor comprueba el permiso en cada consulta. Las contraseñas se guardan cifradas (scrypt) y la sesión usa una cookie protegida.', 'Only household members can see it: the server checks permission on every request. Passwords are stored encrypted (scrypt) and the session uses a protected cookie.'],
  ['En este dispositivo solo se recuerdan preferencias (tema, última cuenta usada), nunca tus movimientos.', 'This device only remembers preferences (theme, language, last account used), never your transactions.'],
  ['Exportar', 'Export'], ['Todos los movimientos en CSV', 'All transactions as CSV'], ['Descargar respaldo completo', 'Download full backup'],
  ['El respaldo (JSON) contiene: datos del hogar, nombres y correos de los integrantes (sin contraseñas), cuentas, categorías, movimientos con divisiones y comprobantes, recurrentes, presupuestos, facturas y pagos, metas, deudas y sus pagos.', 'The backup (JSON) contains: household details, members’ names and emails (no passwords), accounts, categories, transactions with splits and receipts, recurring items, budgets, bills and payments, goals, debts and their payments.'],
  ['El respaldo completo y la restauración están disponibles para administradores.', 'Full backup and restore are available to administrators.'], ['Exportar mis datos personales o eliminar mi cuenta', 'Export my personal data or delete my account'],
  ['Restaurar respaldo', 'Restore backup'], ['Archivo de respaldo (.json)', 'Backup file (.json)'], ['Combinar:', 'Merge:'], ['agrega lo que falta y conserva lo que ya existe', 'adds what’s missing and keeps what already exists'],
  ['Reemplazar:', 'Replace:'], ['borra los datos financieros actuales del hogar y deja solo los del respaldo', 'deletes the household’s current financial data and keeps only the backup’s'],
  ['Conflictos: si un registro del respaldo ya existe en el hogar, se conserva la versión actual. Restaurar dos veces el mismo respaldo no duplica datos. Si el respaldo viene de otro hogar, se copian sus datos con identificadores nuevos. Los integrantes no se crean: lo registrado por personas que no están en este hogar queda a tu nombre.', 'Conflicts: if a backup record already exists in the household, the current version is kept. Restoring the same backup twice doesn’t duplicate data. If the backup comes from another household, its data is copied with new identifiers. Members aren’t created: entries by people not in this household are assigned to you.'],
  ['Restaurar', 'Restore'], ['Conexión bancaria', 'Bank connection'],
  ['Por ahora la app funciona con registro manual e importación de archivos CSV. Una conexión bancaria futura deberá usar un proveedor autorizado, con tu permiso explícito y sin guardar contraseñas bancarias en la aplicación.', 'For now the app works with manual entry and CSV import. A future bank connection must use an authorized provider, with your explicit consent and without storing bank passwords in the app.'],
  ['Respaldo descargado.', 'Backup downloaded.'], ['Elige un archivo de respaldo.', 'Choose a backup file.'], ['El archivo no es un JSON válido.', 'The file isn’t valid JSON.'],
  ['El archivo no es un respaldo de JP Solution.', 'The file isn’t a JP Solution backup.'], ['Reemplazar datos', 'Replace data'], ['Combinar respaldo', 'Merge backup'], ['Reemplazar', 'Replace'], ['Combinar', 'Merge'],
  ['Los datos financieros actuales de este hogar se borrarán.', 'This household’s current financial data will be deleted.'], ['Se agregarán los registros que no existan.', 'Records that don’t exist will be added.'],
  ['Restauración completa: {#0} movimientos, {#1} cuentas agregadas.', 'Restore complete: {0} transactions, {1} accounts added.'],
  // Menú, hogar, perfil
  ['Hogar activo', 'Active household'], ['Crear otro hogar o unirme', 'Create another household or join one'], ['Finanzas', 'Finances'], ['Movimientos recurrentes', 'Recurring transactions'],
  ['Datos', 'Data'], ['Importar movimientos (CSV)', 'Import transactions (CSV)'], ['Respaldo, exportación y privacidad', 'Backup, export & privacy'], ['Configuración', 'Settings'],
  ['Apariencia', 'Appearance'], ['Idioma', 'Language'], ['Tema', 'Theme'], ['Claro', 'Light'], ['Oscuro', 'Dark'], ['Del dispositivo', 'Device'], ['Reducir transparencia', 'Reduce transparency'],
  ['Si tu dispositivo pide reducir movimiento o transparencia, la app lo respeta automáticamente.', 'If your device asks to reduce motion or transparency, the app follows it automatically.'],
  ['Cerrar sesión', 'Sign out'], ['Ahora ves «{0}».', 'Now viewing “{0}”.'], ['Demo', 'Demo'], ['Datos del hogar', 'Household details'], ['Nombre del hogar', 'Household name'], ['Moneda', 'Currency'],
  ['Dólar estadounidense (USD)', 'US dollar (USD)'], ['Inicio del mes', 'Month starts on'], ['Zona horaria', 'Time zone'], ['Solo un administrador puede cambiar estos datos.', 'Only an administrator can change these details.'],
  ['Integrantes con cuenta ({#0})', 'Members with an account ({0})'], ['Permisos', 'Permissions'],
  ['configura el hogar, invita o quita integrantes, administra cuentas, restaura respaldos y puede eliminar el hogar.', 'sets up the household, invites or removes members, manages accounts, restores backups and can delete the household.'],
  ['ve los datos del hogar y registra o edita movimientos, presupuestos, facturas y metas.', 'sees the household’s data and adds or edits transactions, budgets, bills and goals.'],
  ['Cada movimiento guarda quién lo registró. Los datos pertenecen al hogar y solo sus integrantes pueden verlos.', 'Each transaction records who added it. Data belongs to the household and only its members can see it.'],
  ['Invitar a un integrante', 'Invite a member'], ['Nombre (opcional)', 'Name (optional)'], ['Ej. Mamá', 'E.g. Mom'], ['Permiso', 'Permission'], ['Crear invitación', 'Create invitation'],
  ['Se genera un enlace de un solo uso que vence en 7 días. Compártelo por el medio que prefieras; la persona creará su propia cuenta.', 'A one-time link that expires in 7 days is created. Share it however you like; the person will create their own account.'],
  ['Código', 'Code'], ['Enlace de invitación', 'Invitation link'], ['Copiar enlace', 'Copy link'], ['Invitaciones pendientes', 'Pending invitations'], ['vence {0}', 'expires {0}'],
  ['Salir o eliminar', 'Leave or delete'], ['Salir de este hogar', 'Leave this household'], ['Eliminar el hogar y todos sus datos', 'Delete the household and all its data'],
  ['Enlace copiado.', 'Link copied.'], ['No se pudo copiar. Selecciona el enlace y cópialo manualmente.', 'Couldn’t copy. Select the link and copy it manually.'], ['Hogar actualizado.', 'Household updated.'],
  ['Invitación anulada.', 'Invitation revoked.'], ['Salir del hogar', 'Leave household'], ['Dejarás de ver los datos de este hogar. Tus movimientos registrados se conservan para el resto de la familia.', 'You’ll stop seeing this household’s data. Transactions you added are kept for the rest of the family.'],
  ['Saliste del hogar.', 'You left the household.'], ['Eliminar hogar', 'Delete household'], ['Eliminar definitivamente', 'Delete permanently'],
  ['Se borrarán para siempre todas las cuentas, movimientos, presupuestos, facturas y metas de «{0}». Te recomendamos descargar un respaldo antes.', 'All accounts, transactions, budgets, bills and goals of “{0}” will be permanently deleted. We recommend downloading a backup first.'],
  ['Escribe «{0}» para confirmar', 'Type “{0}” to confirm'], ['Hogar eliminado.', 'Household deleted.'], ['Quitar del hogar', 'Remove from household'],
  ['Al quitar a alguien, sus movimientos se conservan y siguen mostrando quién los registró.', 'When you remove someone, their transactions are kept and still show who added them.'], ['Guardar', 'Save'],
  ['Permiso actualizado.', 'Permission updated.'], ['Quitar integrante', 'Remove member'], ['{0} ya no podrá ver los datos del hogar.', '{0} will no longer be able to see the household’s data.'], ['Integrante quitado.', 'Member removed.'],
  ['Las categorías iniciales se pueden editar. Si una categoría ya tiene movimientos, al eliminarla se archiva para conservar el historial.', 'The starting categories can be edited. If a category already has transactions, deleting it archives it to keep the history.'],
  ['Nueva', 'New'], ['Archivada', 'Archived'], ['Editar categoría', 'Edit category'], ['Nueva categoría', 'New category'], ['Eliminar categoría', 'Delete category'],
  ['Si tiene movimientos, se archivará en lugar de borrarse.', 'If it has transactions, it will be archived instead of deleted.'], ['La categoría tenía movimientos: se archivó.', 'The category had transactions, so it was archived.'],
  ['Categoría eliminada.', 'Category deleted.'], ['Categoría guardada.', 'Category saved.'],
  ['Los movimientos recurrentes se crean solos en su fecha. Para crear uno nuevo, registra un movimiento y elige «Repetir» en «Más detalles».', 'Recurring transactions are created automatically on their date. To create one, add a transaction and choose “Repeat” under “More details”.'],
  ['· próximo {0}', '· next {0}'], ['· hasta {0}', '· until {0}'], ['· Detenido', '· Stopped'], ['Reanudar', 'Resume'], ['Sin movimientos recurrentes', 'No recurring transactions'],
  ['Úsalos para el salario, la renta o las suscripciones: se registran solos cada semana, quincena, mes o año.', 'Use them for salary, rent or subscriptions: they’re added automatically every week, two weeks, month or year.'],
  ['Detener recurrente', 'Stop recurring'], ['No se crearán más movimientos de esta serie. Los ya registrados se conservan.', 'No more transactions will be created for this series. Existing ones are kept.'],
  ['Serie detenida.', 'Series stopped.'], ['Serie reanudada; se crearán los movimientos pendientes.', 'Series resumed; pending transactions will be created.'],
  ['Tus datos', 'Your details'], ['Correo', 'Email'], ['Cambiar contraseña', 'Change password'], ['Contraseña actual', 'Current password'], ['Contraseña nueva (mínimo 8)', 'New password (at least 8)'],
  ['Privacidad', 'Privacy'], ['Descargar todos mis datos', 'Download all my data'], ['Incluye tu perfil y los datos de los hogares a los que perteneces, en formato JSON.', 'Includes your profile and the data of the households you belong to, in JSON format.'],
  ['Eliminar mi cuenta', 'Delete my account'], ['Si eres la única persona de un hogar, ese hogar se elimina. Si eres el único administrador de un hogar con más integrantes, primero nombra a otro administrador.', 'If you’re the only person in a household, that household is deleted. If you’re the only administrator of a household with other members, first make someone else an administrator.'],
  ['Datos guardados.', 'Details saved.'], ['Contraseña actualizada.', 'Password updated.'], ['Esta acción no se puede deshacer. Descarga tus datos antes si los necesitas.', 'This can’t be undone. Download your data first if you need it.'],
  ['Escribe tu contraseña para confirmar', 'Enter your password to confirm'], ['Tu cuenta fue eliminada.', 'Your account was deleted.'],
  // Acceso y bienvenida
  ['Hola de nuevo', 'Welcome back'], ['Organiza las finanzas de tu familia en un solo lugar.', 'Organize your family’s finances in one place.'], ['Contraseña', 'Password'], ['Entrar', 'Sign in'],
  ['Olvidé mi contraseña', 'Forgot my password'], ['Crear cuenta', 'Create account'], ['Crea tu cuenta', 'Create your account'],
  ['Cada integrante usa su propia cuenta. Así se sabe quién registró cada movimiento.', 'Each member uses their own account, so you know who added each transaction.'], ['Tu nombre', 'Your name'],
  ['Contraseña (mínimo 8 caracteres)', 'Password (at least 8 characters)'], ['Te unirás al hogar con la invitación {0}', 'You’ll join the household with invitation {0}'], ['¿Ya tienes cuenta?', 'Already have an account?'],
  ['Inicia sesión', 'Sign in'], ['Te uniste al hogar.', 'You joined the household.'], ['Recupera tu acceso', 'Recover your access'], ['Te enviaremos un enlace para crear una contraseña nueva.', 'We’ll send you a link to create a new password.'],
  ['Correo de tu cuenta', 'Your account email'], ['Enviar enlace', 'Send link'], ['Volver a iniciar sesión', 'Back to sign in'], ['Solicitud recibida', 'Request received'],
  ['Si el envío de correos todavía no está configurado, quien administra el servidor encontrará el enlace en la ventana donde se ejecuta JP Solution.', 'If email sending isn’t set up yet, whoever runs the server will find the link in the window where JP Solution is running.'],
  ['Nueva contraseña', 'New password'], ['Contraseña nueva (mínimo 8 caracteres)', 'New password (at least 8 characters)'], ['Guardar y entrar', 'Save and sign in'],
  ['Invitación no disponible', 'Invitation unavailable'], ['Te invitaron a «{0}»', 'You were invited to “{0}”'], ['Entrarás como administrador. Crea tu cuenta o inicia sesión para aceptar.', 'You’ll join as an administrator. Create an account or sign in to accept.'],
  ['Entrarás como miembro. Crea tu cuenta o inicia sesión para aceptar.', 'You’ll join as a member. Create an account or sign in to accept.'], ['Ya tengo cuenta', 'I already have an account'], ['Únete a «{0}»', 'Join “{0}”'],
  ['Entrarás como administrador con tu cuenta {0}.', 'You’ll join as an administrator with your account {0}.'], ['Entrarás como miembro con tu cuenta {0}.', 'You’ll join as a member with your account {0}.'],
  ['Unirme al hogar', 'Join household'], ['Ahora no', 'Not now'], ['Hola, {0}', 'Hi, {0}'], ['Crea otro hogar', 'Create another household'],
  ['Configura tu hogar en un minuto. Podrás cambiarlo después.', 'Set up your household in a minute. You can change it later.'], ['Ej. Familia Pérez', 'E.g. The Smith Family'],
  ['El «inicio del mes» es el día en que empieza tu presupuesto; por ejemplo, el día en que cobras.', '“Month starts on” is the day your budget starts, for example your payday.'],
  ['Cuentas y saldos de hoy', 'Accounts and today’s balances'], ['Empieza con lo que tienes hoy; no hace falta registrar el pasado.', 'Start with what you have today; no need to enter the past.'],
  ['Crear hogar', 'Create household'], ['Tengo un código de invitación', 'I have an invitation code'], ['Código de invitación', 'Invitation code'], ['Unirme', 'Join'],
  ['Probar primero con datos de demostración', 'Try it first with demo data'], ['La demostración se crea como un hogar aparte; tus datos reales no se mezclan.', 'The demo is created as a separate household; your real data isn’t mixed in.'],
  ['Ponle nombre a cada cuenta.', 'Give each account a name.'], ['Revisa el saldo de «{0}».', 'Check the balance of “{0}”.'], ['¡Listo! Tu hogar está creado.', 'Done! Your household is ready.'],
  ['Hogar de demostración listo.', 'Demo household ready.'], ['Hogar de demostración', 'Demo household'], ['Día {#0}', 'Day {0}'], ['—', '—'],
  // Categorías iniciales
  ['Vivienda', 'Housing'], ['Supermercado', 'Groceries'], ['Transporte', 'Transportation'], ['Salud', 'Health'], ['Seguros', 'Insurance'], ['Educación', 'Education'], ['Servicios', 'Utilities'],
  ['Entretenimiento', 'Entertainment'], ['Suscripciones', 'Subscriptions'], ['Restaurantes', 'Restaurants'], ['Ropa y cuidado', 'Clothing & personal care'], ['Deudas y préstamos', 'Debts & loans'],
  ['Regalos', 'Gifts'], ['Otros gastos', 'Other expenses'], ['Salario', 'Salary'], ['Negocio propio', 'Own business'], ['Otros ingresos', 'Other income'],
  // Mensajes del servidor
  ['No encontramos ese registro.', 'We couldn’t find that record.'], ['Escribe un correo válido.', 'Enter a valid email.'], ['La contraseña debe tener al menos 8 caracteres.', 'The password must be at least 8 characters.'],
  ['La contraseña es demasiado larga.', 'The password is too long.'], ['Demasiados intentos. Espera unos minutos y vuelve a intentarlo.', 'Too many attempts. Wait a few minutes and try again.'],
  ['La cuenta está archivada. Reactívala o elige otra.', 'The account is archived. Reactivate it or choose another.'], ['El integrante elegido no pertenece al hogar.', 'The selected member doesn’t belong to the household.'],
  ['Elige dos cuentas diferentes para la transferencia.', 'Choose two different accounts for the transfer.'], ['Puedes dividir una compra en máximo 12 categorías.', 'You can split a purchase into at most 12 categories.'],
  ['Elige una categoría de ingreso.', 'Choose an income category.'], ['Elige una categoría de gasto.', 'Choose an expense category.'],
  ['La suma de las divisiones ({#0}) debe ser igual al importe ({#1}).', 'The splits total ({0}) must equal the amount ({1}).'],
  ['El comprobante debe ser una imagen o un PDF.', 'The receipt must be an image or a PDF.'], ['El comprobante es demasiado grande (máximo 2 MB).', 'The receipt is too large (2 MB max).'],
  ['Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.', 'An account with that email already exists. Sign in or recover your password.'], ['Correo o contraseña incorrectos.', 'Incorrect email or password.'],
  ['Si el correo está registrado, enviamos un enlace para restablecer la contraseña.', 'If the email is registered, we sent a link to reset the password.'], ['El enlace no es válido o ya venció. Pide uno nuevo.', 'The link is invalid or expired. Request a new one.'],
  ['La contraseña actual no es correcta.', 'The current password is incorrect.'], ['La contraseña no es correcta.', 'The password is incorrect.'],
  ['Antes de eliminar tu cuenta, nombra otro administrador en «{0}».', 'Before deleting your account, make someone else an administrator in “{0}”.'],
  ['La invitación no es válida o ya se usó.', 'The invitation is invalid or was already used.'], ['La invitación venció. Pide una nueva.', 'The invitation expired. Ask for a new one.'], ['Ya perteneces a este hogar.', 'You already belong to this household.'],
  ['La invitación no es válida, ya se usó o venció.', 'The invitation is invalid, used or expired.'], ['Para confirmar, escribe el nombre exacto del hogar: {0}', 'To confirm, type the household’s exact name: {0}'],
  ['Esa persona no pertenece al hogar.', 'That person doesn’t belong to the household.'], ['El hogar necesita al menos un administrador.', 'The household needs at least one administrator.'],
  ['Solo un administrador puede quitar a otras personas.', 'Only an administrator can remove other people.'], ['Eres la única persona del hogar. Si ya no lo necesitas, elimina el hogar.', 'You’re the only person in the household. If you no longer need it, delete the household.'],
  ['Nombra otro administrador antes de salir.', 'Make someone else an administrator before leaving.'], ['Esta cuenta tiene movimientos. Archívala para conservar el historial.', 'This account has transactions. Archive it to keep the history.'],
  ['Una meta usa esta cuenta. Cambia la meta primero.', 'A goal uses this account. Change the goal first.'], ['Ya existe una categoría con ese nombre.', 'A category with that name already exists.'],
  ['Este movimiento no tiene comprobante.', 'This transaction has no receipt.'], ['La fecha final debe ser posterior a la fecha del movimiento.', 'The end date must be after the transaction date.'],
  ['Este movimiento es el pago de una factura y debe seguir siendo un gasto.', 'This transaction is a bill payment and must stay an expense.'], ['Mes no válido.', 'Invalid month.'],
  ['No encontramos ese vencimiento.', 'We couldn’t find that due date.'], ['Esta factura ya está pagada.', 'This bill is already paid.'], ['Solo puedes enlazar un gasto vigente.', 'You can only link an active expense.'],
  ['Ese gasto ya está enlazado a otra factura.', 'That expense is already linked to another bill.'], ['El pago no puede ser mayor que lo pendiente ({#0}).', 'The payment can’t be more than what’s pending ({0}).'],
  ['Una meta no puede usar una tarjeta de crédito.', 'A goal can’t use a credit card.'], ['El importe debe ser distinto de cero.', 'The amount must not be zero.'], ['Elige una cuenta distinta a la de la meta.', 'Choose an account other than the goal’s.'],
  ['Los pagos ya hechos no pueden ser más que el total de pagos.', 'Payments already made can’t exceed the total number of payments.'], ['Para la alerta del calendario, elige el día de pago.', 'For the calendar alert, choose the payment day.'],
  ['Para la alerta del calendario, escribe el pago mensual.', 'For the calendar alert, enter the monthly payment.'], ['Elige un rango de hasta 5 años.', 'Choose a range of up to 5 years.'],
  ['No hay filas para importar.', 'There are no rows to import.'], ['Importa como máximo 5000 filas por archivo.', 'Import at most 5,000 rows per file.'], ['El archivo es demasiado grande.', 'The file is too large.'],
  ['Datos no válidos.', 'Invalid data.'], ['Ruta no encontrada.', 'Route not found.'], ['Solicitud no permitida.', 'Request not allowed.'], ['Tu sesión terminó. Vuelve a iniciar sesión.', 'Your session ended. Please sign in again.'],
  ['No encontramos este hogar o no tienes acceso.', 'We couldn’t find this household or you don’t have access.'], ['Esta acción solo la puede hacer un administrador del hogar.', 'Only a household administrator can do this.'],
  ['Este registro ya existe.', 'This record already exists.'], ['Algo salió mal en el servidor. Tus datos no se modificaron; intenta de nuevo.', 'Something went wrong on the server. Your data wasn’t changed; please try again.'],
  ['Falta {0}.', '{0} is missing.'], ['{0}: escribe un importe válido.', '{0}: enter a valid amount.'], ['{0} debe ser mayor que cero.', '{0} must be greater than zero.'],
  ['{0} no puede ser negativo.', '{0} can’t be negative.'], ['{0}: usa una fecha válida.', '{0}: use a valid date.'], ['{0}: opción no válida.', '{0}: invalid option.'],
  ['{0} debe estar entre {#1} y {#2}.', '{0} must be between {1} and {2}.'], ['{0} es demasiado largo (máximo {#1} caracteres).', '{0} is too long (max {1} characters).'],
  ['El {0} elegido no existe en este hogar.', 'The selected {0} doesn’t exist in this household.'], ['Elige un {0} válido.', 'Choose a valid {0}.'],
  ['nombre del hogar', 'household name'], ['nombre de la cuenta', 'account name'], ['nombre de la meta', 'goal name'], ['nombre de la deuda', 'debt name'], ['nombre de la factura', 'bill name'],
  ['nombre de la categoría', 'category name'], ['descripción', 'description'], ['nombre', 'name'], ['correo', 'email'], ['importe', 'amount'], ['fecha', 'date'], ['saldo', 'balance'],
  ['cuenta', 'account'], ['categoría', 'category'], ['movimiento', 'transaction'], ['cuenta destino', 'destination account'], ['cuenta de origen', 'source account'], ['meta', 'goal'],
  ['deuda', 'debt'], ['factura', 'bill'], ['Importe pagado', 'Amount paid'], ['Importe objetivo', 'Target amount'], ['Pago mensual', 'Monthly payment'], ['Día de pago', 'Payment day'],
  ['Día de inicio', 'Start day'], ['Fecha del saldo inicial', 'Opening balance date'], ['Total de pagos', 'Total payments'], ['Pagos ya hechos', 'Payments already made'], ['Vencimiento', 'Due date'],
  // Versión personal
  ['Bienvenida a JP Solution', 'Welcome to JP Solution'], ['¿Cómo te llamas?', 'What’s your name?'], ['Ya tengo un respaldo: restaurarlo', 'I have a backup: restore it'],
  ['Crear otro hogar', 'Create another household'], ['Hogar y nombres', 'Household & names'], ['Seguridad y bloqueo', 'Security & lock'], ['Datos guardados en este teléfono', 'Data stored on this phone'],
  ['App bloqueada', 'App locked'], ['Escribe tu usuario y contraseña para ver tu información.', 'Enter your username and password to see your information.'], ['Usuario', 'Username'], ['Desbloquear', 'Unlock'],
  ['Bloqueo con usuario y contraseña', 'Username & password lock'], ['Activado · usuario «{0}»', 'On · username “{0}”'], ['Bloquear cuando salgo de la app', 'Lock when I leave the app'],
  ['De inmediato', 'Immediately'], ['Después de 1 minuto', 'After 1 minute'], ['Después de 5 minutos', 'After 5 minutes'], ['Después de 15 minutos', 'After 15 minutes'],
  ['Cambiar usuario o contraseña', 'Change username or password'], ['Quitar el bloqueo', 'Remove the lock'], ['Bloquear ahora', 'Lock now'],
  ['Al activarlo, la app pedirá tu usuario y contraseña cada vez que la abras, y tu información quedará cifrada en el teléfono.', 'Once on, the app asks for your username and password every time you open it, and your information is encrypted on the phone.'],
  ['Contraseña (mínimo 6 caracteres)', 'Password (at least 6 characters)'], ['Repite la contraseña', 'Repeat the password'], ['Activar bloqueo', 'Turn on lock'],
  ['Importante: si olvidas la contraseña no se puede recuperar. Tendrías que borrar los datos del teléfono y restaurarlos desde tu respaldo de Google Sheets. Activa el respaldo antes de poner el bloqueo.', 'Important: a forgotten password can’t be recovered. You’d have to erase the phone’s data and restore it from your Google Sheets backup. Turn on the backup before the lock.'],
  ['Respaldo en Google Sheets', 'Google Sheets backup'], ['Conectado', 'Connected'], ['Último respaldo: {0}', 'Last backup: {0}'], ['Aún sin respaldo', 'No backup yet'], ['Último intento falló: {0}', 'Last attempt failed: {0}'],
  ['Respaldar automáticamente después de cada cambio', 'Back up automatically after each change'], ['Respaldar ahora', 'Back up now'], ['Restaurar desde Google Sheets', 'Restore from Google Sheets'], ['Desconectar la hoja', 'Disconnect the sheet'],
  ['En tu hoja verás las pestañas Movimientos, Cuentas, Presupuesto, Facturas, Metas y Deudas. La pestaña oculta «_respaldo» guarda la copia completa para restaurar.', 'Your sheet will have the tabs Movimientos, Cuentas, Presupuesto, Facturas, Metas and Deudas. The hidden “_respaldo” tab keeps the full copy for restoring.'],
  ['Guarda una copia de tus datos en una hoja de Google de tu propia cuenta. Si cambias o pierdes el teléfono, la restauras con un toque.', 'Keep a copy of your data in a Google Sheet in your own account. If you change or lose your phone, restore it with one tap.'],
  ['Dirección de la aplicación web (termina en /exec)', 'Web app address (ends in /exec)'], ['Clave (la misma que pusiste en el Apps Script)', 'Key (the same one you set in Apps Script)'], ['Conectar y probar', 'Connect and test'],
  ['Restaurar desde una hoja existente', 'Restore from an existing sheet'], ['Copiar el código del Apps Script', 'Copy the Apps Script code'],
  ['Paso a paso: 1) crea una hoja nueva en Google Sheets; 2) Extensiones → Apps Script; 3) pega el código de JP Solution y cambia la CLAVE; 4) Implementar → Nueva implementación → Aplicación web, ejecutar como «Yo» y acceso «Cualquier usuario»; 5) copia la dirección aquí.', 'Step by step: 1) create a new Google Sheet; 2) Extensions → Apps Script; 3) paste the JP Solution code and change the CLAVE; 4) Deploy → New deployment → Web app, execute as “Me”, access “Anyone”; 5) paste the address here.'],
  ['Archivo de respaldo', 'Backup file'], ['Descargar respaldo (.json)', 'Download backup (.json)'], ['Restaurar desde un archivo', 'Restore from a file'], ['Útil para guardar una copia extra en Drive, en el correo o en la computadora.', 'Handy for keeping an extra copy in Drive, email or on a computer.'],
  ['Solo en este teléfono, dentro del almacenamiento privado de la app. No se envían a ningún servidor de JP Solution.', 'Only on this phone, in the app’s private storage. Nothing is sent to any JP Solution server.'],
  ['Si conectas Google Sheets, se guarda una copia en tu propia cuenta de Google.', 'If you connect Google Sheets, a copy is kept in your own Google account.'], ['Si activas el bloqueo, la información queda cifrada con tu usuario y contraseña.', 'If you turn on the lock, the information is encrypted with your username and password.'],
  ['Borrar todo', 'Erase everything'], ['Borrar todos los datos de este teléfono', 'Erase all data on this phone'], ['Tu nombre', 'Your name'],
  ['Se usa para saber qué movimientos registraste tú y cuáles pertenecen a otros nombres.', 'Used to tell which transactions you added and which belong to other names.'], ['Dólar estadounidense (USD)', 'US dollar (USD)'],
  ['El usuario debe tener al menos 3 caracteres.', 'The username must be at least 3 characters.'], ['La contraseña debe tener al menos 6 caracteres.', 'The password must be at least 6 characters.'], ['Usuario o contraseña incorrectos.', 'Incorrect username or password.'],
  ['Primero conecta tu hoja de Google.', 'Connect your Google Sheet first.'], ['No hay conexión con Google. Revisa tu internet.', 'Can’t reach Google. Check your connection.'], ['La clave no coincide con la del Apps Script.', 'The key doesn’t match the one in Apps Script.'],
  ['La dirección debe ser la de la aplicación web del Apps Script (termina en /exec).', 'The address must be the Apps Script web app address (ends in /exec).'], ['El respaldo guardado en la hoja está incompleto.', 'The backup saved in the sheet is incomplete.'],
  ['Todavía no hay ningún respaldo guardado en esta hoja.', 'There’s no backup saved in this sheet yet.'], ['{#0} movimiento', '{0} transaction'],

];

const NUM = '[−\\-+]?(?:US)?\\$?\\s?[\\d.,]+\\s?%?';
const exact = new Map();
const patterns = [];
for (const [es, en] of EN) {
  if (/\{#?\d\}/.test(es)) {
    const parts = es.split(/(\{#?\d\})/);
    const order = [];
    const src = parts.map((p) => {
      const m = p.match(/^\{(#?)(\d)\}$/);
      if (!m) return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      order.push(Number(m[2]));
      return m[1] ? `(${NUM})` : '(.+?)';
    }).join('');
    patterns.push({ re: new RegExp('^' + src + '$'), en, order });
  } else if (!exact.has(es)) exact.set(es, en);
}
const lowerExact = new Map([...exact].map(([k, v]) => [k.toLowerCase(), v]));

let lang = 'es';
// Español por defecto; la persona puede cambiar a inglés en el Menú o en la pantalla de inicio.
try { lang = localStorage.getItem('jp-lang') || 'es'; } catch { /* sin almacenamiento */ }
export const getLang = () => lang;
// Texto elegido según el idioma, para frases que se arman con datos.
export const L = (es, en) => (lang === 'en' ? en : es);
export const locale = () => (lang === 'en' ? 'en-US' : 'es-US');

// Traduce un texto completo (o lo deja igual si no hay traducción).
export function tr(text) {
  if (lang !== 'en' || !text) return text;
  const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
  const core = text.trim();
  if (!core) return text;
  if (exact.has(core)) return lead + exact.get(core) + trail;
  for (const p of patterns) {
    const m = core.match(p.re);
    if (!m) continue;
    let out = p.en;
    p.order.forEach((n, i) => {
      const val = m[i + 1];
      out = out.replace(`{${n}}`, exact.get(val) || lowerExact.get(val.toLowerCase())?.toLowerCase?.() || val);
    });
    return lead + out + trail;
  }
  return text;
}

const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE']);
function translateNode(node) {
  if (node.nodeType === 3) {
    const p = node.parentNode;
    if (!p || SKIP.has(p.nodeName) || p.closest?.('[translate="no"]')) return;
    const t = tr(node.nodeValue);
    if (t !== node.nodeValue) node.nodeValue = t;
    return;
  }
  if (node.nodeType !== 1 || SKIP.has(node.nodeName) && node.nodeName !== 'INPUT' && node.nodeName !== 'TEXTAREA') return;
  for (const a of ATTRS) {
    if (node.hasAttribute?.(a)) { const v = node.getAttribute(a); const t = tr(v); if (t !== v) node.setAttribute(a, t); }
  }
  if (SKIP.has(node.nodeName)) return;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === 3) translateNode(n);
    else for (const a of ATTRS) if (n.hasAttribute(a)) { const v = n.getAttribute(a); const t = tr(v); if (t !== v) n.setAttribute(a, t); }
    n = walker.nextNode();
  }
}

let observer = null;
export function startTranslator() {
  document.documentElement.lang = lang;
  if (lang !== 'en') return;
  translateNode(document.body);
  document.title = tr(document.title.replace(/ · JP Solution$/, '')) + (document.title.endsWith(' · JP Solution') ? ' · JP Solution' : '');
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') translateNode(m.target);
      else if (m.type === 'attributes') translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

export function setLang(l) {
  try { localStorage.setItem('jp-lang', l); } catch { /* sin almacenamiento */ }
  location.reload();
}

// Para revisar en desarrollo: textos visibles en español que aún no tienen traducción.
export function missing() {
  const out = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim();
    if (t && /[áéíóúñ¿¡]|\b(de|el|la|los|las|para|con|sin|tu|tus|que|en|del|por|una|un)\b/i.test(t) && tr(t) === t && !n.parentNode.closest('[translate="no"], select[name=timezone]')) out.add(t);
  }
  return [...out];
}
