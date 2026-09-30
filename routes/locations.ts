import { Router, Request, Response } from "express";
import { postgresPool } from "../config/postgres";

const router = Router();

// ============================================================
// GET STATES
// GET /api/locations/states
//
// Flutter currently calls this API.
// Andhra Pradesh is stored internally,
// but Flutter can still receive it.
// ============================================================

router.get(
  "/states",
  async (_req: Request, res: Response) => {
    try {
      const result = await postgresPool.query(
        `
        SELECT
          id,
          name
        FROM states
        ORDER BY name ASC;
        `
      );

      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(
        "❌ GET STATES ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to load states.",
      });
    }
  }
);

// ============================================================
// GET DISTRICTS
// GET /api/locations/districts?state=Andhra%20Pradesh
// ============================================================

router.get(
  "/districts",
  async (req: Request, res: Response) => {
    try {
      const state = String(
        req.query.state ?? ""
      ).trim();

      if (!state) {
        return res.status(400).json({
          success: false,
          message: "State is required.",
        });
      }

      const result =
        await postgresPool.query(
          `
          SELECT
            d.id,
            d.name
          FROM districts d
          INNER JOIN states s
            ON s.id = d.state_id
          WHERE LOWER(s.name) = LOWER($1)
          ORDER BY d.name ASC;
          `,
          [state]
        );

      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(
        "❌ GET DISTRICTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load districts.",
      });
    }
  }
);

// ============================================================
// GET MANDALS
// GET /api/locations/mandals
// ?state=Andhra%20Pradesh
// &district=East%20Godavari
// ============================================================

router.get(
  "/mandals",
  async (req: Request, res: Response) => {
    try {
      const state = String(
        req.query.state ?? ""
      ).trim();

      const district = String(
        req.query.district ?? ""
      ).trim();

      if (!state) {
        return res.status(400).json({
          success: false,
          message: "State is required.",
        });
      }

      if (!district) {
        return res.status(400).json({
          success: false,
          message:
            "District is required.",
        });
      }

      const result =
        await postgresPool.query(
          `
          SELECT
            m.id,
            m.name
          FROM mandals m
          INNER JOIN districts d
            ON d.id = m.district_id
          INNER JOIN states s
            ON s.id = d.state_id
          WHERE LOWER(s.name) = LOWER($1)
            AND LOWER(d.name) = LOWER($2)
          ORDER BY m.name ASC;
          `,
          [
            state,
            district,
          ]
        );

      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(
        "❌ GET MANDALS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to load mandals.",
      });
    }
  }
);

// ============================================================
// GET VILLAGES
// GET /api/locations/villages
// ?state=Andhra%20Pradesh
// &district=East%20Godavari
// &mandal=Korukonda
// ============================================================

router.get(
  "/villages",
  async (req: Request, res: Response) => {
    try {
      const state = String(
        req.query.state ?? ""
      ).trim();

      const district = String(
        req.query.district ?? ""
      ).trim();

      const mandal = String(
        req.query.mandal ?? ""
      ).trim();

      if (!state) {
        return res.status(400).json({
          success: false,
          message: "State is required.",
        });
      }

      if (!district) {
        return res.status(400).json({
          success: false,
          message:
            "District is required.",
        });
      }

      if (!mandal) {
        return res.status(400).json({
          success: false,
          message:
            "Mandal is required.",
        });
      }

      const result =
        await postgresPool.query(
          `
          SELECT
            v.id,
            v.name
          FROM villages v
          INNER JOIN mandals m
            ON m.id = v.mandal_id
          INNER JOIN districts d
            ON d.id = m.district_id
          INNER JOIN states s
            ON s.id = d.state_id
          WHERE LOWER(s.name) = LOWER($1)
            AND LOWER(d.name) = LOWER($2)
            AND LOWER(m.name) = LOWER($3)
          ORDER BY v.name ASC;
          `,
          [
            state,
            district,
            mandal,
          ]
        );

      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(
        "❌ GET VILLAGES ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load villages.",
      });
    }
  }
);

// ============================================================
// GET URBAN AREAS
// GET /api/locations/urban-areas
// ?state=Andhra%20Pradesh
// &district=East%20Godavari
// &mandal=Rajahmundry%20Urban
// ============================================================

router.get(
  "/urban-areas",
  async (req: Request, res: Response) => {
    try {
      const state = String(
        req.query.state ?? ""
      ).trim();

      const district = String(
        req.query.district ?? ""
      ).trim();

      const mandal = String(
        req.query.mandal ?? ""
      ).trim();

      if (!state) {
        return res.status(400).json({
          success: false,
          message: "State is required.",
        });
      }

      if (!district) {
        return res.status(400).json({
          success: false,
          message:
            "District is required.",
        });
      }

      if (!mandal) {
        return res.status(400).json({
          success: false,
          message:
            "Mandal is required.",
        });
      }

      const result =
        await postgresPool.query(
          `
          SELECT
            u.id,
            u.name
          FROM urban_areas u
          INNER JOIN mandals m
            ON m.id = u.mandal_id
          INNER JOIN districts d
            ON d.id = m.district_id
          INNER JOIN states s
            ON s.id = d.state_id
          WHERE LOWER(s.name) = LOWER($1)
            AND LOWER(d.name) = LOWER($2)
            AND LOWER(m.name) = LOWER($3)
          ORDER BY u.name ASC;
          `,
          [
            state,
            district,
            mandal,
          ]
        );

      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(
        "❌ GET URBAN AREAS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load urban areas.",
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

export default router;