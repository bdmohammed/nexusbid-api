import { z } from 'zod';

export const WidgetPositionSchema = z.object({
  widgetId: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  hidden: z.boolean().default(false),
  collapsed: z.boolean().default(false),
});

export const PatchLayoutSchema = z.object({
  widgets: z.array(WidgetPositionSchema),
  theme: z.string().optional(),
});

export type PatchLayoutDto = z.infer<typeof PatchLayoutSchema>;
