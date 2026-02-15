import fs from "node:fs";
import path from "node:path";
import xlsx from "node-xlsx";

type Row = Record<string, any>;

const RAW_FILE = path.join(
  process.cwd(),
  "data",
  "raw",
  "plaguicidas",
  "2025-2026",
  "croplink_plaguicidas_limpios_2025-2026.xlsx"
);

const OUT_DIR = path.join(process.cwd(), "public", "data", "plaguicidas", "2025-2026");

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function normalizeText(v: any) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sheetToObjects(sheetData: any[][]): Row[] {
  const [headers, ...rows] = sheetData;
  if (!headers) return [];
  const keys = headers.map((h) => String(h ?? "").trim());
  return rows
    .filter((r) => r && r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""))
    .map((r) => {
      const obj: Row = {};
      keys.forEach((k, i) => (obj[k] = r[i]));
      return obj;
    });
}

function writeJson(name: string, data: any) {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2), "utf-8");
}

function main() {
  ensureDir(OUT_DIR);

  if (!fs.existsSync(RAW_FILE)) {
    console.error("❌ Excel not found:", RAW_FILE);
    process.exit(1);
  }

  const parsed = xlsx.parse(RAW_FILE);
  const byName = new Map(parsed.map((s) => [String(s.name).toLowerCase(), s]));

  // Intenta encontrar hojas por nombre común
  const useCasesSheet =
    byName.get("use_cases") || byName.get("usecases") || byName.get("use cases") || parsed[0];
  const productsSheet =
    byName.get("products") || byName.get("product") || parsed.find((s) => String(s.name).toLowerCase().includes("product"));
  const targetsSheet =
    byName.get("targets") || byName.get("target") || parsed.find((s) => String(s.name).toLowerCase().includes("target"));

  if (!useCasesSheet) {
    console.error("❌ No use_cases sheet found");
    process.exit(1);
  }

  const useCases = sheetToObjects(useCasesSheet.data as any[][]).map((r) => ({
    // exact columns you listed:
    crop: r.crop ?? "",
    market: r.market ?? "",
    category: r.category ?? "",
    product_id: r.product_id ?? "",
    commercial_name: r.commercial_name ?? "",
    active_ingredient: r.active_ingredient ?? "",
    concentration: r.concentration ?? "",
    company: r.company ?? "",
    target_type: r.target_type ?? "",
    target_common: r.target_common ?? "",
    target_common_norm: r.target_common_norm ?? normalizeText(r.target_common),
    target_scientific: r.target_scientific ?? "",
    dose: r.dose ?? "",
    safety_interval: r.safety_interval ?? "",
    reentry_period: r.reentry_period ?? "",
    phi_usa: r.phi_usa ?? "",
    phi_eu: r.phi_eu ?? "",
    mrl_ppm: r.mrl_ppm ?? "",
    resistance_class: r.resistance_class ?? "",
    chemical_group: r.chemical_group ?? "",
    interval_between_applications: r.interval_between_applications ?? "",
    max_applications: r.max_applications ?? "",
    registration: r.registration ?? "",
    observations: r.observations ?? "",
    sheet: r.sheet ?? String(useCasesSheet.name),
    // auditoría:
    _norm: {
      crop: normalizeText(r.crop),
      target_common: normalizeText(r.target_common),
      commercial_name: normalizeText(r.commercial_name),
    },
  }));

  let products: any[] = [];
  if (productsSheet) {
    products = sheetToObjects(productsSheet.data as any[][]).map((r) => ({
      product_id: r.product_id ?? "",
      commercial_name: r.commercial_name ?? "",
      active_ingredient: r.active_ingredient ?? "",
      concentration: r.concentration ?? "",
      company: r.company ?? "",
      resistance_class: r.resistance_class ?? "",
      chemical_group: r.chemical_group ?? "",
      _norm: {
        commercial_name: normalizeText(r.commercial_name),
        active_ingredient: normalizeText(r.active_ingredient),
      },
    }));
  } else {
    // fallback: deduce products from useCases
    const map = new Map<string, any>();
    for (const u of useCases) {
      const k = String(u.product_id || u.commercial_name || u.active_ingredient);
      if (!k) continue;
      if (!map.has(k)) {
        map.set(k, {
          product_id: u.product_id,
          commercial_name: u.commercial_name,
          active_ingredient: u.active_ingredient,
          concentration: u.concentration,
          company: u.company,
          resistance_class: u.resistance_class,
          chemical_group: u.chemical_group,
        });
      }
    }
    products = Array.from(map.values());
  }

  let targets: any[] = [];
  if (targetsSheet) {
    targets = sheetToObjects(targetsSheet.data as any[][]).map((r) => ({
      target_common_norm: r.target_common_norm ?? normalizeText(r.target_common),
      target_type: r.target_type ?? "",
      target_common: r.target_common ?? "",
      target_scientific: r.target_scientific ?? "",
      crop: r.crop ?? "",
      category: r.category ?? "",
      _norm: {
        crop: normalizeText(r.crop),
        target_common: normalizeText(r.target_common),
      },
    }));
  } else {
    // fallback: deduce targets from useCases
    const map = new Map<string, any>();
    for (const u of useCases) {
      const key = `${u.target_type}::${u.target_common_norm}::${u.crop}::${u.category}`;
      if (!map.has(key)) {
        map.set(key, {
          target_common_norm: u.target_common_norm,
          target_type: u.target_type,
          target_common: u.target_common,
          target_scientific: u.target_scientific,
          crop: u.crop,
          category: u.category,
        });
      }
    }
    targets = Array.from(map.values());
  }

  writeJson("use_cases.json", useCases);
  writeJson("products.json", products);
  writeJson("targets.json", targets);

  // QA report
  const missingRes = useCases.filter((u) => !String(u.resistance_class || "").trim()).length;
  const missingPHI = useCases.filter((u) => !String(u.safety_interval || "").trim()).length;

  console.log("✅ Dataset built:", OUT_DIR);
  console.log("use_cases:", useCases.length);
  console.log("products:", products.length);
  console.log("targets:", targets.length);
  console.log("missing resistance_class:", missingRes);
  console.log("missing safety_interval:", missingPHI);
}

main();
