# Procedimiento de entrega y pruebas

Procedimiento autorizado por el propietario del proyecto:

1. Trabajar en una rama de GitHub y hacer push para generar el preview de Vercel.
2. Esperar el despliegue y comprobar que corresponde al SHA de la rama.
3. Probar en un navegador contra ese preview con una cuenta exclusiva de QA: login, navegación y acciones reales. Contrastar los resultados visibles con los registros persistidos.
4. Preparar o modificar directamente en Supabase los datos de esa cuenta cuando sea necesario para reproducir límites de calendario, historiales largos u otros escenarios. Acotar todas las escrituras al ID de QA y desactivar sus notificaciones.
5. Guardar capturas de los estados relevantes. Mantener contraseñas, cookies, enlaces de acceso temporales y trazas con credenciales fuera del repositorio.
6. Si un caso falla, corregirlo en la misma rama y volver a validar los flujos afectados en el nuevo preview. No hacer merge mientras falle la aceptación o los checks requeridos.
7. Cuando la aceptación y CI pasen, hacer merge en `main` y eliminar la rama; esta secuencia ya está autorizada y no requiere otra confirmación del propietario.
8. Comprobar el despliegue de producción del commit integrado y repetir una prueba breve del flujo principal. Revocar los accesos temporales usados durante QA.

Las autorizaciones técnicas que Vercel u otro proveedor exijan dentro de su propia interfaz siguen siendo necesarias. La autorización de este procedimiento no cambia los permisos de las conexiones ni autoriza modificaciones de datos de otros usuarios.
