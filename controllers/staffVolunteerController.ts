
import {
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

import JanasevaVolunteer, {
  VolunteerStatus,
} from "../models/JanasevaVolunteer";

import JanasevaUser from "../models/JanasevaUser";

/* =========================================================
   STAFF REQUEST TYPE
========================================================= */

interface StaffRequest
  extends Request {
  staff?: {
    id?: string;
    teacherId?: string;
    name?: string;
    email?: string;
    mobile?: string;
    role?: string;
    department?: string;
    classId?: string;
    className?: string;
    section?: string;
  };
}

/* =========================================================
   HELPERS
========================================================= */

/* ---------------------------------------------------------
   SAFE STRING
--------------------------------------------------------- */

function getString(
  value: unknown,
): string {
  if (Array.isArray(value)) {
    return String(
      value[0] ?? "",
    ).trim();
  }

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

/* ---------------------------------------------------------
   ESCAPE REGEX
--------------------------------------------------------- */

function escapeRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

function getPage(
  value: unknown,
): number {
  const parsed =
    Number.parseInt(
      getString(value),
      10,
    );

  if (
    !Number.isFinite(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return 1;
  }

  return parsed;
}

/* ---------------------------------------------------------
   LIMIT
--------------------------------------------------------- */

function getLimit(
  value: unknown,
): number {
  const parsed =
    Number.parseInt(
      getString(value),
      10,
    );

  if (
    !Number.isFinite(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return 50;
  }

  return Math.min(
    parsed,
    200,
  );
}

/* ---------------------------------------------------------
   VOLUNTEER STATUS
--------------------------------------------------------- */

function getVolunteerStatus(
  value: unknown,
): VolunteerStatus | null {
  const status =
    getString(value);

  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }

  return null;
}

/* ---------------------------------------------------------
   BOOLEAN
--------------------------------------------------------- */

function getBoolean(
  value: unknown,
): boolean | undefined {
  const normalized =
    getString(value).toLowerCase();

  if (
    normalized === "true"
  ) {
    return true;
  }

  if (
    normalized === "false"
  ) {
    return false;
  }

  return undefined;
}

/* ---------------------------------------------------------
   STAFF AUTH CHECK
--------------------------------------------------------- */

function isStaffAuthenticated(
  req: StaffRequest,
): boolean {
  return Boolean(
    req.staff?.id,
  );
}

/* =========================================================
   FIND EXISTING ACTIVE VOLUNTEER FOR SAME VILLAGE
========================================================= */

async function findExistingVillageVolunteer(
  state: string,
  district: string,
  mandal: string,
  village: string,
  excludeVolunteerId?: string,
) {
  const filter: Record<
    string,
    any
  > = {
    state,
    district,
    mandal,
    village,
    status: "approved",
    isActive: true,
  };

  if (
    excludeVolunteerId &&
    mongoose.Types.ObjectId.isValid(
      excludeVolunteerId,
    )
  ) {
    filter._id = {
      $ne:
        new mongoose.Types.ObjectId(
          excludeVolunteerId,
        ),
    };
  }

  return JanasevaVolunteer.findOne(
    filter,
  )
    .select(
      [
        "_id",
        "name",
        "mobile",
        "state",
        "district",
        "mandal",
        "village",
        "role",
        "status",
        "isActive",
        "approvedBy",
        "approvedAt",
      ].join(" "),
    )
    .lean();
}

/* =========================================================
   COUNT ACTIVE USERS FOR A VILLAGE
========================================================= */

async function countVillageUsers(
  state: string,
  district: string,
  mandal: string,
  village: string,
): Promise<number> {
  return JanasevaUser.countDocuments({
    state,
    district,
    mandal,
    village,
    isActive: true,
  });
}

/* =========================================================
   GET VOLUNTEER SUMMARY
   GET /api/staff/volunteers/summary
========================================================= */

export const getVolunteerSummary =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const [
        pending,
        approved,
        rejected,
        total,
        activeVolunteers,
      ] = await Promise.all([
        JanasevaVolunteer.countDocuments({
          status: "pending",
        }),

        JanasevaVolunteer.countDocuments({
          status: "approved",
        }),

        JanasevaVolunteer.countDocuments({
          status: "rejected",
        }),

        JanasevaVolunteer.countDocuments({}),

        JanasevaVolunteer.countDocuments({
          status: "approved",
          isActive: true,
        }),
      ]);

      /* -----------------------------------------------------
         UNIQUE ACTIVE ASSIGNED VILLAGES
      ----------------------------------------------------- */

      const assignedVillageGroups =
        await JanasevaVolunteer.aggregate([
          {
            $match: {
              status: "approved",
              isActive: true,
            },
          },

          {
            $group: {
              _id: {
                state: "$state",
                district:
                  "$district",
                mandal:
                  "$mandal",
                village:
                  "$village",
              },
            },
          },

          {
            $count: "count",
          },
        ]);

      const assignedVillages =
        assignedVillageGroups[0]
          ?.count ?? 0;

      return res.status(200).json({
        success: true,

        summary: {
          pending,
          approved,
          rejected,
          total,
          activeVolunteers,
          assignedVillages,
        },
      });
    } catch (error) {
      console.error(
        "[VOLUNTEER SUMMARY ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load volunteer summary.",
      });
    }
  };

/* =========================================================
   GET VOLUNTEERS
   GET /api/staff/volunteers

   Query:
   status
   state
   district
   mandal
   village
   search
   sort

   sort:
   newest
   oldest
   nameAsc
   nameDesc
   districtAsc
   districtDesc
   mandalAsc
   mandalDesc
   villageAsc
   villageDesc
========================================================= */

export const getStaffVolunteers =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const status =
        getVolunteerStatus(
          req.query.status,
        );

      /*
       * Existing dashboard expects pending
       * when no status is provided.
       */

      const finalStatus: VolunteerStatus =
        status ?? "pending";

      const state =
        getString(
          req.query.state,
        );

      const district =
        getString(
          req.query.district,
        );

      const mandal =
        getString(
          req.query.mandal,
        );

      const village =
        getString(
          req.query.village,
        );

      const search =
        getString(
          req.query.search,
        );

      const sort =
        getString(
          req.query.sort,
        ) || "newest";

      /* -----------------------------------------------------
         FILTER
      ----------------------------------------------------- */

      const filter: Record<
        string,
        any
      > = {
        status: finalStatus,
      };

      if (state) {
        filter.state = {
          $regex:
            `^${escapeRegex(state)}$`,
          $options: "i",
        };
      }

      if (district) {
        filter.district = {
          $regex:
            `^${escapeRegex(
              district,
            )}$`,
          $options: "i",
        };
      }

      if (mandal) {
        filter.mandal = {
          $regex:
            `^${escapeRegex(
              mandal,
            )}$`,
          $options: "i",
        };
      }

      if (village) {
        filter.village = {
          $regex:
            `^${escapeRegex(
              village,
            )}$`,
          $options: "i",
        };
      }

      if (search) {
        const searchRegex = {
          $regex:
            escapeRegex(
              search,
            ),
          $options: "i",
        };

        filter.$or = [
          {
            name: searchRegex,
          },

          {
            mobile:
              searchRegex,
          },

          {
            district:
              searchRegex,
          },

          {
            mandal:
              searchRegex,
          },

          {
            village:
              searchRegex,
          },
        ];
      }

      /* -----------------------------------------------------
         SORT
      ----------------------------------------------------- */

      let sortObject:
        | Record<
            string,
            1 | -1
          >
        | undefined;

      switch (sort) {
        case "oldest":
          sortObject = {
            createdAt: 1,
          };
          break;

        case "nameAsc":
          sortObject = {
            name: 1,
          };
          break;

        case "nameDesc":
          sortObject = {
            name: -1,
          };
          break;

        case "districtAsc":
          sortObject = {
            district: 1,
            mandal: 1,
            village: 1,
            name: 1,
          };
          break;

        case "districtDesc":
          sortObject = {
            district: -1,
            mandal: -1,
            village: -1,
            name: 1,
          };
          break;

        case "mandalAsc":
          sortObject = {
            mandal: 1,
            village: 1,
            name: 1,
          };
          break;

        case "mandalDesc":
          sortObject = {
            mandal: -1,
            village: -1,
            name: 1,
          };
          break;

        case "villageAsc":
          sortObject = {
            village: 1,
            name: 1,
          };
          break;

        case "villageDesc":
          sortObject = {
            village: -1,
            name: 1,
          };
          break;

        case "newest":
        default:
          sortObject = {
            createdAt: -1,
          };
          break;
      }

      /* -----------------------------------------------------
         FIND VOLUNTEERS
      ----------------------------------------------------- */

      const volunteers =
        await JanasevaVolunteer.find(
          filter,
        )
          .select(
            "-password -sessions",
          )
          .sort(
            sortObject,
          )
          .lean();

      /* -----------------------------------------------------
         ADD VILLAGE DATA
      ----------------------------------------------------- */

      const volunteersWithVillageInfo =
        await Promise.all(
          volunteers.map(
            async (
              volunteer,
            ) => {
              const villageUsersCount =
                await countVillageUsers(
                  volunteer.state,
                  volunteer.district,
                  volunteer.mandal,
                  volunteer.village,
                );

              const existingVolunteer =
                await findExistingVillageVolunteer(
                  volunteer.state,
                  volunteer.district,
                  volunteer.mandal,
                  volunteer.village,
                  volunteer._id.toString(),
                );

              return {
                ...volunteer,

                villageUsersCount,

                villageAlreadyAssigned:
                  Boolean(
                    existingVolunteer,
                  ),

                existingVillageVolunteer:
                  existingVolunteer
                    ? {
                        id:
                          existingVolunteer._id.toString(),

                        name:
                          existingVolunteer.name,

                        mobile:
                          existingVolunteer.mobile,

                        approvedAt:
                          existingVolunteer.approvedAt,
                      }
                    : null,
              };
            },
          ),
        );

      return res.status(200).json({
        success: true,

        count:
          volunteersWithVillageInfo.length,

        status:
          finalStatus,

        filters: {
          state:
            state || null,

          district:
            district || null,

          mandal:
            mandal || null,

          village:
            village || null,

          search:
            search || null,
        },

        sort,

        volunteers:
          volunteersWithVillageInfo,
      });
    } catch (error) {
      console.error(
        "[GET STAFF VOLUNTEERS ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load volunteers.",
      });
    }
  };

/* =========================================================
   GET SINGLE VOLUNTEER
   GET /api/staff/volunteers/:id
========================================================= */

export const getVolunteerById =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const id =
        getString(
          req.params.id,
        );

      if (
        !id ||
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid volunteer ID.",
        });
      }

      const volunteer =
        await JanasevaVolunteer.findById(
          id,
        )
          .select(
            "-password -sessions",
          )
          .lean();

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          message:
            "Volunteer not found.",
        });
      }

      const villageUsersCount =
        await countVillageUsers(
          volunteer.state,
          volunteer.district,
          volunteer.mandal,
          volunteer.village,
        );

      const existingVolunteer =
        await findExistingVillageVolunteer(
          volunteer.state,
          volunteer.district,
          volunteer.mandal,
          volunteer.village,
          volunteer._id.toString(),
        );

      return res.status(200).json({
        success: true,

        volunteer: {
          ...volunteer,

          villageUsersCount,

          villageAlreadyAssigned:
            Boolean(
              existingVolunteer,
            ),

          existingVillageVolunteer:
            existingVolunteer
              ? {
                  id:
                    existingVolunteer._id.toString(),

                  name:
                    existingVolunteer.name,

                  mobile:
                    existingVolunteer.mobile,

                  approvedAt:
                    existingVolunteer.approvedAt,
                }
              : null,
        },
      });
    } catch (error) {
      console.error(
        "[GET VOLUNTEER ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load volunteer.",
      });
    }
  };

/* =========================================================
   VOLUNTEER APPROVAL HISTORY
   GET /api/staff/volunteers/history

   NOTE:
   This returns the current stored approval/rejection
   information.

   A permanent multi-action audit history will require
   a statusHistory[] field in JanasevaVolunteer.
========================================================= */

export const getVolunteerApprovalHistory =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const volunteers =
        await JanasevaVolunteer.find({
          status: {
            $in: [
              "approved",
              "rejected",
            ],
          },
        })
          .select(
            [
              "_id",
              "name",
              "mobile",
              "state",
              "district",
              "mandal",
              "village",
              "status",
              "isActive",
              "approvedBy",
              "approvedAt",
              "rejectedBy",
              "rejectedAt",
              "rejectionReason",
              "createdAt",
              "updatedAt",
            ].join(" "),
          )
          .sort({
            updatedAt: -1,
          })
          .lean();

      const history =
        volunteers.map(
          (
            volunteer,
          ) => ({
            id:
              volunteer._id.toString(),

            name:
              volunteer.name,

            mobile:
              volunteer.mobile,

            state:
              volunteer.state,

            district:
              volunteer.district,

            mandal:
              volunteer.mandal,

            village:
              volunteer.village,

            status:
              volunteer.status,

            isActive:
              volunteer.isActive,

            approvedBy:
              volunteer.approvedBy
                ? volunteer.approvedBy.toString()
                : undefined,

            approvedAt:
              volunteer.approvedAt,

            rejectedBy:
              volunteer.rejectedBy
                ? volunteer.rejectedBy.toString()
                : undefined,

            rejectedAt:
              volunteer.rejectedAt,

            rejectionReason:
              volunteer.rejectionReason,

            registeredAt:
              volunteer.createdAt,

            lastUpdatedAt:
              volunteer.updatedAt,

            actionDate:
              volunteer.status ===
              "approved"
                ? volunteer.approvedAt
                : volunteer.rejectedAt,
          }),
        );

      return res.status(200).json({
        success: true,

        count:
          history.length,

        history,
      });
    } catch (error) {
      console.error(
        "[VOLUNTEER HISTORY ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load volunteer history.",
      });
    }
  };

/* =========================================================
   APPROVE VOLUNTEER

   PATCH /api/staff/volunteers/:id/approve

   ONE ACTIVE VOLUNTEER PER:
   State + District + Mandal + Village
========================================================= */

export const approveVolunteer =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const id =
        getString(
          req.params.id,
        );

      if (
        !id ||
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid volunteer ID.",
        });
      }

      const staffId =
        req.staff?.id;

      if (!staffId) {
        return res.status(401).json({
          success: false,
          message:
            "Staff identity not found.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          staffId,
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid staff identity.",
        });
      }

      const volunteer =
        await JanasevaVolunteer.findById(
          id,
        );

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          message:
            "Volunteer not found.",
        });
      }

      /* -----------------------------------------------------
         ALREADY APPROVED + ACTIVE
      ----------------------------------------------------- */

      if (
        volunteer.status ===
          "approved" &&
        volunteer.isActive === true
      ) {
        return res.status(400).json({
          success: false,

          code:
            "VOLUNTEER_ALREADY_APPROVED",

          message:
            "Volunteer is already approved and active.",

          volunteer: {
            id:
              volunteer._id.toString(),

            name:
              volunteer.name,

            district:
              volunteer.district,

            mandal:
              volunteer.mandal,

            village:
              volunteer.village,

            status:
              volunteer.status,

            isActive:
              volunteer.isActive,

            approvedAt:
              volunteer.approvedAt,
          },
        });
      }

      /* -----------------------------------------------------
         LOCATION
      ----------------------------------------------------- */

      const state =
        volunteer.state?.trim();

      const district =
        volunteer.district?.trim();

      const mandal =
        volunteer.mandal?.trim();

      const village =
        volunteer.village?.trim();

      if (
        !state ||
        !district ||
        !mandal ||
        !village
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Volunteer location information is incomplete.",
        });
      }

      /* -----------------------------------------------------
         CHECK EXISTING ACTIVE VILLAGE OWNER
      ----------------------------------------------------- */

      const existingVolunteer =
        await findExistingVillageVolunteer(
          state,
          district,
          mandal,
          village,
          volunteer._id.toString(),
        );

      if (
        existingVolunteer
      ) {
        return res.status(409).json({
          success: false,

          code:
            "VILLAGE_ALREADY_ASSIGNED",

          message:
            "This village already has an approved active volunteer.",

          village: {
            state,
            district,
            mandal,
            village,
          },

          existingVolunteer: {
            id:
              existingVolunteer._id.toString(),

            name:
              existingVolunteer.name,

            mobile:
              existingVolunteer.mobile,

            approvedAt:
              existingVolunteer.approvedAt,

            status:
              existingVolunteer.status,

            isActive:
              existingVolunteer.isActive,
          },

          requestedVolunteer: {
            id:
              volunteer._id.toString(),

            name:
              volunteer.name,

            mobile:
              volunteer.mobile,

            status:
              volunteer.status,
          },
        });
      }

      /* -----------------------------------------------------
         APPROVE
      ----------------------------------------------------- */

      volunteer.status =
        "approved";

      volunteer.isActive =
        true;

      volunteer.approvedBy =
        new mongoose.Types.ObjectId(
          staffId,
        );

      volunteer.approvedAt =
        new Date();

      /* -----------------------------------------------------
         CLEAR REJECTION DATA
      ----------------------------------------------------- */

      volunteer.rejectedBy =
        undefined;

      volunteer.rejectedAt =
        undefined;

      volunteer.rejectionReason =
        undefined;

      await volunteer.save();

      /* -----------------------------------------------------
         CURRENT VILLAGE USER COUNT
      ----------------------------------------------------- */

      const villageUsersCount =
        await countVillageUsers(
          state,
          district,
          mandal,
          village,
        );

      return res.status(200).json({
        success: true,

        message:
          "Volunteer approved successfully.",

        volunteer: {
          id:
            volunteer._id.toString(),

          name:
            volunteer.name,

          mobile:
            volunteer.mobile,

          state:
            volunteer.state,

          district:
            volunteer.district,

          mandal:
            volunteer.mandal,

          village:
            volunteer.village,

          status:
            volunteer.status,

          isActive:
            volunteer.isActive,

          approvedBy:
            volunteer.approvedBy
              ? volunteer.approvedBy.toString()
              : undefined,

          approvedAt:
            volunteer.approvedAt,

          villageUsersCount,
        },
      });
    } catch (error) {
      console.error(
        "[APPROVE VOLUNTEER ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to approve volunteer.",
      });
    }
  };

/* =========================================================
   REJECT VOLUNTEER

   PATCH /api/staff/volunteers/:id/reject
========================================================= */

export const rejectVolunteer =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const id =
        getString(
          req.params.id,
        );

      if (
        !id ||
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid volunteer ID.",
        });
      }

      const staffId =
        req.staff?.id;

      if (!staffId) {
        return res.status(401).json({
          success: false,
          message:
            "Staff identity not found.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          staffId,
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid staff identity.",
        });
      }

      const reason =
        String(
          req.body?.reason ??
            "",
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason is required.",
        });
      }

      if (
        reason.length > 500
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason cannot exceed 500 characters.",
        });
      }

      const volunteer =
        await JanasevaVolunteer.findById(
          id,
        );

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          message:
            "Volunteer not found.",
        });
      }

      /* -----------------------------------------------------
         REJECT
      ----------------------------------------------------- */

      volunteer.status =
        "rejected";

      volunteer.isActive =
        false;

      volunteer.rejectedBy =
        new mongoose.Types.ObjectId(
          staffId,
        );

      volunteer.rejectedAt =
        new Date();

      volunteer.rejectionReason =
        reason;

      /* -----------------------------------------------------
         CLEAR APPROVAL DATA
      ----------------------------------------------------- */

      volunteer.approvedBy =
        undefined;

      volunteer.approvedAt =
        undefined;

      await volunteer.save();

      return res.status(200).json({
        success: true,

        message:
          "Volunteer rejected successfully.",

        volunteer: {
          id:
            volunteer._id.toString(),

          name:
            volunteer.name,

          mobile:
            volunteer.mobile,

          state:
            volunteer.state,

          district:
            volunteer.district,

          mandal:
            volunteer.mandal,

          village:
            volunteer.village,

          status:
            volunteer.status,

          isActive:
            volunteer.isActive,

          rejectionReason:
            volunteer.rejectionReason,

          rejectedBy:
            volunteer.rejectedBy
              ? volunteer.rejectedBy.toString()
              : undefined,

          rejectedAt:
            volunteer.rejectedAt,
        },
      });
    } catch (error) {
      console.error(
        "[REJECT VOLUNTEER ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to reject volunteer.",
      });
    }
  };

/* =========================================================
   GET USERS OF SELECTED VOLUNTEER

   GET
   /api/staff/volunteers/:id/users

   The volunteer record is the source of truth for:

   State
   District
   Mandal
   Village
========================================================= */

export const getVolunteerVillageUsers =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const volunteerId =
        getString(
          req.params.id,
        );

      if (
        !volunteerId ||
        !mongoose.Types.ObjectId.isValid(
          volunteerId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid volunteer ID.",
        });
      }

      /* -----------------------------------------------------
         FIND VOLUNTEER
      ----------------------------------------------------- */

      const volunteer =
        await JanasevaVolunteer.findById(
          volunteerId,
        )
          .select(
            [
              "_id",
              "name",
              "mobile",
              "state",
              "district",
              "mandal",
              "village",
              "role",
              "status",
              "isActive",
              "approvedAt",
            ].join(" "),
          )
          .lean();

      if (!volunteer) {
        return res.status(404).json({
          success: false,
          message:
            "Volunteer not found.",
        });
      }

      /* -----------------------------------------------------
         APPROVAL CHECK
      ----------------------------------------------------- */

      if (
        volunteer.status !==
        "approved"
      ) {
        return res.status(403).json({
          success: false,

          code:
            "VOLUNTEER_NOT_APPROVED",

          message:
            "Users can only be viewed for an approved volunteer.",
        });
      }

      /* -----------------------------------------------------
         ACTIVE CHECK
      ----------------------------------------------------- */

      if (
        volunteer.isActive !==
        true
      ) {
        return res.status(403).json({
          success: false,

          code:
            "VOLUNTEER_INACTIVE",

          message:
            "This volunteer is inactive.",
        });
      }

      /* -----------------------------------------------------
         LOCATION
      ----------------------------------------------------- */

      const state =
        volunteer.state?.trim();

      const district =
        volunteer.district?.trim();

      const mandal =
        volunteer.mandal?.trim();

      const village =
        volunteer.village?.trim();

      if (
        !state ||
        !district ||
        !mandal ||
        !village
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Volunteer location information is incomplete.",
        });
      }

      /* -----------------------------------------------------
         FIND USERS IN EXACT VILLAGE
      ----------------------------------------------------- */

      const users =
        await JanasevaUser.find({
          state,
          district,
          mandal,
          village,
          isActive: true,
        })
          .select(
            [
              "_id",
              "name",
              "mobile",
              "state",
              "district",
              "mandal",
              "village",
              "role",
              "isActive",
              "notificationEnabled",
              "language",
              "createdAt",
              "updatedAt",
            ].join(" "),
          )
          .sort({
            name: 1,
          })
          .lean();

      return res.status(200).json({
        success: true,

        message:
          "Volunteer village users fetched successfully.",

        volunteer: {
          id:
            volunteer._id.toString(),

          name:
            volunteer.name,

          mobile:
            volunteer.mobile,

          state:
            volunteer.state,

          district:
            volunteer.district,

          mandal:
            volunteer.mandal,

          village:
            volunteer.village,

          role:
            volunteer.role,

          status:
            volunteer.status,

          isActive:
            volunteer.isActive,

          approvedAt:
            volunteer.approvedAt,
        },

        location: {
          state,
          district,
          mandal,
          village,
        },

        count:
          users.length,

        users:
          users.map(
            (user) => ({
              id:
                user._id.toString(),

              name:
                user.name,

              mobile:
                user.mobile,

              state:
                user.state,

              district:
                user.district,

              mandal:
                user.mandal,

              village:
                user.village,

              role:
                user.role,

              isActive:
                user.isActive,

              notificationEnabled:
                user.notificationEnabled,

              language:
                user.language,

              createdAt:
                user.createdAt,

              updatedAt:
                user.updatedAt,
            }),
          ),
      });
    } catch (error) {
      console.error(
        "[GET VOLUNTEER VILLAGE USERS ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load users for this volunteer.",
      });
    }
  };

/* =========================================================
   GET ALL JANASEVA USERS FOR STAFF

   GET /api/staff/users

   Query:
   state
   district
   mandal
   village
   search
   isActive
   sort
   page
   limit

   sort:
   newest
   oldest
   nameAsc
   nameDesc
   districtAsc
   districtDesc
   mandalAsc
   mandalDesc
   villageAsc
   villageDesc
========================================================= */

export const getAllStaffUsers =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const state =
        getString(
          req.query.state,
        );

      const district =
        getString(
          req.query.district,
        );

      const mandal =
        getString(
          req.query.mandal,
        );

      const village =
        getString(
          req.query.village,
        );

      const search =
        getString(
          req.query.search,
        );

      const isActive =
        getBoolean(
          req.query.isActive,
        );

      const sort =
        getString(
          req.query.sort,
        ) || "newest";

      const page =
        getPage(
          req.query.page,
        );

      const limit =
        getLimit(
          req.query.limit,
        );

      /* -----------------------------------------------------
         BUILD FILTER
      ----------------------------------------------------- */

      const filter: Record<
        string,
        any
      > = {};

      if (state) {
        filter.state = {
          $regex:
            `^${escapeRegex(state)}$`,
          $options: "i",
        };
      }

      if (district) {
        filter.district = {
          $regex:
            `^${escapeRegex(
              district,
            )}$`,
          $options: "i",
        };
      }

      if (mandal) {
        filter.mandal = {
          $regex:
            `^${escapeRegex(
              mandal,
            )}$`,
          $options: "i",
        };
      }

      if (village) {
        filter.village = {
          $regex:
            `^${escapeRegex(
              village,
            )}$`,
          $options: "i",
        };
      }

      if (
        isActive !==
        undefined
      ) {
        filter.isActive =
          isActive;
      }

      /* -----------------------------------------------------
         SEARCH
      ----------------------------------------------------- */

      if (search) {
        const searchRegex = {
          $regex:
            escapeRegex(
              search,
            ),
          $options: "i",
        };

        filter.$or = [
          {
            name: searchRegex,
          },

          {
            mobile:
              searchRegex,
          },

          {
            state:
              searchRegex,
          },

          {
            district:
              searchRegex,
          },

          {
            mandal:
              searchRegex,
          },

          {
            village:
              searchRegex,
          },
        ];
      }

      /* -----------------------------------------------------
         SORT
      ----------------------------------------------------- */

      let sortObject:
        | Record<
            string,
            1 | -1
          >
        | undefined;

      switch (sort) {
        case "oldest":
          sortObject = {
            createdAt: 1,
          };
          break;

        case "nameAsc":
          sortObject = {
            name: 1,
          };
          break;

        case "nameDesc":
          sortObject = {
            name: -1,
          };
          break;

        case "districtAsc":
          sortObject = {
            district: 1,
            mandal: 1,
            village: 1,
            name: 1,
          };
          break;

        case "districtDesc":
          sortObject = {
            district: -1,
            mandal: -1,
            village: -1,
            name: 1,
          };
          break;

        case "mandalAsc":
          sortObject = {
            mandal: 1,
            village: 1,
            name: 1,
          };
          break;

        case "mandalDesc":
          sortObject = {
            mandal: -1,
            village: -1,
            name: 1,
          };
          break;

        case "villageAsc":
          sortObject = {
            village: 1,
            name: 1,
          };
          break;

        case "villageDesc":
          sortObject = {
            village: -1,
            name: 1,
          };
          break;

        case "newest":
        default:
          sortObject = {
            createdAt: -1,
          };
          break;
      }

      /* -----------------------------------------------------
         PAGINATION
      ----------------------------------------------------- */

      const skip =
        (page - 1) *
        limit;

      /* -----------------------------------------------------
         FETCH
      ----------------------------------------------------- */

      const [
        users,
        total,
      ] = await Promise.all([
        JanasevaUser.find(
          filter,
        )
          .select(
            [
              "_id",
              "name",
              "mobile",
              "state",
              "district",
              "mandal",
              "village",
              "role",
              "isActive",
              "notificationEnabled",
              "language",
              "createdAt",
              "updatedAt",
            ].join(" "),
          )
          .sort(
            sortObject,
          )
          .skip(skip)
          .limit(limit)
          .lean(),

        JanasevaUser.countDocuments(
          filter,
        ),
      ]);

      const totalPages =
        Math.ceil(
          total / limit,
        );

      return res.status(200).json({
        success: true,

        count:
          users.length,

        filters: {
          state:
            state || null,

          district:
            district || null,

          mandal:
            mandal || null,

          village:
            village || null,

          isActive:
            isActive ??
            null,

          search:
            search || null,
        },

        sort,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasNextPage:
            page <
            totalPages,

          hasPreviousPage:
            page > 1,
        },

        users,
      });
    } catch (error) {
      console.error(
        "[GET ALL STAFF USERS ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load users.",
      });
    }
  };

/* =========================================================
   GET SINGLE USER FOR STAFF

   GET /api/staff/users/:id
========================================================= */

export const getStaffUserById =
  async (
    req: StaffRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (
        !isStaffAuthenticated(req)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Staff authentication required.",
        });
      }

      const id =
        getString(
          req.params.id,
        );

      if (
        !id ||
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const user =
        await JanasevaUser.findById(
          id,
        )
          .select(
            [
              "_id",
              "name",
              "mobile",
              "state",
              "district",
              "mandal",
              "village",
              "role",
              "isActive",
              "notificationEnabled",
              "language",
              "createdAt",
              "updatedAt",
            ].join(" "),
          )
          .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      /* -----------------------------------------------------
         FIND CURRENT ACTIVE VOLUNTEER
         FOR THE USER'S EXACT LOCATION
      ----------------------------------------------------- */

      const volunteer =
        await findExistingVillageVolunteer(
          user.state,
          user.district,
          user.mandal,
          user.village,
        );

      return res.status(200).json({
        success: true,

        user,

        assignedVolunteer:
          volunteer
            ? {
                id:
                  volunteer._id.toString(),

                name:
                  volunteer.name,

                mobile:
                  volunteer.mobile,

                state:
                  volunteer.state,

                district:
                  volunteer.district,

                mandal:
                  volunteer.mandal,

                village:
                  volunteer.village,

                approvedAt:
                  volunteer.approvedAt,

                status:
                  volunteer.status,

                isActive:
                  volunteer.isActive,
              }
            : null,
      });
    } catch (error) {
      console.error(
        "[GET STAFF USER ERROR]",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load user details.",
      });
    }
  };

