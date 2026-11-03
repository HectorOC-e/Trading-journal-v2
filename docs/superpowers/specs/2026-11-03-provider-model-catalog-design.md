# Catálogo de modelos por proveedor

El usuario solicita seleccionar modelos con un desplegable en lugar de escribir IDs y autoriza copiar temporalmente su configuración de IA a QA para comprobarlo y eliminar la copia al terminar.

## Diseño
Un selector reutilizable con búsqueda para modelo global, fallback y cada funcionalidad. Reutiliza Button/Input y Radix Popover ya instalado; lista accesible con foco por teclado y confirmación explícita al elegir, sin dependencias nuevas. Conserva Automático, heredar/sin fallback, ID manual explícito y cualquier modelo guardado que no aparezca en catálogo. Cambiar proveedor elimina la elección del proveedor anterior del borrador (auto para el global, vacío para fallback/funcionalidad), sin guardar automáticamente. Conserva overrides de funciones inactivas.

Endpoint tRPC autenticado, proveedor enum y propósito chat/embeddings. Clave resuelta exclusivamente en servidor y para el usuario actual. OpenRouter usa /models/user con clave (preferencias y restricciones de cuenta) y /models público sin clave, con output_modalities según propósito. OpenAI y Anthropic usan /models con su clave; OpenRouter por offsets y Anthropic por cursor, ambos paginados. Embeddings no se mezclan con chat. Metadatos mínimos: ID, nombre, contexto, herramientas/visión cuando están declarados, gratuito cuando la tarifa lo indica. No inferir incompatibilidad por sufijo :free.

Consultas solo al abrir, caché del cliente por proveedor/propósito durante cinco minutos y botón actualizar. No cachear catálogos privados globalmente en servidor. Tiempos de espera y límites de paginación; errores genéricos seguros con reintento y modo manual. Una caída del catálogo no borra modelos existentes. Un modelo listado no certifica saldo ni acceso de inferencia.

Alternativas descartadas: listas fijas siguen envejeciendo; texto libre solo no resuelve lo pedido. Catálogo dinámico con vía manual conserva compatibilidad y facilita elección. Se implementan los tres proveedores que ya ofrece la aplicación.

## Validación y entrega
Servicio: parseo, cabeceras/URL fijas, cuenta actual, embeddings, metadatos, paginación, fallos seguros y ninguna respuesta con claves. UI: búsqueda, elección, teclado/Escape, auto/herencia, manual y valores guardados, cambio de proveedor y guardado. Suite, revisión, preview y producción reales en escritorio/móvil con capturas. Copia cifrada de configuración dentro de DB solo si QA empieza vacío; comprobar origen intacto y eliminar únicamente la copia al terminar. Solo consultar catálogos, sin inferencias pagadas ni cambiar la cuenta origen.
