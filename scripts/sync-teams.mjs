import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const flagsDir = path.join(rootDir, "public", "flags", "teams");
const outputFile = path.join(rootDir, "src", "data", "teams.json");

const SOURCE_URL =
  "https://timely-wisdom-d1544e8b4c.strapiapp.com/api/mundial-2026-diccs/?populate=bandera&pagination[pageSize]=100";

const normalizeFileName = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const downloadAsset = async (url, fileName) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(flagsDir, fileName);

  await writeFile(filePath, buffer);
};

const main = async () => {
  await mkdir(flagsDir, { recursive: true });
  await mkdir(path.dirname(outputFile), { recursive: true });

  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`No se pudo consultar el diccionario: ${response.status}`);
  }

  const payload = await response.json();
  const teams = [];
  const usedFileNames = new Set();

  for (const team of payload.data ?? []) {
    const badge = team.bandera;
    const extension = badge?.ext || path.extname(badge?.url || "") || ".svg";
    const baseName = normalizeFileName(team.nombre || team.nombre_corto || `equipo-${team.id}`);
    let fileName = `${baseName}${extension}`;

    if (usedFileNames.has(fileName)) {
      fileName = `${baseName}-${team.id}${extension}`;
    }

    usedFileNames.add(fileName);

    if (badge?.url) {
      await downloadAsset(badge.url, fileName);
    }

    teams.push({
      id: team.id,
      nombre: team.nombre,
      nombreCorto: team.nombre_corto,
      grupo: team.grupo,
      bandera: fileName,
    });
  }

  teams.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  await writeFile(outputFile, `${JSON.stringify(teams, null, 2)}\n`);

  console.log(`Equipos procesados: ${teams.length}`);
  console.log(`JSON generado en: ${path.relative(rootDir, outputFile)}`);
  console.log(`Banderas descargadas en: ${path.relative(rootDir, flagsDir)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
