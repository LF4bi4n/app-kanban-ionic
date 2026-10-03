# TaskStream - Tablero Kanban Móvil v1.0

Aplicación móvil desarrollada con Ionic y Angular para la gestión dinámica de tareas en un tablero Kanban, integrada a un backend en PHP y MySQL (XAMPP) con arquitectura de red configurable.

##  Características de la Versión 1.0

- **Navegación por Tabs:** Interfaz fluida con múltiples pestañas y pantalla de login.
- **Red Dinámica (ConfigService):** Configuración de IP, puerto Apache, puerto MySQL y protocolo desde la UI sin modificar código fuente.
- **Operación Offline Básica:** Cacheo local de datos en `localStorage` cuando no hay conexión con el backend.
- **Manejo de Errores e Inspección:** Interceptor global de peticiones HTTP (`HttpErrorInterceptor`) y consola de diagnósticos de red en vivo durante el login.
- **Sincronización Backend:** Consumo de APIs PHP con soporte para tráfico no cifrado (`Cleartext Traffic`) en Android.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** Ionic 7+, Angular 16+, TypeScript.
- **Híbrido/Nativo:** Capacitor 5+.
- **Backend:** PHP 8.x, Apache (XAMPP).
- **Base de Datos:** MySQL.

##  Instrucciones de Instalación y Ejecución

1. **Clonar el repositorio:**
   ```bash
   git clone 
   cd taskstream