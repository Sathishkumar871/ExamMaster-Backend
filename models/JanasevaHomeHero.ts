
import { postgresPool } from "../config/postgres";

/* =========================================================
   HERO MODEL
========================================================= */

export interface JanasevaHomeHero {
  id: number;

  badge: string;
  title: string;
  description: string;

  image_url: string;

  icon: string;

  action_text: string;
  action_type: string;
  action_value: string;

  is_active: boolean;
  display_order: number;

  created_at: Date;
  updated_at: Date;
}

/* =========================================================
   CREATE HERO INPUT
========================================================= */

export interface CreateJanasevaHomeHeroInput {
  badge?: string;
  title: string;
  description: string;

  imageUrl?: string;

  icon?: string;

  actionText?: string;
  actionType?: string;
  actionValue?: string;

  isActive?: boolean;
  displayOrder?: number;
}

/* =========================================================
   UPDATE HERO INPUT
========================================================= */

export interface UpdateJanasevaHomeHeroInput {
  badge?: string;
  title?: string;
  description?: string;

  imageUrl?: string;

  icon?: string;

  actionText?: string;
  actionType?: string;
  actionValue?: string;

  isActive?: boolean;
  displayOrder?: number;
}

/* =========================================================
   API RESPONSE
========================================================= */

export interface HomeHeroApiResponse {
  success: boolean;
  message?: string;
  count?: number;
  data?: JanasevaHomeHero | JanasevaHomeHero[];
}

/* =========================================================
   GET ACTIVE HERO SLIDES
========================================================= */

export async function findActiveHeroSlides(): Promise<
  JanasevaHomeHero[]
> {
  const result = await postgresPool.query<JanasevaHomeHero>(`
    SELECT
      id,
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order,
      created_at,
      updated_at
    FROM home_hero_slides
    WHERE is_active = TRUE
    ORDER BY display_order ASC, id ASC
  `);

  return result.rows;
}

/* =========================================================
   GET ALL HERO SLIDES
========================================================= */

export async function findAllHeroSlides(): Promise<
  JanasevaHomeHero[]
> {
  const result = await postgresPool.query<JanasevaHomeHero>(`
    SELECT
      id,
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order,
      created_at,
      updated_at
    FROM home_hero_slides
    ORDER BY display_order ASC, id ASC
  `);

  return result.rows;
}

/* =========================================================
   GET ONE HERO SLIDE
========================================================= */

export async function findHeroSlideById(
  id: number
): Promise<JanasevaHomeHero | null> {
  const result = await postgresPool.query<JanasevaHomeHero>(
    `
    SELECT
      id,
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order,
      created_at,
      updated_at
    FROM home_hero_slides
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

/* =========================================================
   CREATE HERO SLIDE
========================================================= */

export async function createHeroSlide(
  input: CreateJanasevaHomeHeroInput
): Promise<JanasevaHomeHero> {
  const result = await postgresPool.query<JanasevaHomeHero>(
    `
    INSERT INTO home_hero_slides (
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order
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
      $10
    )
    RETURNING
      id,
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order,
      created_at,
      updated_at
    `,
    [
      input.badge ?? "",
      input.title ?? "",
      input.description ?? "",
      input.imageUrl ?? "",
      input.icon ?? "people_alt_outlined",
      input.actionText ?? "",
      input.actionType ?? "info",
      input.actionValue ?? "",
      input.isActive ?? true,
      input.displayOrder ?? 0,
    ]
  );

  return result.rows[0];
}

/* =========================================================
   UPDATE HERO SLIDE
========================================================= */

export async function updateHeroSlide(
  id: number,
  input: UpdateJanasevaHomeHeroInput
): Promise<JanasevaHomeHero | null> {
  const result = await postgresPool.query<JanasevaHomeHero>(
    `
    UPDATE home_hero_slides
    SET
      badge = COALESCE($1, badge),
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      image_url = COALESCE($4, image_url),
      icon = COALESCE($5, icon),
      action_text = COALESCE($6, action_text),
      action_type = COALESCE($7, action_type),
      action_value = COALESCE($8, action_value),
      is_active = COALESCE($9, is_active),
      display_order = COALESCE($10, display_order),
      updated_at = NOW()
    WHERE id = $11
    RETURNING
      id,
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order,
      created_at,
      updated_at
    `,
    [
      input.badge,
      input.title,
      input.description,
      input.imageUrl,
      input.icon,
      input.actionText,
      input.actionType,
      input.actionValue,
      input.isActive,
      input.displayOrder,
      id,
    ]
  );

  return result.rows[0] ?? null;
}

/* =========================================================
   TOGGLE HERO ACTIVE / INACTIVE
========================================================= */

export async function toggleHeroSlide(
  id: number
): Promise<JanasevaHomeHero | null> {
  const result = await postgresPool.query<JanasevaHomeHero>(
    `
    UPDATE home_hero_slides
    SET
      is_active = NOT is_active,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order,
      created_at,
      updated_at
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

/* =========================================================
   UPDATE DISPLAY ORDER
========================================================= */

export async function updateHeroSlideOrder(
  id: number,
  displayOrder: number
): Promise<JanasevaHomeHero | null> {
  const result = await postgresPool.query<JanasevaHomeHero>(
    `
    UPDATE home_hero_slides
    SET
      display_order = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING
      id,
      badge,
      title,
      description,
      image_url,
      icon,
      action_text,
      action_type,
      action_value,
      is_active,
      display_order,
      created_at,
      updated_at
    `,
    [displayOrder, id]
  );

  return result.rows[0] ?? null;
}

/* =========================================================
   DELETE HERO SLIDE
========================================================= */

export async function deleteHeroSlide(
  id: number
): Promise<boolean> {
  const result = await postgresPool.query(
    `
    DELETE FROM home_hero_slides
    WHERE id = $1
    `,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
}

