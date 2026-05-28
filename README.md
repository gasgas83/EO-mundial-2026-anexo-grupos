# EO Mundial 2026 - Anexo Grupos

Web component en Svelte + Vite para mostrar la tabla de grupos del Mundial 2026 en formato carrusel.

Tag del componente:

```html
<eo-grupos-mundial></eo-grupos-mundial>
```

## Props del web component

- `isDev` (`"true" | "false"`): usa `EO-df-grupos-dev.json` cuando está en `true`.
- `showGroup` (`"A" ... "L"`): si viene con valor, renderiza solo ese grupo.

Ejemplo:

```html
<eo-grupos-mundial showGroup="A"></eo-grupos-mundial>
```

## Highlight automático por URL

El componente aplica highlight automáticamente cuando la URL de la página donde está embebido contiene alguno de estos slugs:

| Slug en URL | ID feed | País |
| --- | --- | --- |
| `argentina` | 21 | Argentina |
| `espana` | 280 | España |
| `estados-unidos` | 281 | Estados Unidos |
| `uruguay` | 172 | Uruguay |

## Fuente de datos

Endpoint principal:

- `https://n8n.elobservador.com.uy/jsons/mundial2026/EO-df-grupos.json`

Nota: el endpoint devuelve un JSON con un campo `data` que contiene XML. El componente parsea ese XML para armar grupos y estadísticas.

## IDs de equipos presentes en `EO-df-grupos`

IDs únicos detectados hoy (48):

`21, 167, 168, 169, 170, 172, 209, 274, 276, 277, 279, 280, 281, 282, 283, 284, 285, 286, 288, 289, 291, 292, 293, 295, 296, 299, 446, 449, 451, 455, 456, 457, 466, 470, 473, 475, 476, 483, 487, 621, 627, 1338, 3731, 3748, 3752, 3753, 4439, 5605`

### Mapa de IDs (ID → país)

| ID | País | Sigla feed | Grupo |
| --- | --- | --- | --- |
| 21 | Argentina | ARG | Grupo J |
| 167 | Brasil | BRA | Grupo C |
| 168 | Colombia | COL | Grupo K |
| 169 | Ecuador | ECU | Grupo E |
| 170 | Paraguay | PAR | Grupo D |
| 172 | Uruguay | URU | Grupo H |
| 209 | Australia | AUS | Grupo D |
| 274 | Alemania | GER | Grupo E |
| 276 | Arabia Saudita | SAU | Grupo H |
| 277 | Costa de Marfil | CIV | Grupo E |
| 279 | Croacia | CRO | Grupo L |
| 280 | España | ESP | Grupo H |
| 281 | Estados Unidos | USA | Grupo D |
| 282 | Francia | FRA | Grupo I |
| 283 | Ghana | GHA | Grupo L |
| 284 | Países Bajos | NED | Grupo F |
| 285 | Inglaterra | ENG | Grupo L |
| 286 | Irán | IRN | Grupo G |
| 288 | Japón | JPN | Grupo F |
| 289 | México | MEX | Grupo A |
| 291 | Portugal | POR | Grupo K |
| 292 | República Checa | RCH | Grupo A |
| 293 | Rep. de Corea | KOR | Grupo A |
| 295 | Suecia | SUE | Grupo F |
| 296 | Suiza | SUI | Grupo B |
| 299 | Túnez | TUN | Grupo F |
| 446 | Bélgica | BEL | Grupo G |
| 449 | Austria | AUT | Grupo J |
| 451 | Egipto | EGY | Grupo G |
| 455 | Noruega | NOR | Grupo I |
| 456 | Escocia | SCO | Grupo C |
| 457 | Turquía | TUR | Grupo D |
| 466 | Marruecos | MAR | Grupo C |
| 470 | Argelia | ALG | Grupo J |
| 473 | Nueva Zelanda | NZL | Grupo G |
| 475 | Canadá | CAN | Grupo B |
| 476 | Irak | IRQ | Grupo I |
| 483 | Sudáfrica | RSA | Grupo A |
| 487 | Senegal | SEN | Grupo I |
| 621 | Jordania | JOR | Grupo J |
| 627 | Panamá | PAN | Grupo L |
| 1338 | Bosnia-Herz. | BIH | Grupo B |
| 3731 | Cabo Verde | CPV | Grupo H |
| 3748 | RD Congo | RDC | Grupo K |
| 3752 | Catar | QAT | Grupo B |
| 3753 | Uzbekistán | UZB | Grupo K |
| 4439 | Haití | HAI | Grupo C |
| 5605 | Curazao | CUW | Grupo E |

## Scripts

- `npm run dev`: entorno local con Vite.
- `npm run build`: genera producción en `dist/`.
- `npm run preview`: sirve el build localmente.
- `npm run deploy`: sube `dist/` por SFTP y genera `snippet.txt`.
- `npm run build:deploy`: build + deploy.

## Deploy

El deploy usa `ssh2-sftp-client` y estas variables opcionales:

- `DEPLOY_HOST` (default `34.207.144.34`)
- `DEPLOY_USER` (default `ubuntu`)
- `DEPLOY_KEY_PATH` (default `./strapi.pem`)
- `DEPLOY_REMOTE_DIR` (default `/home/ubuntu/strapi-EO-aws/public/eo-widgets/eo-mundial/eo-anexo-resultados/`)

Ejemplo:

```bash
DEPLOY_KEY_PATH=./strapi.pem npm run build:deploy
```
