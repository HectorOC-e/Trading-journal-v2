# Prácticas: consistencia del modal y protección de borrador

Diseño aprobado por el usuario: aplicar los cinco ajustes propuestos al modal y las acciones de Prácticas. Mantener APIs, datos, permisos, límites y zona del perfil.

## Implementación

- [x] Reproducir con pruebas la pérdida de borrador al cerrar y el Markdown sin formato.
- [x] Reutilizar Button, Input, Textarea, Field, DialogHeader/Description/Footer, ConfirmDialog y Markdown existentes. El select nativo conserva el estilo del sistema porque no hay Select genérico compartido.
- [x] Quitar el contenedor redundante de padding/scroll: DialogContent ya proporciona ambos. Agrupar guardar/cerrar en el pie, con un único formulario y botón submit asociado por id.
- [x] Separar registro, capturas y asistente; distinguir comentarios actuales e históricos. Mostrar cargas solo en la acción que las ejecuta.
- [x] Confirmar descarte con borrador real o subida pendiente; cerrar sin aviso cuando el registro está limpio o el formulario nuevo está intacto. Cancelar conserva campos y archivo. Proteger recarga/cierre de pestaña mientras hay cambios.
- [x] Probar guardar, cerrar por pie/X/Escape/fondo, cancelar descarte, descartar, confirmación de eliminación, subida/reintento y Markdown seguro; revisar móvil/contraste/teclado.
- [x] Ejecutar suite, TypeScript, lint y Graphify; revisión independiente de la rama.
- [ ] Publicar una preview, QA real con cuenta existente y comentarios ya guardados (sin copiar claves ni invocar IA de nuevo); capturas escritorio/móvil; merge/borrar rama y verificar producción/CI siguiendo autorización vigente.

## Decisiones

Una sola entrega y ejecución continua, por instrucción del usuario. Rama dedicada en el checkout existente, preservando el caché de Graphify. No modificar los componentes globales para resolver un problema exclusivo de Prácticas.
