import slugify from 'slugify';

/**
 * Generates a URL-safe slug from a tender title and reference number.
 * Example: "Construction Project NYC" + "2024-001" → "construction-project-nyc-2024-001"
 *
 * The refNumber suffix ensures uniqueness even if two tenders share the same title.
 */
export function generateTenderSlug(title: string, refNumber: string): string {
  const base = slugify(title, {
    lower: true,
    strict: true, // removes non-alphanumeric characters
    trim: true,
  });

  const ref = slugify(refNumber, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Cap the title portion at 60 chars to keep slugs readable
  const truncatedBase = base.slice(0, 60).replace(/-+$/, '');
  return `${truncatedBase}-${ref}`;
}

/**
 * Generates a slug from any string.
 */
export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true });
}
