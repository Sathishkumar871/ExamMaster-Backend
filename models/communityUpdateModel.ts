import pool from "../config/postgres";

// ============================================================
// COMMUNITY UPDATE TYPES
// ============================================================

export type CommunityUpdateCategory =
  | "medical"
  | "education"
  | "government_scheme"
  | "jobs"
  | "youth_meeting";

export type CommunityUpdateVisibility =
  | "village"
  | "mandal"
  | "district"
  | "all";

export type CommunityUpdateStatus =
  | "draft"
  | "published";

// ============================================================
// MAIN TYPE
// ============================================================

export interface ICommunityUpdate {
  id: number;

  category: CommunityUpdateCategory;

  title: string;

  summary: string;

  description: string;

  state: string;

  district: string;

  mandal: string;

  village: string;

  visibility: CommunityUpdateVisibility;

  eventDate: string | null;

  startTime: string;

  endTime: string;

  venue: string;

  contactNumber: string;

  externalLink: string;

  imageUrl: string;

  postedBy: string;

  postedByName: string;

  status: CommunityUpdateStatus;

  isActive: boolean;

  expiresAt: string | null;

  createdAt: string;

  updatedAt: string;
}

// ============================================================
// CREATE INPUT
// ============================================================

export interface CreateCommunityUpdateInput {
  category: CommunityUpdateCategory;

  title: string;

  summary: string;

  description: string;

  state: string;

  district: string;

  mandal: string;

  village: string;

  visibility: CommunityUpdateVisibility;

  eventDate?: string | null;

  startTime?: string;

  endTime?: string;

  venue?: string;

  contactNumber?: string;

  externalLink?: string;

  imageUrl?: string;

  postedBy: string;

  postedByName: string;

  status?: CommunityUpdateStatus;

  isActive?: boolean;

  expiresAt?: string | null;
}

// ============================================================
// UPDATE INPUT
// ============================================================

export interface UpdateCommunityUpdateInput {
  category?: CommunityUpdateCategory;

  title?: string;

  summary?: string;

  description?: string;

  state?: string;

  district?: string;

  mandal?: string;

  village?: string;

  visibility?: CommunityUpdateVisibility;

  eventDate?: string | null;

  startTime?: string;

  endTime?: string;

  venue?: string;

  contactNumber?: string;

  externalLink?: string;

  imageUrl?: string;

  status?: CommunityUpdateStatus;

  isActive?: boolean;

  expiresAt?: string | null;
}

// ============================================================
// LIST FILTERS
// ============================================================

export interface CommunityUpdateListFilters {
  postedBy?: string;

  category?: CommunityUpdateCategory;

  status?: CommunityUpdateStatus;

  search?: string;

  state?: string;

  district?: string;

  mandal?: string;

  village?: string;

  visibility?: CommunityUpdateVisibility;

  page?: number;

  limit?: number;
}

// ============================================================
// PUBLIC FILTERS
// ============================================================

export interface PublicCommunityUpdateFilters {
  category?: CommunityUpdateCategory;

  search?: string;

  state?: string;

  district?: string;

  mandal?: string;

  village?: string;

  page?: number;

  limit?: number;
}

// ============================================================
// DATABASE ROW
//
// PostgreSQL returns snake_case columns.
// ============================================================

interface CommunityUpdateDbRow {
  id: number;

  category: CommunityUpdateCategory;

  title: string;

  summary: string;

  description: string;

  state: string;

  district: string;

  mandal: string;

  village: string;

  visibility: CommunityUpdateVisibility;

  event_date: string | Date | null;

  start_time: string;

  end_time: string;

  venue: string;

  contact_number: string;

  external_link: string;

  image_url: string;

  posted_by: string;

  posted_by_name: string;

  status: CommunityUpdateStatus;

  is_active: boolean;

  expires_at: string | Date | null;

  created_at: string | Date;

  updated_at: string | Date;
}

// ============================================================
// HELPERS
// ============================================================

const toNullableIso = (
  value: string | Date | null,
): string | null => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

// ============================================================
// MAP DATABASE ROW -> API OBJECT
// ============================================================

const mapRow = (
  row: CommunityUpdateDbRow,
): ICommunityUpdate => {
  return {
    id: Number(row.id),

    category: row.category,

    title: row.title,

    summary: row.summary,

    description: row.description,

    state: row.state,

    district: row.district,

    mandal: row.mandal,

    village: row.village,

    visibility: row.visibility,

    eventDate:
      toNullableIso(
        row.event_date,
      )?.slice(0, 10) || null,

    startTime: row.start_time || "",

    endTime: row.end_time || "",

    venue: row.venue || "",

    contactNumber:
      row.contact_number || "",

    externalLink:
      row.external_link || "",

    imageUrl:
      row.image_url || "",

    postedBy:
      row.posted_by,

    postedByName:
      row.posted_by_name,

    status:
      row.status,

    isActive:
      Boolean(row.is_active),

    expiresAt:
      toNullableIso(
        row.expires_at,
      ),

    createdAt:
      toNullableIso(
        row.created_at,
      ) || "",

    updatedAt:
      toNullableIso(
        row.updated_at,
      ) || "",
  };
};

// ============================================================
// COMMON SELECT
// ============================================================

const SELECT_COLUMNS = `
  id,
  category,
  title,
  summary,
  description,
  state,
  district,
  mandal,
  village,
  visibility,
  TO_CHAR(event_date, 'YYYY-MM-DD') AS event_date,
  start_time,
  end_time,
  venue,
  contact_number,
  external_link,
  image_url,
  posted_by,
  posted_by_name,
  status,
  is_active,
  expires_at,
  created_at,
  updated_at
`;

// ============================================================
// GET ONE
// ============================================================

export const getCommunityUpdateById =
  async (
    id: number,
    postedBy?: string,
  ): Promise<ICommunityUpdate | null> => {
    const values: unknown[] = [id];

    let where = `
      id = $1
    `;

    if (postedBy) {
      values.push(postedBy);

      where += `
        AND posted_by = $${values.length}
      `;
    }

    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          SELECT
            ${SELECT_COLUMNS}
          FROM community_updates
          WHERE ${where}
          LIMIT 1
        `,
        values,
      );

    if (
      result.rows.length === 0
    ) {
      return null;
    }

    return mapRow(
      result.rows[0],
    );
  };

// ============================================================
// LIST
// ============================================================

export const getCommunityUpdates =
  async (
    filters: CommunityUpdateListFilters = {},
  ): Promise<{
    updates: ICommunityUpdate[];
    total: number;
  }> => {
    const values: unknown[] = [];

    const conditions: string[] = [];

    // --------------------------------------------------------
    // VOLUNTEER
    // --------------------------------------------------------

    if (filters.postedBy) {
      values.push(filters.postedBy);

      conditions.push(
        `posted_by = $${values.length}`,
      );
    }

    // --------------------------------------------------------
    // CATEGORY
    // --------------------------------------------------------

    if (filters.category) {
      values.push(filters.category);

      conditions.push(
        `category = $${values.length}`,
      );
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (filters.status) {
      values.push(filters.status);

      conditions.push(
        `status = $${values.length}`,
      );
    }

    // --------------------------------------------------------
    // LOCATION
    // --------------------------------------------------------

    if (filters.state) {
      values.push(filters.state);

      conditions.push(
        `state = $${values.length}`,
      );
    }

    if (filters.district) {
      values.push(filters.district);

      conditions.push(
        `district = $${values.length}`,
      );
    }

    if (filters.mandal) {
      values.push(filters.mandal);

      conditions.push(
        `mandal = $${values.length}`,
      );
    }

    if (filters.village) {
      values.push(filters.village);

      conditions.push(
        `village = $${values.length}`,
      );
    }

    if (filters.visibility) {
      values.push(filters.visibility);

      conditions.push(
        `visibility = $${values.length}`,
      );
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (filters.search) {
      values.push(
        `%${filters.search}%`,
      );

      const placeholder =
        `$${values.length}`;

      conditions.push(`
        (
          title ILIKE ${placeholder}
          OR summary ILIKE ${placeholder}
          OR description ILIKE ${placeholder}
          OR venue ILIKE ${placeholder}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const page =
      filters.page &&
      filters.page > 0
        ? Math.floor(filters.page)
        : 1;

    const limit =
      filters.limit &&
      filters.limit > 0
        ? Math.min(
            Math.floor(filters.limit),
            100,
          )
        : 20;

    const offset =
      (page - 1) * limit;

    // --------------------------------------------------------
    // COUNT
    // --------------------------------------------------------

    const countResult =
      await pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM community_updates
          ${whereClause}
        `,
        values,
      );

    const total = Number(
      countResult.rows[0]?.count || 0,
    );

    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    const dataValues = [
      ...values,
      limit,
      offset,
    ];

    const dataResult =
      await pool.query<CommunityUpdateDbRow>(
        `
          SELECT
            ${SELECT_COLUMNS}
          FROM community_updates
          ${whereClause}
          ORDER BY
            event_date ASC NULLS LAST,
            created_at DESC
          LIMIT $${dataValues.length - 1}
          OFFSET $${dataValues.length}
        `,
        dataValues,
      );

    return {
      updates:
        dataResult.rows.map(mapRow),

      total,
    };
  };

// ============================================================
// CREATE
// ============================================================

export const createCommunityUpdate =
  async (
    input: CreateCommunityUpdateInput,
  ): Promise<ICommunityUpdate> => {
    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          INSERT INTO community_updates (
            category,
            title,
            summary,
            description,
            state,
            district,
            mandal,
            village,
            visibility,
            event_date,
            start_time,
            end_time,
            venue,
            contact_number,
            external_link,
            image_url,
            posted_by,
            posted_by_name,
            status,
            is_active,
            expires_at,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19,
            $20,
            $21,
            NOW(),
            NOW()
          )
          RETURNING
            ${SELECT_COLUMNS}
        `,
        [
          input.category,

          input.title,

          input.summary,

          input.description,

          input.state,

          input.district,

          input.mandal,

          input.village,

          input.visibility,

          input.eventDate || null,

          input.startTime || "",

          input.endTime || "",

          input.venue || "",

          input.contactNumber || "",

          input.externalLink || "",

          input.imageUrl || "",

          input.postedBy,

          input.postedByName,

          input.status || "draft",

          input.isActive ?? true,

          input.expiresAt || null,
        ],
      );

    return mapRow(
      result.rows[0],
    );
  };

// ============================================================
// UPDATE
// ============================================================

export const updateCommunityUpdate =
  async (
    id: number,
    postedBy: string,
    input: UpdateCommunityUpdateInput,
  ): Promise<ICommunityUpdate | null> => {
    const fields: string[] = [];

    const values: unknown[] = [];

    // --------------------------------------------------------
    // HELPER
    // --------------------------------------------------------

    const addField = (
      column: string,
      value: unknown,
    ) => {
      values.push(value);

      fields.push(
        `${column} = $${values.length}`,
      );
    };

    // --------------------------------------------------------
    // FIELDS
    // --------------------------------------------------------

    if (
      input.category !== undefined
    ) {
      addField(
        "category",
        input.category,
      );
    }

    if (
      input.title !== undefined
    ) {
      addField(
        "title",
        input.title,
      );
    }

    if (
      input.summary !== undefined
    ) {
      addField(
        "summary",
        input.summary,
      );
    }

    if (
      input.description !== undefined
    ) {
      addField(
        "description",
        input.description,
      );
    }

    if (
      input.state !== undefined
    ) {
      addField(
        "state",
        input.state,
      );
    }

    if (
      input.district !== undefined
    ) {
      addField(
        "district",
        input.district,
      );
    }

    if (
      input.mandal !== undefined
    ) {
      addField(
        "mandal",
        input.mandal,
      );
    }

    if (
      input.village !== undefined
    ) {
      addField(
        "village",
        input.village,
      );
    }

    if (
      input.visibility !== undefined
    ) {
      addField(
        "visibility",
        input.visibility,
      );
    }

    if (
      input.eventDate !== undefined
    ) {
      addField(
        "event_date",
        input.eventDate || null,
      );
    }

    if (
      input.startTime !== undefined
    ) {
      addField(
        "start_time",
        input.startTime,
      );
    }

    if (
      input.endTime !== undefined
    ) {
      addField(
        "end_time",
        input.endTime,
      );
    }

    if (
      input.venue !== undefined
    ) {
      addField(
        "venue",
        input.venue,
      );
    }

    if (
      input.contactNumber !== undefined
    ) {
      addField(
        "contact_number",
        input.contactNumber,
      );
    }

    if (
      input.externalLink !== undefined
    ) {
      addField(
        "external_link",
        input.externalLink,
      );
    }

    if (
      input.imageUrl !== undefined
    ) {
      addField(
        "image_url",
        input.imageUrl,
      );
    }

    if (
      input.status !== undefined
    ) {
      addField(
        "status",
        input.status,
      );
    }

    if (
      input.isActive !== undefined
    ) {
      addField(
        "is_active",
        input.isActive,
      );
    }

    if (
      input.expiresAt !== undefined
    ) {
      addField(
        "expires_at",
        input.expiresAt || null,
      );
    }

    // --------------------------------------------------------
    // NOTHING TO UPDATE
    // --------------------------------------------------------

    if (
      fields.length === 0
    ) {
      return getCommunityUpdateById(
        id,
        postedBy,
      );
    }

    // --------------------------------------------------------
    // UPDATED TIMESTAMP
    // --------------------------------------------------------

    values.push(
      new Date(),
    );

    fields.push(
      `updated_at = $${values.length}`,
    );

    // --------------------------------------------------------
    // OWNER
    // --------------------------------------------------------

    values.push(id);

    const idPlaceholder =
      `$${values.length}`;

    values.push(postedBy);

    const ownerPlaceholder =
      `$${values.length}`;

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          UPDATE community_updates
          SET
            ${fields.join(", ")}
          WHERE
            id = ${idPlaceholder}
            AND posted_by = ${ownerPlaceholder}
          RETURNING
            ${SELECT_COLUMNS}
        `,
        values,
      );

    if (
      result.rows.length === 0
    ) {
      return null;
    }

    return mapRow(
      result.rows[0],
    );
  };

// ============================================================
// DELETE
// ============================================================

export const deleteCommunityUpdate =
  async (
    id: number,
    postedBy: string,
  ): Promise<ICommunityUpdate | null> => {
    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          DELETE FROM community_updates
          WHERE
            id = $1
            AND posted_by = $2
          RETURNING
            ${SELECT_COLUMNS}
        `,
        [
          id,
          postedBy,
        ],
      );

    if (
      result.rows.length === 0
    ) {
      return null;
    }

    return mapRow(
      result.rows[0],
    );
  };

// ============================================================
// PUBLISH
// ============================================================

export const publishCommunityUpdate =
  async (
    id: number,
    postedBy: string,
  ): Promise<ICommunityUpdate | null> => {
    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          UPDATE community_updates
          SET
            status = 'published',
            is_active = TRUE,
            updated_at = NOW()
          WHERE
            id = $1
            AND posted_by = $2
          RETURNING
            ${SELECT_COLUMNS}
        `,
        [
          id,
          postedBy,
        ],
      );

    if (
      result.rows.length === 0
    ) {
      return null;
    }

    return mapRow(
      result.rows[0],
    );
  };

// ============================================================
// UNPUBLISH
// ============================================================

export const unpublishCommunityUpdate =
  async (
    id: number,
    postedBy: string,
  ): Promise<ICommunityUpdate | null> => {
    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          UPDATE community_updates
          SET
            status = 'draft',
            updated_at = NOW()
          WHERE
            id = $1
            AND posted_by = $2
          RETURNING
            ${SELECT_COLUMNS}
        `,
        [
          id,
          postedBy,
        ],
      );

    if (
      result.rows.length === 0
    ) {
      return null;
    }

    return mapRow(
      result.rows[0],
    );
  };

// ============================================================
// PUBLIC COMMUNITY UPDATES
//
// Visibility rules:
//
// all       -> everyone
// district  -> same state + district
// mandal    -> same state + district + mandal
// village   -> same state + district + mandal + village
//
// Only:
//   published
//   active
//   non-expired
// ============================================================

export const getPublicCommunityUpdates =
  async (
    filters: PublicCommunityUpdateFilters = {},
  ): Promise<{
    updates: ICommunityUpdate[];
    total: number;
  }> => {
    const values: unknown[] = [];

    const conditions: string[] = [
      `status = 'published'`,

      `is_active = TRUE`,

      `
        (
          expires_at IS NULL
          OR expires_at > NOW()
        )
      `,
    ];

    // --------------------------------------------------------
    // CATEGORY
    // --------------------------------------------------------

    if (filters.category) {
      values.push(
        filters.category,
      );

      conditions.push(
        `category = $${values.length}`,
      );
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (filters.search) {
      values.push(
        `%${filters.search}%`,
      );

      const placeholder =
        `$${values.length}`;

      conditions.push(`
        (
          title ILIKE ${placeholder}
          OR summary ILIKE ${placeholder}
          OR description ILIKE ${placeholder}
          OR venue ILIKE ${placeholder}
        )
      `);
    }

    // --------------------------------------------------------
    // LOCATION
    //
    // With no location:
    // only "all" updates are returned.
    //
    // --------------------------------------------------------

    const locationValues: string[] =
      [];

    if (
      filters.state &&
      filters.district
    ) {
      values.push(
        filters.state,
      );

      const statePlaceholder =
        `$${values.length}`;

      values.push(
        filters.district,
      );

      const districtPlaceholder =
        `$${values.length}`;

      locationValues.push(`
        (
          visibility = 'district'
          AND state = ${statePlaceholder}
          AND district = ${districtPlaceholder}
        )
      `);

      if (filters.mandal) {
        values.push(
          filters.mandal,
        );

        const mandalPlaceholder =
          `$${values.length}`;

        locationValues.push(`
          (
            visibility = 'mandal'
            AND state = ${statePlaceholder}
            AND district = ${districtPlaceholder}
            AND mandal = ${mandalPlaceholder}
          )
        `);

        if (filters.village) {
          values.push(
            filters.village,
          );

          const villagePlaceholder =
            `$${values.length}`;

          locationValues.push(`
            (
              visibility = 'village'
              AND state = ${statePlaceholder}
              AND district = ${districtPlaceholder}
              AND mandal = ${mandalPlaceholder}
              AND village = ${villagePlaceholder}
            )
          `);
        }
      }
    }

    locationValues.unshift(
      `visibility = 'all'`,
    );

    conditions.push(`
      (
        ${locationValues.join(" OR ")}
      )
    `);

    // --------------------------------------------------------
    // WHERE
    // --------------------------------------------------------

    const whereClause =
      `WHERE ${conditions.join(" AND ")}`;

    // --------------------------------------------------------
    // COUNT
    // --------------------------------------------------------

    const countResult =
      await pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM community_updates
          ${whereClause}
        `,
        values,
      );

    const total = Number(
      countResult.rows[0]?.count || 0,
    );

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const page =
      filters.page &&
      filters.page > 0
        ? Math.floor(filters.page)
        : 1;

    const limit =
      filters.limit &&
      filters.limit > 0
        ? Math.min(
            Math.floor(filters.limit),
            100,
          )
        : 20;

    const offset =
      (page - 1) * limit;

    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    const dataValues = [
      ...values,
      limit,
      offset,
    ];

    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          SELECT
            ${SELECT_COLUMNS}
          FROM community_updates
          ${whereClause}
          ORDER BY
            event_date ASC NULLS LAST,
            created_at DESC
          LIMIT $${dataValues.length - 1}
          OFFSET $${dataValues.length}
        `,
        dataValues,
      );

    return {
      updates:
        result.rows.map(mapRow),

      total,
    };
  };

// ============================================================
// PUBLIC SINGLE UPDATE
// ============================================================

export const getPublicCommunityUpdateById =
  async (
    id: number,
    filters: {
      state?: string;
      district?: string;
      mandal?: string;
      village?: string;
    } = {},
  ): Promise<ICommunityUpdate | null> => {
    const values: unknown[] = [
      id,
    ];

    const locationConditions: string[] =
      [
        `visibility = 'all'`,
      ];

    if (
      filters.state &&
      filters.district
    ) {
      values.push(
        filters.state,
      );

      const statePlaceholder =
        `$${values.length}`;

      values.push(
        filters.district,
      );

      const districtPlaceholder =
        `$${values.length}`;

      locationConditions.push(`
        (
          visibility = 'district'
          AND state = ${statePlaceholder}
          AND district = ${districtPlaceholder}
        )
      `);

      if (filters.mandal) {
        values.push(
          filters.mandal,
        );

        const mandalPlaceholder =
          `$${values.length}`;

        locationConditions.push(`
          (
            visibility = 'mandal'
            AND state = ${statePlaceholder}
            AND district = ${districtPlaceholder}
            AND mandal = ${mandalPlaceholder}
          )
        `);

        if (filters.village) {
          values.push(
            filters.village,
          );

          const villagePlaceholder =
            `$${values.length}`;

          locationConditions.push(`
            (
              visibility = 'village'
              AND state = ${statePlaceholder}
              AND district = ${districtPlaceholder}
              AND mandal = ${mandalPlaceholder}
              AND village = ${villagePlaceholder}
            )
          `);
        }
      }
    }

    const result =
      await pool.query<CommunityUpdateDbRow>(
        `
          SELECT
            ${SELECT_COLUMNS}
          FROM community_updates
          WHERE
            id = $1
            AND status = 'published'
            AND is_active = TRUE
            AND (
              expires_at IS NULL
              OR expires_at > NOW()
            )
            AND (
              ${locationConditions.join(
                " OR ",
              )}
            )
          LIMIT 1
        `,
        values,
      );

    if (
      result.rows.length === 0
    ) {
      return null;
    }

    return mapRow(
      result.rows[0],
    );
  };

// ============================================================
// EXPORT DEFAULT
//
// This is a database helper object instead of a Mongoose model.
// ============================================================

const CommunityUpdate = {
  getCommunityUpdateById,

  getCommunityUpdates,

  createCommunityUpdate,

  updateCommunityUpdate,

  deleteCommunityUpdate,

  publishCommunityUpdate,

  unpublishCommunityUpdate,

  getPublicCommunityUpdates,

  getPublicCommunityUpdateById,
};

export default CommunityUpdate;