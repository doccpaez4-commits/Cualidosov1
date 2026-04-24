# Reporte de Ingeniería de Software: Cualidoso (Plataforma de Investigación Cualitativa)

## 1. Características Principales (Features)
- **Análisis Cualitativo Multimetodológico:** Soporte para múltiples "lentes" metodológicos: Teoría Fundamentada, Fenomenología, Etnografía, IAP (Investigación-Acción Participativa), Metacrítica (Breilh) y modo Libre.
- **Gestión Documental:** Importación, lectura y procesamiento de documentos en formatos TXT, PDF e Imágenes.
- **Sistema de Codificación y Categorización:** Creación de códigos y categorías jerárquicas con soporte para anotaciones sobre texto o polígonos en imágenes (con persistencia de coordenadas `x`, `y`).
- **Memos y Reflexividad:** Capacidad de adjuntar memos a anotaciones o a nivel general del proyecto.
- **Dashboard Analítico:** Visualizaciones avanzadas que incluyen mapas jerárquicos (Treemap), nubes de palabras (WordCloud), diagramas de flujo/metacrítica (Sankey) y matrices de concurrencia.
- **Herramientas Pedagógicas / Mentoría:** Integración de un panel de mentoría interactivo dependiente del lente metodológico seleccionado.
- **Exportación de Datos:** Capacidad de exportar todo el proyecto a un manifiesto serializable y generar reportes visuales en PDF (utilizando `jspdf` y `html2canvas`).

## 2. Principios de Diseño y Desarrollo
- **Local-First (Privacidad por Diseño):** Todos los datos de la investigación (documentos, códigos, anotaciones) residen exclusivamente en el navegador del usuario utilizando IndexedDB. No requiere servidor backend, lo que garantiza la confidencialidad absoluta de los datos sensibles.
- **Separación de Responsabilidades:** Clara división arquitectónica entre la Interfaz de Usuario (`components/ui`, `components/dashboard`), la lógica de negocio y estado global (`ProjectProvider.tsx`), y la capa de persistencia de datos (`lib/db.ts`).
- **Tipado Estricto (Type Safety):** Uso extensivo de TypeScript (`types/index.ts`) para modelar dominios complejos de investigación cualitativa (ej. `Annotation`, `Code`, `ActiveAnnotation`) reduciendo errores en tiempo de ejecución.

## 3. Patrones de Diseño Implementados
- **Singleton Pattern:** En `lib/db.ts` (`export const db = new CualidosoDB();`) para asegurar una única instancia de conexión y manipulación segura de la base de datos local en toda la aplicación.
- **Provider / Context Pattern:** `ProjectProvider.tsx` actúa como un estado global inyectado en el árbol de componentes de Next.js, proveyendo la información del proyecto activo (y funciones mutadoras) a cualquier componente hijo sin necesidad de *prop-drilling*.
- **Data Access Object (DAO) / Repository:** Implementación de abstracciones funcionales en `lib/db.ts` (e.g., `getProjectDocuments`, `getAllVerbatims`) para encapsular las consultas complejas a Dexie, aislando la lógica de la UI del ORM subyacente.
- **Component-Based UI:** Construcción atómica y modular usando React, encapsulando lógicas complejas como renderizados SVG con D3.js en componentes aislados (e.g., `SankeyBreilh.tsx`).

## 4. Stack Tecnológico
- **Core Frontend:** React 18, Next.js 14 (App Router)
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS 3.4
- **Persistencia de Datos:** Dexie.js (Wrapper ligero de IndexedDB) + dexie-react-hooks
- **Visualización de Datos:** D3.js (v7), Recharts, d3-cloud, d3-sankey
- **Procesamiento de Archivos:** PDF.js (Mozilla) para extraer texto de archivos PDF localmente.
- **Utilidades:** Lucide-react (iconografía), react-dropzone (Drag & Drop de archivos), html2canvas & jspdf (generación de PDFs).

## 5. Estado de Pruebas (Testing)
- **Estado Actual:** Tras la revisión del código fuente y dependencias (`package.json`), **no existen pruebas automatizadas**. No hay frameworks instalados (e.g., Jest, React Testing Library, Cypress o Playwright), lo que indica ausencia de Unit Tests, pruebas de integración y pruebas End-to-End (E2E).
- **Recomendación:** Implementar una suite de pruebas para la capa de persistencia (`lib/db.ts`), validación de esquemas de datos, y pruebas funcionales E2E para el ciclo crítico: "Crear proyecto -> Subir Documento -> Codificar Texto -> Ver Dashboard".

## 6. Tipo de Arquitectura
- **Client-Heavy "Local-First" Architecture:** La aplicación es una Single Page Application (SPA) construida sobre Next.js, pero que opera con un modelo arquitectónico donde **el cliente es el servidor de datos**.
- **Frontend Monolítico:** Toda la lógica de la aplicación, el procesamiento de texto, y la persistencia residen en el navegador. No existe una API REST o GraphQL. La comunicación ocurre directamente entre los componentes de React y la API asíncrona de IndexedDB a través de Dexie.

## 7. Posibles Errores y Soluciones

> [!WARNING]
> Riesgos inherentes de la arquitectura Local-First y de procesamiento intensivo de datos en el cliente.

| Riesgo / Posible Error | Descripción de la Causa | Solución Arquitectónica Recomendada |
| :--- | :--- | :--- |
| **Pérdida Total de Datos** | Al limpiar el caché del navegador, desinstalar el navegador, o usar modo incógnito estricto, IndexedDB se borra, perdiendo toda la investigación. | Implementar un sistema de sincronización opcional en la nube (e.g., CouchDB/PouchDB, Firebase), o forzar *prompts* automáticos para descargar copias de seguridad en `.json` periódicamente. |
| **Cuotas de Almacenamiento Excedidas** | IndexedDB tiene límites de cuota impuestos por el SO/Navegador. Si el usuario sube PDFs masivos o muchas imágenes en HD, la base de datos fallará silenciosamente. | Implementar monitoreo vía `navigator.storage.estimate()`. Comprimir las imágenes en un `<canvas>` antes de guardar los Blobs en base de datos. |
| **Bloqueo del Hilo Principal (UI Freeze)** | Operaciones como parsear grandes textos para el `WordCloud` o renderizar algoritmos complejos de D3 con miles de nodos (`Sankey` o `ConcurrenceMatrix`) bloquearán el navegador. | Desplazar el procesamiento pesado (agrupación de verbatims, conteo de frecuencias, algoritmos de D3) a **Web Workers** (`Worker API`). Implementar paginación o virtualización (`react-window`) en listas masivas. |
| **Re-renders Globales Ineficientes** | Usar Context API (`ProjectProvider`) para todo el estado provocará que cualquier nueva anotación re-renderice todo el árbol de componentes (Canvas, Sidebar). | Migrar el estado de alta frecuencia mutacional hacia gestores atómicos como **Zustand** o **Jotai**. Esto permite que, por ejemplo, el contador de un código se actualice sin re-renderizar el visor de PDF. |
| **Dependencia de la Estructura DOM en PDFs** | La capa de PDF.js actual extrae strings en un layout continuo, lo que puede romper los flujos de lectura en columnas complejas. | Mejorar el algoritmo de parseo de `fileProcessor.ts` para inferir mejor los saltos de línea y mantener índices absolutos más limpios. |
