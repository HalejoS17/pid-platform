# PID — Plataforma de Inteligencia de Datos

Plataforma web para procesamiento y análisis gerencial de información de restaurantes.

## Fase 1

- Carga de ventas.
- Carga de Kardex.
- Carga de recetas.
- Carga de ventas por mesero.
- Validación y procesamiento de información.
- Análisis de inventario y rotación.
- Rentabilidad de platos.
- Consumo teórico y consumo real.
- Dashboards gerenciales.
- Alertas de capital inmovilizado y posibles pérdidas.

## Estructura

- `frontend`: aplicación web responsive y PWA.
- `backend`: API principal modular.
- `data-worker`: procesamiento de archivos y cálculos.
- `database`: scripts, migraciones, vistas e índices.
- `docs`: arquitectura, reglas y documentación funcional.

## Seguridad

- Los archivos reales de clientes no se guardan en Git.
- Las credenciales se administran mediante variables de entorno.
- La autorización se valida en el backend.
- PostgreSQL utilizará Row-Level Security.
- Los archivos se entregarán mediante URLs firmadas y temporales.
