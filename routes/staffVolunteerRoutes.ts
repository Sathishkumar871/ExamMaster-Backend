
import { Router } from "express";

import staffAuth from "../middleware/staffAuth";

import {
  /* =======================================================
     VOLUNTEER
  ======================================================= */

  getVolunteerSummary,
  getStaffVolunteers,
  getVolunteerById,
  getVolunteerApprovalHistory,

  approveVolunteer,
  rejectVolunteer,

  getVolunteerVillageUsers,

  /* =======================================================
     USERS
  ======================================================= */

  getAllStaffUsers,
  getStaffUserById,
} from "../controllers/staffVolunteerController";

const router = Router();

/* =========================================================
   STAFF AUTHENTICATION

   Uses your existing staffAuth middleware.

   Allowed roles are handled inside staffAuth:
   staff
   mentor
   manager
   head
   director
========================================================= */

router.use(
  staffAuth,
);

/* =========================================================
   VOLUNTEER SUMMARY

   GET
   /api/staff/volunteers/summary
========================================================= */

router.get(
  "/volunteers/summary",
  getVolunteerSummary,
);

/* =========================================================
   VOLUNTEER APPROVAL HISTORY

   GET
   /api/staff/volunteers/history
========================================================= */

router.get(
  "/volunteers/history",
  getVolunteerApprovalHistory,
);

/* =========================================================
   VOLUNTEER LIST

   GET
   /api/staff/volunteers

   Example:
   /api/staff/volunteers?status=pending
   /api/staff/volunteers?status=approved
   /api/staff/volunteers?status=rejected

   Filters:
   state
   district
   mandal
   village
   search

   Sort:
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

router.get(
  "/volunteers",
  getStaffVolunteers,
);

/* =========================================================
   USERS OF SELECTED VOLUNTEER

   GET
   /api/staff/volunteers/:id/users

   Example:
   /api/staff/volunteers/66abc123/users

   Backend gets the exact:

   state
   district
   mandal
   village

   from the volunteer record.

   Staff does NOT send village manually.
========================================================= */

router.get(
  "/volunteers/:id/users",
  getVolunteerVillageUsers,
);

/* =========================================================
   APPROVE VOLUNTEER

   PATCH
   /api/staff/volunteers/:id/approve

   One active volunteer per exact:

   State
   District
   Mandal
   Village
========================================================= */

router.patch(
  "/volunteers/:id/approve",
  approveVolunteer,
);

/* =========================================================
   REJECT VOLUNTEER

   PATCH
   /api/staff/volunteers/:id/reject
========================================================= */

router.patch(
  "/volunteers/:id/reject",
  rejectVolunteer,
);

/* =========================================================
   SINGLE VOLUNTEER

   GET
   /api/staff/volunteers/:id

   Kept AFTER the more specific volunteer routes.
========================================================= */

router.get(
  "/volunteers/:id",
  getVolunteerById,
);

/* =========================================================
   ALL JANASEVA USERS

   GET
   /api/staff/users

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

   Example:

   /api/staff/users?district=East%20Godavari

   /api/staff/users?district=East%20Godavari&mandal=Korukonda

   /api/staff/users?district=East%20Godavari&mandal=Korukonda&village=Srirangapatnam

   /api/staff/users?sort=nameAsc
========================================================= */

router.get(
  "/users",
  getAllStaffUsers,
);

/* =========================================================
   SINGLE USER

   GET
   /api/staff/users/:id

   Response also includes the currently assigned
   active volunteer for that user's exact village,
   when one exists.
========================================================= */

router.get(
  "/users/:id",
  getStaffUserById,
);

/* =========================================================
   EXPORT
========================================================= */

export default router;

