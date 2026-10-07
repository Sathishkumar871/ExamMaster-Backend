import {
  Request,
  Response,
} from "express";

import type {
  CommunityUpdateCategory,
  CommunityUpdateStatus,
  CommunityUpdateVisibility,
} from "../models/communityUpdateModel";

import {
  createCommunityUpdate as createCommunityUpdateRecord,
  deleteCommunityUpdate as deleteCommunityUpdateRecord,
  getCommunityUpdateById,
  getCommunityUpdates,
  getPublicCommunityUpdateById as getPublicCommunityUpdateRecord,
  getPublicCommunityUpdates as getPublicCommunityUpdatesRecord,
  publishCommunityUpdate as publishCommunityUpdateRecord,
  unpublishCommunityUpdate as unpublishCommunityUpdateRecord,
  updateCommunityUpdate as updateCommunityUpdateRecord,
} from "../models/communityUpdateModel";

// ============================================================
// CONSTANTS
// ============================================================

const VALID_CATEGORIES: CommunityUpdateCategory[] = [
  "medical",
  "education",
  "government_scheme",
  "jobs",
  "youth_meeting",
];

const VALID_VISIBILITY: CommunityUpdateVisibility[] = [
  "village",
  "mandal",
  "district",
  "all",
];

const VALID_STATUS: CommunityUpdateStatus[] = [
  "draft",
  "published",
];

// ============================================================
// REQUEST TYPES
// ============================================================

interface VolunteerToken {
  id?: string;
  _id?: string;
  userId?: string;
  volunteerId?: string;

  name?: string;

  role?: string;
  status?: string;

  state?: string;
  district?: string;
  mandal?: string;
  village?: string;

  volunteer?: {
    id?: string;
    _id?: string;

    name?: string;

    role?: string;
    status?: string;

    state?: string;
    district?: string;
    mandal?: string;
    village?: string;
  };
}

type VolunteerRequest = Request & {
  volunteer?: VolunteerToken;
};

// ============================================================
// HELPERS
// ============================================================

// ------------------------------------------------------------
// NORMALIZE STRING
// ------------------------------------------------------------

const normalizeString = (
  value: unknown,
): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

// ------------------------------------------------------------
// NORMALIZE STRING ARRAY
//
// Accepts:
// [
//   "Aadhaar Card",
//   "Income Certificate"
// ]
//
// Also accepts JSON string:
// '["Aadhaar Card","Income Certificate"]'
//
// Also accepts newline/comma separated text as fallback.
// ------------------------------------------------------------

const normalizeStringArray = (
  value: unknown,
): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string",
      )
      .map((item) => item.trim())
      .filter(
        (item) => item.length > 0,
      );
  }

  if (typeof value !== "string") {
    return [];
  }

  const text = value.trim();

  if (!text) {
    return [];
  }

  // ----------------------------------------------------------
  // Try JSON array
  // ----------------------------------------------------------

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map(
          (item) => item.trim(),
        )
        .filter(
          (item) =>
            item.length > 0,
        );
    }
  } catch (_) {
    // Continue with text fallback.
  }

  // ----------------------------------------------------------
  // Newline-separated fallback
  // ----------------------------------------------------------

  const newlineItems =
    text
      .split(/\r?\n/)
      .map(
        (item) => item.trim(),
      )
      .filter(
        (item) => item.length > 0,
      );

  if (newlineItems.length > 1) {
    return newlineItems;
  }

  // ----------------------------------------------------------
  // Comma-separated fallback
  // ----------------------------------------------------------

  return text
    .split(",")
    .map(
      (item) => item.trim(),
    )
    .filter(
      (item) => item.length > 0,
    );
};

// ------------------------------------------------------------
// GET VOLUNTEER ID
// ------------------------------------------------------------

const getVolunteerId = (
  req: VolunteerRequest,
): string => {
  const volunteer = req.volunteer;

  if (!volunteer) {
    return "";
  }

  return (
    normalizeString(
      volunteer.id,
    ) ||
    normalizeString(
      volunteer._id,
    ) ||
    normalizeString(
      volunteer.userId,
    ) ||
    normalizeString(
      volunteer.volunteerId,
    ) ||
    normalizeString(
      volunteer.volunteer?.id,
    ) ||
    normalizeString(
      volunteer.volunteer?._id,
    )
  );
};

// ------------------------------------------------------------
// GET VOLUNTEER NAME
// ------------------------------------------------------------

const getVolunteerName = (
  req: VolunteerRequest,
): string => {
  const volunteer =
    req.volunteer;

  if (!volunteer) {
    return "Volunteer";
  }

  return (
    normalizeString(
      volunteer.name,
    ) ||
    normalizeString(
      volunteer.volunteer?.name,
    ) ||
    "Volunteer"
  );
};

// ------------------------------------------------------------
// VALID CATEGORY
// ------------------------------------------------------------

const isValidCategory = (
  value: string,
): value is CommunityUpdateCategory => {
  return VALID_CATEGORIES.includes(
    value as CommunityUpdateCategory,
  );
};

// ------------------------------------------------------------
// VALID VISIBILITY
// ------------------------------------------------------------

const isValidVisibility = (
  value: string,
): value is CommunityUpdateVisibility => {
  return VALID_VISIBILITY.includes(
    value as CommunityUpdateVisibility,
  );
};

// ------------------------------------------------------------
// VALID STATUS
// ------------------------------------------------------------

const isValidStatus = (
  value: string,
): value is CommunityUpdateStatus => {
  return VALID_STATUS.includes(
    value as CommunityUpdateStatus,
  );
};

// ------------------------------------------------------------
// EVENT DATE
//
// PostgreSQL: DATE
//
// Accepted:
// YYYY-MM-DD
// ------------------------------------------------------------

const parseEventDate = (
  value: unknown,
): string | null | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const text =
    normalizeString(value);

  if (!text) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      text,
    )
  ) {
    return undefined;
  }

  const date =
    new Date(
      `${text}T00:00:00Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  const normalized =
    date
      .toISOString()
      .slice(0, 10);

  if (
    normalized !== text
  ) {
    return undefined;
  }

  return text;
};

// ------------------------------------------------------------
// EXPIRY DATE
//
// PostgreSQL: TIMESTAMPTZ
// ------------------------------------------------------------

const parseExpiresAt = (
  value: unknown,
): string | null | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const text =
    normalizeString(value);

  if (!text) {
    return null;
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  return date.toISOString();
};

// ------------------------------------------------------------
// BOOLEAN
// ------------------------------------------------------------

const parseBoolean = (
  value: unknown,
): boolean | undefined => {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const normalized =
      value
        .trim()
        .toLowerCase();

    if (
      normalized ===
      "true"
    ) {
      return true;
    }

    if (
      normalized ===
      "false"
    ) {
      return false;
    }
  }

  if (
    typeof value ===
    "number"
  ) {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return undefined;
};

// ------------------------------------------------------------
// POSITIVE INTEGER
// ------------------------------------------------------------

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  maximum?: number,
): number => {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric,
    ) ||
    numeric <= 0
  ) {
    return fallback;
  }

  let parsed =
    Math.floor(numeric);

  if (
    maximum !== undefined
  ) {
    parsed =
      Math.min(
        parsed,
        maximum,
      );
  }

  return parsed;
};

// ------------------------------------------------------------
// POSTGRES BIGSERIAL ID
// ------------------------------------------------------------

const parseUpdateId = (
  value: unknown,
): number | null => {
  const text =
    normalizeString(value);

  if (!text) {
    return null;
  }

  if (
    !/^\d+$/.test(text)
  ) {
    return null;
  }

  const id =
    Number(text);

  if (
    !Number.isSafeInteger(
      id,
    ) ||
    id <= 0
  ) {
    return null;
  }

  return id;
};

// ============================================================
// VOLUNTEER - LIST
//
// GET /api/volunteer/community-updates
// ============================================================

export const getVolunteerCommunityUpdates =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const volunteerReq =
        req as VolunteerRequest;

      const volunteerId =
        getVolunteerId(
          volunteerReq,
        );

      if (!volunteerId) {
        res.status(401).json({
          success: false,
          message:
            "Volunteer identity could not be determined.",
        });

        return;
      }

      const category =
        normalizeString(
          req.query.category,
        );

      const search =
        normalizeString(
          req.query.search,
        );

      const status =
        normalizeString(
          req.query.status,
        );

      // ------------------------------------------------------
      // CATEGORY VALIDATION
      // ------------------------------------------------------

      if (
        category &&
        !isValidCategory(
          category,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update category.",
        });

        return;
      }

      // ------------------------------------------------------
      // STATUS VALIDATION
      // ------------------------------------------------------

      if (
        status &&
        !isValidStatus(
          status,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update status.",
        });

        return;
      }

      // ------------------------------------------------------
      // PAGINATION
      // ------------------------------------------------------

      const page =
        parsePositiveInteger(
          req.query.page,
          1,
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          20,
          100,
        );

      // ------------------------------------------------------
      // DATABASE
      // ------------------------------------------------------

      const result =
        await getCommunityUpdates({
          postedBy:
            volunteerId,

          category:
            category
              ? (
                  category as CommunityUpdateCategory
                )
              : undefined,

          status:
            status
              ? (
                  status as CommunityUpdateStatus
                )
              : undefined,

          search:
            search
              ? search
              : undefined,

          page,

          limit,
        });

      const totalPages =
        Math.ceil(
          result.total /
            limit,
        );

      res.json({
        success: true,

        count:
          result.updates
            .length,

        total:
          result.total,

        page,

        limit,

        totalPages,

        hasNextPage:
          page <
          totalPages,

        hasPreviousPage:
          page > 1,

        updates:
          result.updates,
      });
    } catch (error) {
      console.error(
        "[GET VOLUNTEER COMMUNITY UPDATES ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load community updates.",
      });
    }
  };

// ============================================================
// VOLUNTEER - GET SINGLE
//
// GET /api/volunteer/community-updates/:id
// ============================================================

export const getVolunteerCommunityUpdateById =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const volunteerReq =
        req as VolunteerRequest;

      const volunteerId =
        getVolunteerId(
          volunteerReq,
        );

      if (!volunteerId) {
        res.status(401).json({
          success: false,
          message:
            "Volunteer authentication required.",
        });

        return;
      }

      const updateId =
        parseUpdateId(
          req.params.id,
        );

      if (updateId === null) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update ID.",
        });

        return;
      }

      const update =
        await getCommunityUpdateById(
          updateId,
          volunteerId,
        );

      if (!update) {
        res.status(404).json({
          success: false,
          message:
            "Community update not found.",
        });

        return;
      }

      res.json({
        success: true,
        update,
      });
    } catch (error) {
      console.error(
        "[GET VOLUNTEER COMMUNITY UPDATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load community update.",
      });
    }
  };

// ============================================================
// VOLUNTEER - CREATE
//
// POST /api/volunteer/community-updates
// ============================================================

export const createCommunityUpdate =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const volunteerReq =
        req as VolunteerRequest;

      const volunteerId =
        getVolunteerId(
          volunteerReq,
        );

      const volunteerName =
        getVolunteerName(
          volunteerReq,
        );

      if (!volunteerId) {
        res.status(401).json({
          success: false,
          message:
            "Volunteer authentication required.",
        });

        return;
      }

      // ------------------------------------------------------
      // BASIC DATA
      // ------------------------------------------------------

      const category =
        normalizeString(
          req.body.category,
        );

      const title =
        normalizeString(
          req.body.title,
        );

      const summary =
        normalizeString(
          req.body.summary,
        );

      const description =
        normalizeString(
          req.body.description,
        );

      // ------------------------------------------------------
      // LOCATION
      // ------------------------------------------------------

      const state =
        normalizeString(
          req.body.state,
        );

      const district =
        normalizeString(
          req.body.district,
        );

      const mandal =
        normalizeString(
          req.body.mandal,
        );

      const village =
        normalizeString(
          req.body.village,
        );

      const visibility =
        normalizeString(
          req.body.visibility,
        );

      // ------------------------------------------------------
      // EVENT
      // ------------------------------------------------------

      const startTime =
        normalizeString(
          req.body.startTime,
        );

      const endTime =
        normalizeString(
          req.body.endTime,
        );

      const venue =
        normalizeString(
          req.body.venue,
        );

      // ------------------------------------------------------
      // CONTACT / LINK
      // ------------------------------------------------------

      const contactNumber =
        normalizeString(
          req.body.contactNumber,
        );

      const externalLink =
        normalizeString(
          req.body.externalLink,
        );

      // ------------------------------------------------------
      // IMAGE
      // ------------------------------------------------------

      const imageUrl =
        normalizeString(
          req.body.imageUrl,
        );

      // ======================================================
      // GOVERNMENT SCHEME FIELDS
      // ======================================================

      const eligibility =
        normalizeString(
          req.body.eligibility,
        );

      const benefits =
        normalizeString(
          req.body.benefits,
        );

      const requiredDocuments =
        normalizeStringArray(
          req.body.requiredDocuments,
        );

      const applicationSteps =
        normalizeStringArray(
          req.body.applicationSteps,
        );

      const applicationUrl =
        normalizeString(
          req.body.applicationUrl,
        );

      const officialWebsiteUrl =
        normalizeString(
          req.body.officialWebsiteUrl,
        );

      const videoUrl =
        normalizeString(
          req.body.videoUrl,
        );

      // ------------------------------------------------------
      // STATUS
      // ------------------------------------------------------

      const requestedStatus =
        normalizeString(
          req.body.status,
        ) || "draft";

      // ------------------------------------------------------
      // CATEGORY
      // ------------------------------------------------------

      if (
        !isValidCategory(
          category,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "A valid community update category is required.",
        });

        return;
      }

      // ------------------------------------------------------
      // CONTENT
      // ------------------------------------------------------

      if (!title) {
        res.status(400).json({
          success: false,
          message:
            "Title is required.",
        });

        return;
      }

      if (
        title.length > 200
      ) {
        res.status(400).json({
          success: false,
          message:
            "Title must not exceed 200 characters.",
        });

        return;
      }

      if (!summary) {
        res.status(400).json({
          success: false,
          message:
            "Summary is required.",
        });

        return;
      }

      if (
        summary.length > 500
      ) {
        res.status(400).json({
          success: false,
          message:
            "Summary must not exceed 500 characters.",
        });

        return;
      }

      if (!description) {
        res.status(400).json({
          success: false,
          message:
            "Description is required.",
        });

        return;
      }

      if (
        description.length >
        5000
      ) {
        res.status(400).json({
          success: false,
          message:
            "Description must not exceed 5000 characters.",
        });

        return;
      }

      // ------------------------------------------------------
      // LOCATION
      // ------------------------------------------------------

      if (!state) {
        res.status(400).json({
          success: false,
          message:
            "State is required.",
        });

        return;
      }

      if (!district) {
        res.status(400).json({
          success: false,
          message:
            "District is required.",
        });

        return;
      }

      if (!mandal) {
        res.status(400).json({
          success: false,
          message:
            "Mandal is required.",
        });

        return;
      }

      if (!village) {
        res.status(400).json({
          success: false,
          message:
            "Village is required.",
        });

        return;
      }

      // ------------------------------------------------------
      // VISIBILITY
      // ------------------------------------------------------

      if (
        !isValidVisibility(
          visibility,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid visibility option.",
        });

        return;
      }

      // ------------------------------------------------------
      // STATUS
      // ------------------------------------------------------

      if (
        !isValidStatus(
          requestedStatus,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Status must be draft or published.",
        });

        return;
      }

      // ------------------------------------------------------
      // DATE
      // ------------------------------------------------------

      const eventDate =
        parseEventDate(
          req.body.eventDate,
        );

      if (
        req.body.eventDate !==
          undefined &&
        eventDate === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid event date. Use YYYY-MM-DD.",
        });

        return;
      }

      // ------------------------------------------------------
      // EXPIRY
      // ------------------------------------------------------

      const expiresAt =
        parseExpiresAt(
          req.body.expiresAt,
        );

      if (
        req.body.expiresAt !==
          undefined &&
        expiresAt === undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid expiry date.",
        });

        return;
      }

      // ------------------------------------------------------
      // CREATE DATABASE RECORD
      // ------------------------------------------------------

      const update =
        await createCommunityUpdateRecord({
          category,

          title,

          summary,

          description,

          state,

          district,

          mandal,

          village,

          visibility,

          eventDate:
            eventDate ??
            null,

          startTime,

          endTime,

          venue,

          contactNumber,

          externalLink,

          imageUrl,

          // ==================================================
          // GOVERNMENT SCHEME FIELDS
          // ==================================================

          eligibility,

          benefits,

          requiredDocuments,

          applicationSteps,

          applicationUrl,

          officialWebsiteUrl,

          videoUrl,

          // ==================================================

          postedBy:
            volunteerId,

          postedByName:
            volunteerName,

          status:
            requestedStatus,

          isActive:
            true,

          expiresAt:
            expiresAt ??
            null,
        });

      res.status(201).json({
        success: true,

        message:
          requestedStatus ===
          "published"
            ? "Community update published successfully."
            : "Community update saved as draft.",

        update,
      });
    } catch (error) {
      console.error(
        "[CREATE COMMUNITY UPDATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create community update.",
      });
    }
  };

// ============================================================
// VOLUNTEER - UPDATE
//
// PUT /api/volunteer/community-updates/:id
// ============================================================

export const updateCommunityUpdate =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const volunteerReq =
        req as VolunteerRequest;

      const volunteerId =
        getVolunteerId(
          volunteerReq,
        );

      if (!volunteerId) {
        res.status(401).json({
          success: false,
          message:
            "Volunteer authentication required.",
        });

        return;
      }

      const updateId =
        parseUpdateId(
          req.params.id,
        );

      if (updateId === null) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update ID.",
        });

        return;
      }

      // ------------------------------------------------------
      // VERIFY OWNER
      // ------------------------------------------------------

      const existing =
        await getCommunityUpdateById(
          updateId,
          volunteerId,
        );

      if (!existing) {
        res.status(404).json({
          success: false,
          message:
            "Community update not found.",
        });

        return;
      }

      // ------------------------------------------------------
      // UPDATE PAYLOAD
      // ------------------------------------------------------

      const updateData: {
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

        // ====================================================
        // GOVERNMENT SCHEME FIELDS
        // ====================================================

        eligibility?: string;

        benefits?: string;

        requiredDocuments?: string[];

        applicationSteps?: string[];

        applicationUrl?: string;

        officialWebsiteUrl?: string;

        videoUrl?: string;

        // ====================================================

        status?: CommunityUpdateStatus;

        isActive?: boolean;

        expiresAt?: string | null;
      } = {};

      // ------------------------------------------------------
      // CATEGORY
      // ------------------------------------------------------

      if (
        req.body.category !==
        undefined
      ) {
        const category =
          normalizeString(
            req.body.category,
          );

        if (
          !isValidCategory(
            category,
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid community update category.",
          });

          return;
        }

        updateData.category =
          category;
      }

      // ------------------------------------------------------
      // TITLE
      // ------------------------------------------------------

      if (
        req.body.title !==
        undefined
      ) {
        const title =
          normalizeString(
            req.body.title,
          );

        if (!title) {
          res.status(400).json({
            success: false,
            message:
              "Title cannot be empty.",
          });

          return;
        }

        if (
          title.length > 200
        ) {
          res.status(400).json({
            success: false,
            message:
              "Title must not exceed 200 characters.",
          });

          return;
        }

        updateData.title =
          title;
      }

      // ------------------------------------------------------
      // SUMMARY
      // ------------------------------------------------------

      if (
        req.body.summary !==
        undefined
      ) {
        const summary =
          normalizeString(
            req.body.summary,
          );

        if (!summary) {
          res.status(400).json({
            success: false,
            message:
              "Summary cannot be empty.",
          });

          return;
        }

        if (
          summary.length > 500
        ) {
          res.status(400).json({
            success: false,
            message:
              "Summary must not exceed 500 characters.",
          });

          return;
        }

        updateData.summary =
          summary;
      }

      // ------------------------------------------------------
      // DESCRIPTION
      // ------------------------------------------------------

      if (
        req.body.description !==
        undefined
      ) {
        const description =
          normalizeString(
            req.body.description,
          );

        if (!description) {
          res.status(400).json({
            success: false,
            message:
              "Description cannot be empty.",
          });

          return;
        }

        if (
          description.length >
          5000
        ) {
          res.status(400).json({
            success: false,
            message:
              "Description must not exceed 5000 characters.",
          });

          return;
        }

        updateData.description =
          description;
      }

      // ------------------------------------------------------
      // STATE
      // ------------------------------------------------------

      if (
        req.body.state !==
        undefined
      ) {
        const state =
          normalizeString(
            req.body.state,
          );

        if (!state) {
          res.status(400).json({
            success: false,
            message:
              "State cannot be empty.",
          });

          return;
        }

        updateData.state =
          state;
      }

      // ------------------------------------------------------
      // DISTRICT
      // ------------------------------------------------------

      if (
        req.body.district !==
        undefined
      ) {
        const district =
          normalizeString(
            req.body.district,
          );

        if (!district) {
          res.status(400).json({
            success: false,
            message:
              "District cannot be empty.",
          });

          return;
        }

        updateData.district =
          district;
      }

      // ------------------------------------------------------
      // MANDAL
      // ------------------------------------------------------

      if (
        req.body.mandal !==
        undefined
      ) {
        const mandal =
          normalizeString(
            req.body.mandal,
          );

        if (!mandal) {
          res.status(400).json({
            success: false,
            message:
              "Mandal cannot be empty.",
          });

          return;
        }

        updateData.mandal =
          mandal;
      }

      // ------------------------------------------------------
      // VILLAGE
      // ------------------------------------------------------

      if (
        req.body.village !==
        undefined
      ) {
        const village =
          normalizeString(
            req.body.village,
          );

        if (!village) {
          res.status(400).json({
            success: false,
            message:
              "Village cannot be empty.",
          });

          return;
        }

        updateData.village =
          village;
      }

      // ------------------------------------------------------
      // VISIBILITY
      // ------------------------------------------------------

      if (
        req.body.visibility !==
        undefined
      ) {
        const visibility =
          normalizeString(
            req.body.visibility,
          );

        if (
          !isValidVisibility(
            visibility,
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid visibility option.",
          });

          return;
        }

        updateData.visibility =
          visibility;
      }

      // ------------------------------------------------------
      // EVENT DATE
      // ------------------------------------------------------

      if (
        req.body.eventDate !==
        undefined
      ) {
        const eventDate =
          parseEventDate(
            req.body.eventDate,
          );

        if (
          eventDate ===
          undefined
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid event date. Use YYYY-MM-DD.",
          });

          return;
        }

        updateData.eventDate =
          eventDate;
      }

      // ------------------------------------------------------
      // START TIME
      // ------------------------------------------------------

      if (
        req.body.startTime !==
        undefined
      ) {
        updateData.startTime =
          normalizeString(
            req.body.startTime,
          );
      }

      // ------------------------------------------------------
      // END TIME
      // ------------------------------------------------------

      if (
        req.body.endTime !==
        undefined
      ) {
        updateData.endTime =
          normalizeString(
            req.body.endTime,
          );
      }

      // ------------------------------------------------------
      // VENUE
      // ------------------------------------------------------

      if (
        req.body.venue !==
        undefined
      ) {
        updateData.venue =
          normalizeString(
            req.body.venue,
          );
      }

      // ------------------------------------------------------
      // CONTACT
      // ------------------------------------------------------

      if (
        req.body.contactNumber !==
        undefined
      ) {
        updateData.contactNumber =
          normalizeString(
            req.body.contactNumber,
          );
      }

      // ------------------------------------------------------
      // EXTERNAL LINK
      // ------------------------------------------------------

      if (
        req.body.externalLink !==
        undefined
      ) {
        updateData.externalLink =
          normalizeString(
            req.body.externalLink,
          );
      }

      // ------------------------------------------------------
      // IMAGE URL
      // ------------------------------------------------------

      if (
        req.body.imageUrl !==
        undefined
      ) {
        updateData.imageUrl =
          normalizeString(
            req.body.imageUrl,
          );
      }

      // ======================================================
      // GOVERNMENT SCHEME FIELDS
      // ======================================================

      // ------------------------------------------------------
      // ELIGIBILITY
      // ------------------------------------------------------

      if (
        req.body.eligibility !==
        undefined
      ) {
        updateData.eligibility =
          normalizeString(
            req.body.eligibility,
          );
      }

      // ------------------------------------------------------
      // BENEFITS
      // ------------------------------------------------------

      if (
        req.body.benefits !==
        undefined
      ) {
        updateData.benefits =
          normalizeString(
            req.body.benefits,
          );
      }

      // ------------------------------------------------------
      // REQUIRED DOCUMENTS
      // ------------------------------------------------------

      if (
        req.body.requiredDocuments !==
        undefined
      ) {
        updateData.requiredDocuments =
          normalizeStringArray(
            req.body.requiredDocuments,
          );
      }

      // ------------------------------------------------------
      // APPLICATION STEPS
      // ------------------------------------------------------

      if (
        req.body.applicationSteps !==
        undefined
      ) {
        updateData.applicationSteps =
          normalizeStringArray(
            req.body.applicationSteps,
          );
      }

      // ------------------------------------------------------
      // APPLICATION URL
      // ------------------------------------------------------

      if (
        req.body.applicationUrl !==
        undefined
      ) {
        updateData.applicationUrl =
          normalizeString(
            req.body.applicationUrl,
          );
      }

      // ------------------------------------------------------
      // OFFICIAL WEBSITE URL
      // ------------------------------------------------------

      if (
        req.body.officialWebsiteUrl !==
        undefined
      ) {
        updateData.officialWebsiteUrl =
          normalizeString(
            req.body.officialWebsiteUrl,
          );
      }

      // ------------------------------------------------------
      // VIDEO URL
      // ------------------------------------------------------

      if (
        req.body.videoUrl !==
        undefined
      ) {
        updateData.videoUrl =
          normalizeString(
            req.body.videoUrl,
          );
      }

      // ------------------------------------------------------
      // STATUS
      // ------------------------------------------------------

      if (
        req.body.status !==
        undefined
      ) {
        const status =
          normalizeString(
            req.body.status,
          );

        if (
          !isValidStatus(
            status,
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Status must be draft or published.",
          });

          return;
        }

        updateData.status =
          status;
      }

      // ------------------------------------------------------
      // ACTIVE
      // ------------------------------------------------------

      if (
        req.body.isActive !==
        undefined
      ) {
        const isActive =
          parseBoolean(
            req.body.isActive,
          );

        if (
          isActive === undefined
        ) {
          res.status(400).json({
            success: false,
            message:
              "isActive must be true or false.",
          });

          return;
        }

        updateData.isActive =
          isActive;
      }

      // ------------------------------------------------------
      // EXPIRY
      // ------------------------------------------------------

      if (
        req.body.expiresAt !==
        undefined
      ) {
        const expiresAt =
          parseExpiresAt(
            req.body.expiresAt,
          );

        if (
          expiresAt ===
          undefined
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid expiry date.",
          });

          return;
        }

        updateData.expiresAt =
          expiresAt;
      }

      // ------------------------------------------------------
      // DATABASE UPDATE
      // ------------------------------------------------------

      const updated =
        await updateCommunityUpdateRecord(
          updateId,
          volunteerId,
          updateData,
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            "Community update not found.",
        });

        return;
      }

      res.json({
        success: true,

        message:
          "Community update updated successfully.",

        update:
          updated,
      });
    } catch (error) {
      console.error(
        "[UPDATE COMMUNITY UPDATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update community update.",
      });
    }
  };

// ============================================================
// VOLUNTEER - DELETE
//
// DELETE /api/volunteer/community-updates/:id
// ============================================================

export const deleteCommunityUpdate =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const volunteerReq =
        req as VolunteerRequest;

      const volunteerId =
        getVolunteerId(
          volunteerReq,
        );

      if (!volunteerId) {
        res.status(401).json({
          success: false,
          message:
            "Volunteer authentication required.",
        });

        return;
      }

      const updateId =
        parseUpdateId(
          req.params.id,
        );

      if (updateId === null) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update ID.",
        });

        return;
      }

      const deleted =
        await deleteCommunityUpdateRecord(
          updateId,
          volunteerId,
        );

      if (!deleted) {
        res.status(404).json({
          success: false,
          message:
            "Community update not found.",
        });

        return;
      }

      res.json({
        success: true,

        message:
          "Community update deleted successfully.",

        update:
          deleted,
      });
    } catch (error) {
      console.error(
        "[DELETE COMMUNITY UPDATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete community update.",
      });
    }
  };

// ============================================================
// VOLUNTEER - PUBLISH
//
// PATCH /api/volunteer/community-updates/:id/publish
// ============================================================

export const publishCommunityUpdate =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const volunteerReq =
        req as VolunteerRequest;

      const volunteerId =
        getVolunteerId(
          volunteerReq,
        );

      if (!volunteerId) {
        res.status(401).json({
          success: false,
          message:
            "Volunteer authentication required.",
        });

        return;
      }

      const updateId =
        parseUpdateId(
          req.params.id,
        );

      if (updateId === null) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update ID.",
        });

        return;
      }

      const update =
        await publishCommunityUpdateRecord(
          updateId,
          volunteerId,
        );

      if (!update) {
        res.status(404).json({
          success: false,
          message:
            "Community update not found.",
        });

        return;
      }

      res.json({
        success: true,

        message:
          "Community update published successfully.",

        update:
          update,
      });
    } catch (error) {
      console.error(
        "[PUBLISH COMMUNITY UPDATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to publish community update.",
      });
    }
  };

// ============================================================
// VOLUNTEER - UNPUBLISH
//
// PATCH /api/volunteer/community-updates/:id/unpublish
// ============================================================

export const unpublishCommunityUpdate =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const volunteerReq =
        req as VolunteerRequest;

      const volunteerId =
        getVolunteerId(
          volunteerReq,
        );

      if (!volunteerId) {
        res.status(401).json({
          success: false,
          message:
            "Volunteer authentication required.",
        });

        return;
      }

      const updateId =
        parseUpdateId(
          req.params.id,
        );

      if (updateId === null) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update ID.",
        });

        return;
      }

      const update =
        await unpublishCommunityUpdateRecord(
          updateId,
          volunteerId,
        );

      if (!update) {
        res.status(404).json({
          success: false,
          message:
            "Community update not found.",
        });

        return;
      }

      res.json({
        success: true,

        message:
          "Community update unpublished successfully.",

        update:
          update,
      });
    } catch (error) {
      console.error(
        "[UNPUBLISH COMMUNITY UPDATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to unpublish community update.",
      });
    }
  };

// ============================================================
// PUBLIC - LIST
//
// GET /api/community-updates
// ============================================================

export const getPublicCommunityUpdates =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const category =
        normalizeString(
          req.query.category,
        );

      const search =
        normalizeString(
          req.query.search,
        );

      const state =
        normalizeString(
          req.query.state,
        );

      const district =
        normalizeString(
          req.query.district,
        );

      const mandal =
        normalizeString(
          req.query.mandal,
        );

      const village =
        normalizeString(
          req.query.village,
        );

      // ------------------------------------------------------
      // CATEGORY
      // ------------------------------------------------------

      if (
        category &&
        !isValidCategory(
          category,
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update category.",
        });

        return;
      }

      // ------------------------------------------------------
      // PAGINATION
      // ------------------------------------------------------

      const page =
        parsePositiveInteger(
          req.query.page,
          1,
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          20,
          100,
        );

      // ------------------------------------------------------
      // DATABASE
      // ------------------------------------------------------

      const result =
        await getPublicCommunityUpdatesRecord(
          {
            category:
              category
                ? (
                    category as CommunityUpdateCategory
                  )
                : undefined,

            search:
              search
                ? search
                : undefined,

            state:
              state
                ? state
                : undefined,

            district:
              district
                ? district
                : undefined,

            mandal:
              mandal
                ? mandal
                : undefined,

            village:
              village
                ? village
                : undefined,

            page,

            limit,
          },
        );

      const totalPages =
        Math.ceil(
          result.total /
            limit,
        );

      res.json({
        success: true,

        count:
          result.updates
            .length,

        total:
          result.total,

        page,

        limit,

        totalPages,

        hasNextPage:
          page <
          totalPages,

        hasPreviousPage:
          page > 1,

        location: {
          state:
            state || null,

          district:
            district || null,

          mandal:
            mandal || null,

          village:
            village || null,
        },

        updates:
          result.updates,
      });
    } catch (error) {
      console.error(
        "[GET PUBLIC COMMUNITY UPDATES ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load community updates.",
      });
    }
  };

// ============================================================
// PUBLIC - GET SINGLE
//
// GET /api/community-updates/:id
// ============================================================

export const getPublicCommunityUpdateById =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const updateId =
        parseUpdateId(
          req.params.id,
        );

      if (updateId === null) {
        res.status(400).json({
          success: false,
          message:
            "Invalid community update ID.",
        });

        return;
      }

      const state =
        normalizeString(
          req.query.state,
        );

      const district =
        normalizeString(
          req.query.district,
        );

      const mandal =
        normalizeString(
          req.query.mandal,
        );

      const village =
        normalizeString(
          req.query.village,
        );

      const update =
        await getPublicCommunityUpdateRecord(
          updateId,
          {
            state:
              state || undefined,

            district:
              district || undefined,

            mandal:
              mandal || undefined,

            village:
              village || undefined,
          },
        );

      if (!update) {
        res.status(404).json({
          success: false,
          message:
            "Community update not found or is not available in your location.",
        });

        return;
      }

      res.json({
        success: true,
        update,
      });
    } catch (error) {
      console.error(
        "[GET PUBLIC COMMUNITY UPDATE ERROR]",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load community update.",
      });
    }
  };