import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// ============================================================
// TYPES
// ============================================================

type DistrictIds = Record<string, number>;

// ============================================================
// FIND MANDAL ID
// ============================================================

async function getMandalId(
  pool: pg.Pool,
  districtId: number,
  mandalName: string
): Promise<number> {
  const result = await pool.query(
    `
    SELECT id
    FROM mandals
    WHERE district_id = $1
      AND name = $2
    LIMIT 1;
    `,
    [districtId, mandalName]
  );

  if (result.rows.length === 0) {
    throw new Error(
      `❌ Mandal not found: ${mandalName}`
    );
  }

  return Number(result.rows[0].id);
}

// ============================================================
// INSERT VILLAGES
// ============================================================

async function insertVillages(
  pool: pg.Pool,
  mandalId: number,
  mandalName: string,
  villages: string[]
) {
  for (const village of villages) {
    await pool.query(
      `
      INSERT INTO villages (
        mandal_id,
        name
      )
      VALUES ($1, $2)
      ON CONFLICT (mandal_id, name)
      DO UPDATE
      SET name = EXCLUDED.name;
      `,
      [
        mandalId,
        village,
      ]
    );

    console.log(
      `      ✅ Village ready: ${village} → ${mandalName}`
    );
  }
}

// ============================================================
// DISPLAY VILLAGES
// ============================================================

async function displayVillages(
  pool: pg.Pool,
  mandalId: number,
  mandalName: string
): Promise<number> {
  const result = await pool.query(
    `
    SELECT
      id,
      name
    FROM villages
    WHERE mandal_id = $1
    ORDER BY name ASC;
    `,
    [mandalId]
  );

  console.log("");
  console.log(
    `📍 ${mandalName} Villages:`
  );

  for (const row of result.rows) {
    console.log(
      `   ${row.id} → ${row.name}`
    );
  }

  console.log(
    `✅ ${mandalName}: ${result.rows.length} villages`
  );

  return result.rows.length;
}

// ============================================================
// MAIN
// ============================================================

async function seedLocations() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "❌ DATABASE_URL is missing in .env"
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("");
    console.log(
      "=========================================================="
    );
    console.log(
      "🔄 CONNECTING TO NEON POSTGRESQL"
    );
    console.log(
      "=========================================================="
    );

    // ==========================================================
    // ANDHRA PRADESH
    // Internal database parent only.
    // Flutter lo State select cheyyalsina avasaram ledu.
    // ==========================================================

    const stateResult = await pool.query(
      `
      INSERT INTO states (
        name
      )
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE
      SET name = EXCLUDED.name
      RETURNING id, name;
      `,
      ["Andhra Pradesh"]
    );

    const stateId = Number(
      stateResult.rows[0].id
    );

    console.log(
      `✅ State ready: Andhra Pradesh (${stateId})`
    );

    // ==========================================================
    // DISTRICTS
    // ==========================================================

    const districts = [
      "Alluri Sitharama Raju",
      "East Godavari",
      "Kakinada",
    ];

    const districtIds: DistrictIds = {};

    for (const district of districts) {
      const result = await pool.query(
        `
        INSERT INTO districts (
          state_id,
          name
        )
        VALUES ($1, $2)
        ON CONFLICT (state_id, name)
        DO UPDATE
        SET name = EXCLUDED.name
        RETURNING id, name;
        `,
        [
          stateId,
          district,
        ]
      );

      const districtId = Number(
        result.rows[0].id
      );

      districtIds[district] =
        districtId;

      console.log(
        `✅ District ready: ${district} (${districtId})`
      );
    }

    // ==========================================================
    // DISTRICT IDS
    // ==========================================================

    const alluriDistrictId =
      districtIds[
        "Alluri Sitharama Raju"
      ];

    const eastGodavariDistrictId =
      districtIds[
        "East Godavari"
      ];

    const kakinadaDistrictId =
      districtIds[
        "Kakinada"
      ];

    if (!alluriDistrictId) {
      throw new Error(
        "❌ Alluri Sitharama Raju district ID not found."
      );
    }

    if (!eastGodavariDistrictId) {
      throw new Error(
        "❌ East Godavari district ID not found."
      );
    }

    if (!kakinadaDistrictId) {
      throw new Error(
        "❌ Kakinada district ID not found."
      );
    }

    // ==========================================================
    // ALLURI SITHARAMA RAJU MANDALS
    // ==========================================================

    const alluriMandals = [
      "Ananthagiri",
      "Araku Valley",
      "Chinthapalli",
      "Dumbriguda",
      "G. Madugula",
      "Gudem Kotha Veedhi",
      "Hukumpeta",
      "Koyyuru",
      "Munchingiputtu",
      "Paderu",
      "Pedabayalu",
    ];

    console.log("");
    console.log(
      "📍 ALLURI SITHARAMA RAJU MANDALS"
    );

    for (
      const mandal of alluriMandals
    ) {
      await pool.query(
        `
        INSERT INTO mandals (
          district_id,
          name
        )
        VALUES ($1, $2)
        ON CONFLICT (district_id, name)
        DO UPDATE
        SET name = EXCLUDED.name;
        `,
        [
          alluriDistrictId,
          mandal,
        ]
      );

      console.log(
        `   ✅ Mandal ready: ${mandal} → Alluri Sitharama Raju`
      );
    }

    // ==========================================================
    // EAST GODAVARI MANDALS
    // ==========================================================

    const eastGodavariMandals = [
      "Seethanagaram",
      "Korukonda",
      "Gokavaram",
      "Rajanagaram",
      "Rajahmundry Rural",
      "Rajahmundry Urban",
      "Kadiam",
      "Rangampeta",
      "Anaparthi",
      "Biccavole",
      "Mandapeta",
      "Rayavaram",
      "Kapileswarapuram",
      "Kovvur",
      "Chagallu",
      "Tallapudi",
      "Nidadavole",
      "Undrajavaram",
      "Peravali",
      "Devarapalle",
      "Gopalapuram",
      "Nallajerla",
    ];

    console.log("");
    console.log(
      "📍 EAST GODAVARI MANDALS"
    );

    for (
      const mandal of
        eastGodavariMandals
    ) {
      await pool.query(
        `
        INSERT INTO mandals (
          district_id,
          name
        )
        VALUES ($1, $2)
        ON CONFLICT (district_id, name)
        DO UPDATE
        SET name = EXCLUDED.name;
        `,
        [
          eastGodavariDistrictId,
          mandal,
        ]
      );

      console.log(
        `   ✅ Mandal ready: ${mandal} → East Godavari`
      );
    }

    // ==========================================================
    // KAKINADA MANDALS
    // ==========================================================

    const kakinadaMandals = [
      // Kakinada Revenue Division
      "Gollaprolu",
      "Pithapuram",
      "U.Kotapalli",
      "Kakinada Rural",
      "Kakinada Urban",
      "Karapa",
      "Pedapudi",
      "Kajuluru",
      "Thallarevu",

      // Peddapuram Revenue Division
      "Kotananduru",
      "Tuni",
      "Thondangi",
      "Shankhavaram",
      "Prathipadu",
      "Yeleswaram",
      "Jaggampeta",
      "Kirlampudi",
      "Peddapuram",
      "Gandepalle",
      "Rowtulapudi",
      "Samalkota",
    ];

    console.log("");
    console.log(
      "📍 KAKINADA MANDALS"
    );

    for (
      const mandal of kakinadaMandals
    ) {
      await pool.query(
        `
        INSERT INTO mandals (
          district_id,
          name
        )
        VALUES ($1, $2)
        ON CONFLICT (district_id, name)
        DO UPDATE
        SET name = EXCLUDED.name;
        `,
        [
          kakinadaDistrictId,
          mandal,
        ]
      );

      console.log(
        `   ✅ Mandal ready: ${mandal} → Kakinada`
      );
    }

    // ==========================================================
    // ANANTHAGIRI VILLAGES
    // ==========================================================

    const ananthagiriVillages = [
      "Nandikota",
      "Bheemavaram",
      "Addategela",
      "Baliaguda @ Cheedivalasa",
      "Baliyaguda",
      "Ballagaruvu",
      "Ballamamidi",
      "Bandakonda",
      "Bandavalasa",
      "Bangarampeta",
      "Burugulapadu",
      "Dabbalapadu",
      "Porlubanda",
    ];

    const ananthagiriMandalId =
      await getMandalId(
        pool,
        alluriDistrictId,
        "Ananthagiri"
      );

    console.log("");
    console.log(
      "📍 INSERTING ANANTHAGIRI VILLAGES"
    );

    await insertVillages(
      pool,
      ananthagiriMandalId,
      "Ananthagiri",
      ananthagiriVillages
    );

    // ==========================================================
    // ARAKU VALLEY VILLAGES
    // ==========================================================

    const arakuValleyVillages = [
      "Padmapuram",
      "Sunkarametta",
      "Yandapallivalasa",
      "Madaguda",
      "Chompi",
      "Gannela",
      "Mala Singaram",
      "Adaru",
      "Kantabamsuguda",
    ];

    const arakuValleyMandalId =
      await getMandalId(
        pool,
        alluriDistrictId,
        "Araku Valley"
      );

    console.log("");
    console.log(
      "📍 INSERTING ARAKU VALLEY VILLAGES"
    );

    await insertVillages(
      pool,
      arakuValleyMandalId,
      "Araku Valley",
      arakuValleyVillages
    );

    // ==========================================================
    // CHINTHAPALLI VILLAGES
    // ==========================================================

    const chinthapalliVillages = [
      "Anjalam",
      "Annavaram",
      "Antharla",
      "Asirada",
      "Baddimetta",
      "Bayalukinchangi",
      "Bennavaram",
      "Chintapalle",
      "Kandulagodi",
      "Kommangi",
      "Lammasingi",
      "Lakkavaram",
      "Krishnapuram",
      "Nimmalapadu",
    ];

    const chinthapalliMandalId =
      await getMandalId(
        pool,
        alluriDistrictId,
        "Chinthapalli"
      );

    console.log("");
    console.log(
      "📍 INSERTING CHINTHAPALLI VILLAGES"
    );

    await insertVillages(
      pool,
      chinthapalliMandalId,
      "Chinthapalli",
      chinthapalliVillages
    );

    // ==========================================================
    // GOKAVARAM VILLAGES
    // District: East Godavari
    // Mandal: Gokavaram
    // ==========================================================

    const gokavaramVillages = [
      "Atchutapuram",
      "Bhupatipalem",
      "Gadelapalem",
      "Gokavaram",
      "Gummalladuddi",
      "Kalijolla",
      "Kothapalle",
      "Krishnunipalem",
      "Mallavaram",
      "Rampa Yerrampalem",
      "Sivaramapatnam",
      "Sudikonda",
      "Takurupalem",
      "Thantikonda",
      "Tirumalayapalem",
    ];

    const gokavaramMandalId =
      await getMandalId(
        pool,
        eastGodavariDistrictId,
        "Gokavaram"
      );

    console.log("");
    console.log(
      "📍 INSERTING GOKAVARAM VILLAGES"
    );

    await insertVillages(
      pool,
      gokavaramMandalId,
      "Gokavaram",
      gokavaramVillages
    );
      

// ==========================================================
// KORUKONDA VILLAGES
// District: East Godavari
// Mandal: Korukonda
// ==========================================================

const korukondaVillages = [
  "Bodleddupalem",
  "Burugupudi",
  "Butchempeta",
  "Dosakayalapalle",
  "Gadala",
  "Gadarada",
  "Jambupatnam",
  "Kanupuru",
  "Kapavaram",
  "Korukonda",
  "Koti",
  "Kotikesavaram",
  "Madhurapudi",
  "Munagala",
  "Narasapuram",
  "Narasimhapura Agraharam",
  "Nidigatla",
  "Raghavapuram",
  "Srirangapatnam",
];

// ==========================================================
// FIND KORUKONDA MANDAL
// ==========================================================

const korukondaMandalId =
  await getMandalId(
    pool,
    eastGodavariDistrictId,
    "Korukonda"
  );

// ==========================================================
// INSERT KORUKONDA VILLAGES
// ==========================================================

await insertVillages(
  pool,
  korukondaMandalId,
  "Korukonda",
  korukondaVillages
);

// ==========================================================
// DISPLAY KORUKONDA VILLAGES
// ==========================================================

const korukondaVillageCount =
  await displayVillages(
    pool,
    korukondaMandalId,
    "Korukonda"
  );





console.log(
  `✅ Korukonda Villages: ${korukondaVillageCount}`
);

// ==========================================================
// RAJANAGARAM VILLAGES
// District: East Godavari
// Mandal: Rajanagaram
// ==========================================================

const rajanagaramVillages = [
  "Bhupalapatnam",
  "G. Yerrampalem",
  "Jagannadhapuram Agraharam",
  "Kalavacherla",
  "Kanavaram",
  "Konda Gunturu",
  "Mukkinada",
  "Namavaram",
  "Nandarada",
  "Narendrapuram",
  "Palacharla",
  "Patha Thungapadu",
  "Rajanagaram",
  "Srikrishnapatnam",
  "Thokada",
  "Velugubanda",
  "Venkatapuram",
];

// ==========================================================
// FIND RAJANAGARAM MANDAL
// ==========================================================

const rajanagaramMandalId =
  await getMandalId(
    pool,
    eastGodavariDistrictId,
    "Rajanagaram"
  );

// ==========================================================
// INSERT RAJANAGARAM VILLAGES
// ==========================================================

await insertVillages(
  pool,
  rajanagaramMandalId,
  "Rajanagaram",
  rajanagaramVillages
);

// ==========================================================
// DISPLAY RAJANAGARAM VILLAGES
// ==========================================================

const rajanagaramVillageCount =
  await displayVillages(
    pool,
    rajanagaramMandalId,
    "Rajanagaram"
  );

console.log(
  `✅ Rajanagaram Villages: ${rajanagaramVillageCount}`
);

// ==========================================================
// ANAPARTHI VILLAGES
// District: East Godavari
// Mandal: Anaparthi
// ==========================================================

const anaparthiVillages = [
  "Anaparthy",
  "Duppalapudi",
  "Koppavaram",
  "Kutukuluru",
  "Mahendrawada",
  "Pedaparthi",
  "Polamuru",
  "Pulagurtha",
  "Ramavaram",
];

// ==========================================================
// FIND ANAPARTHI MANDAL
// ==========================================================

const anaparthiMandalId =
  await getMandalId(
    pool,
    eastGodavariDistrictId,
    "Anaparthi"
  );

// ==========================================================
// INSERT ANAPARTHI VILLAGES
// ==========================================================

await insertVillages(
  pool,
  anaparthiMandalId,
  "Anaparthi",
  anaparthiVillages
);

// ==========================================================
// DISPLAY ANAPARTHI VILLAGES
// ==========================================================

const anaparthiVillageCount =
  await displayVillages(
    pool,
    anaparthiMandalId,
    "Anaparthi"
  );

console.log(
  `✅ Anaparthi Villages: ${anaparthiVillageCount}`
);

// ==========================================================
// MANDAPETA VILLAGES
// District: East Godavari
// Mandal: Mandapeta
// ==========================================================

const mandapetaVillages = [
  "Arthamuru",
  "Chinadevarapudi",
  "Dwarapudi",
  "Ippanapadu",
  "Kesavaram",
  "Maredubaka",
  "Mernipadu",
  "Palathodu",
  "Tapeswaram",
  "Velagathodu",
  "Vemulapalle",
  "Yeditha",
  "Z.Medapadu",
];

// ==========================================================
// FIND MANDAPETA MANDAL
// ==========================================================

const mandapetaMandalId =
  await getMandalId(
    pool,
    eastGodavariDistrictId,
    "Mandapeta"
  );

// ==========================================================
// INSERT MANDAPETA VILLAGES
// ==========================================================

await insertVillages(
  pool,
  mandapetaMandalId,
  "Mandapeta",
  mandapetaVillages
);

// ==========================================================
// DISPLAY MANDAPETA VILLAGES
// ==========================================================

const mandapetaVillageCount =
  await displayVillages(
    pool,
    mandapetaMandalId,
    "Mandapeta"
  );

console.log(
  `✅ Mandapeta Villages: ${mandapetaVillageCount}`
);

// ==========================================================
// SEETHANAGARAM VILLAGES
// District: East Godavari
// Mandal: Seethanagaram
// ==========================================================

const seethanagaramVillages = [
  "Bobbillanka",
  "Chinakondepudi",
  "Hundeswarapuram",
  "Jalimudi",
  "Katavaram",
  "Kunavaram",
  "Mirthipadu",
  "Muggaulla",
  "Mulakallanka",
  "Munikudali",
  "Nagampalle",
  "Nallagonda",
  "Purushothapatnam",
  "Raghudevapuram",
  "Seethanagaram",
  "Singavaram",
  "Vangalapudi",
];

// ==========================================================
// FIND SEETHANAGARAM MANDAL
// ==========================================================

const seethanagaramMandalId =
  await getMandalId(
    pool,
    eastGodavariDistrictId,
    "Seethanagaram"
  );

// ==========================================================
// INSERT SEETHANAGARAM VILLAGES
// ==========================================================

await insertVillages(
  pool,
  seethanagaramMandalId,
  "Seethanagaram",
  seethanagaramVillages
);

// ==========================================================
// DISPLAY SEETHANAGARAM VILLAGES
// ==========================================================

const seethanagaramVillageCount =
  await displayVillages(
    pool,
    seethanagaramMandalId,
    "Seethanagaram"
  );

console.log(
  `✅ Seethanagaram Villages: ${seethanagaramVillageCount}`
);
// ==========================================================
// RAJAHMUNDRY RURAL VILLAGES
// District: East Godavari
// Mandal: Rajahmundry Rural
// ==========================================================

const rajahmundryRuralVillages = [
  "Bommuru",
  "Dowleswaram",
  "Hukumpeta",
  "Katheru",
  "Kolamuru",
  "Morampudi",
  "Rajavolu",
  "Torredu",
  "Pidimgoyyi",
  "Rajamahendravaram",
];

// ==========================================================
// FIND RAJAHMUNDRY RURAL MANDAL
// ==========================================================

const rajahmundryRuralMandalId =
  await getMandalId(
    pool,
    eastGodavariDistrictId,
    "Rajahmundry Rural"
  );

// ==========================================================
// INSERT RAJAHMUNDRY RURAL VILLAGES
// ==========================================================

await insertVillages(
  pool,
  rajahmundryRuralMandalId,
  "Rajahmundry Rural",
  rajahmundryRuralVillages
);

// ==========================================================
// DISPLAY RAJAHMUNDRY RURAL VILLAGES
// ==========================================================

const rajahmundryRuralVillageCount =
  await displayVillages(
    pool,
    rajahmundryRuralMandalId,
    "Rajahmundry Rural"
  );

console.log(
  `✅ Rajahmundry Rural Villages: ${rajahmundryRuralVillageCount}`
);

// ==========================================================
// RAJAHMUNDRY URBAN AREAS
// District: East Godavari
// Mandal: Rajahmundry Urban
// ==========================================================

const rajahmundryUrbanAreas = [
  "Konthamuru",
  "Kolamuru",
  "Gadala",
  "Palacherla",
  "Lalacheruvu",
  "Diwancheruvu",
  "Pidimgoyyi",
  "Hukumpeta",
  "Bommuru",
  "Katheru",
  "Dowleswaram",
  "Satellite City",
];

// ==========================================================
// FIND RAJAHMUNDRY URBAN MANDAL
// ==========================================================

const rajahmundryUrbanMandalId =
  await getMandalId(
    pool,
    eastGodavariDistrictId,
    "Rajahmundry Urban"
  );

// ==========================================================
// INSERT RAJAHMUNDRY URBAN AREAS
// ==========================================================

for (const area of rajahmundryUrbanAreas) {
  await pool.query(
    `
    INSERT INTO urban_areas (
      district_id,
      mandal_id,
      name
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (mandal_id, name)
    DO UPDATE
    SET name = EXCLUDED.name;
    `,
    [
      eastGodavariDistrictId,
      rajahmundryUrbanMandalId,
      area,
    ]
  );

  console.log(
    `   ✅ Urban area ready: ${area} → Rajahmundry Urban`
  );
}

// ==========================================================
// DISPLAY RAJAHMUNDRY URBAN AREAS
// ==========================================================

const rajahmundryUrbanAreaResult =
  await pool.query(
    `
    SELECT
      id,
      name
    FROM urban_areas
    WHERE mandal_id = $1
    ORDER BY name ASC;
    `,
    [rajahmundryUrbanMandalId]
  );

console.log("");
console.log(
  "📍 RAJAHMUNDRY URBAN AREAS"
);

for (
  const row of rajahmundryUrbanAreaResult.rows
) {
  console.log(
    `   ${row.id} → ${row.name}`
  );
}

const rajahmundryUrbanAreaCount =
  rajahmundryUrbanAreaResult.rows.length;

console.log(
  `✅ Rajahmundry Urban Areas: ${rajahmundryUrbanAreaCount}`
);
    // ==========================================================
    // DISPLAY ALL DISTRICTS
    // ==========================================================

    const districtResult =
      await pool.query(
        `
        SELECT
          d.id,
          d.name
        FROM districts d
        INNER JOIN states s
          ON s.id = d.state_id
        WHERE s.name = $1
        ORDER BY d.name ASC;
        `,
        ["Andhra Pradesh"]
      );

    console.log("");
    console.log(
      "=========================================================="
    );
    console.log(
      "📍 CURRENT DISTRICTS"
    );
    console.log(
      "=========================================================="
    );

    for (
      const row of districtResult.rows
    ) {
      console.log(
        `   ${row.id} → ${row.name}`
      );
    }

    // ==========================================================
    // DISPLAY ALLURI MANDALS
    // ==========================================================

    const alluriMandalResult =
      await pool.query(
        `
        SELECT
          id,
          name
        FROM mandals
        WHERE district_id = $1
        ORDER BY name ASC;
        `,
        [alluriDistrictId]
      );

    console.log("");
    console.log(
      "📍 ALLURI SITHARAMA RAJU MANDALS"
    );

    for (
      const row of alluriMandalResult.rows
    ) {
      console.log(
        `   ${row.id} → ${row.name}`
      );
    }

    // ==========================================================
    // DISPLAY EAST GODAVARI MANDALS
    // ==========================================================

    const eastGodavariMandalResult =
      await pool.query(
        `
        SELECT
          id,
          name
        FROM mandals
        WHERE district_id = $1
        ORDER BY name ASC;
        `,
        [eastGodavariDistrictId]
      );

    console.log("");
    console.log(
      "📍 EAST GODAVARI MANDALS"
    );

    for (
      const row of
        eastGodavariMandalResult.rows
    ) {
      console.log(
        `   ${row.id} → ${row.name}`
      );
    }

    // ==========================================================
    // DISPLAY KAKINADA MANDALS
    // ==========================================================

    const kakinadaMandalResult =
      await pool.query(
        `
        SELECT
          id,
          name
        FROM mandals
        WHERE district_id = $1
        ORDER BY name ASC;
        `,
        [kakinadaDistrictId]
      );

    console.log("");
    console.log(
      "📍 KAKINADA MANDALS"
    );

    for (
      const row of
        kakinadaMandalResult.rows
    ) {
      console.log(
        `   ${row.id} → ${row.name}`
      );
    }

    // ==========================================================
    // DISPLAY VILLAGES
    // ==========================================================

    const ananthagiriVillageCount =
      await displayVillages(
        pool,
        ananthagiriMandalId,
        "Ananthagiri"
      );

    const arakuValleyVillageCount =
      await displayVillages(
        pool,
        arakuValleyMandalId,
        "Araku Valley"
      );

    const chinthapalliVillageCount =
      await displayVillages(
        pool,
        chinthapalliMandalId,
        "Chinthapalli"
      );

    const gokavaramVillageCount =
      await displayVillages(
        pool,
        gokavaramMandalId,
        "Gokavaram"
      );

    // ==========================================================
    // FINAL SUMMARY
    // ==========================================================

    console.log("");
    console.log(
      "=========================================================="
    );
    console.log(
      "🎉 LOCATION SEED COMPLETED SUCCESSFULLY"
    );
    console.log(
      "=========================================================="
    );

    console.log(
      `✅ Districts: ${districtResult.rows.length}`
    );

    console.log(
      `✅ Alluri Sitharama Raju Mandals: ${alluriMandalResult.rows.length}`
    );

    console.log(
      `✅ East Godavari Mandals: ${eastGodavariMandalResult.rows.length}`
    );

    console.log(
      `✅ Kakinada Mandals: ${kakinadaMandalResult.rows.length}`
    );

    console.log(
      `✅ Ananthagiri Villages: ${ananthagiriVillageCount}`
    );

    console.log(
      `✅ Araku Valley Villages: ${arakuValleyVillageCount}`
    );

    console.log(
      `✅ Chinthapalli Villages: ${chinthapalliVillageCount}`
    );

    console.log(
      `✅ Gokavaram Villages: ${gokavaramVillageCount}`
    );

    console.log("");
    console.log(
      "✅ Existing records are preserved."
    );

    console.log(
      "✅ Duplicate records are not created."
    );

    console.log(
      "✅ Same script can be safely run again."
    );

    console.log(
      "=========================================================="
    );
  } catch (error) {
    console.error("");
    console.error(
      "❌ LOCATION SEED FAILED:"
    );
    console.error(error);

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// ============================================================
// RUN
// ============================================================

seedLocations();