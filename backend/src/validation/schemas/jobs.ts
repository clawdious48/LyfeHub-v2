import { z } from 'zod';

export const createJobSchema = z.object({
  job_number: z.string().min(1, 'Job number is required').max(50),
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  customer_phone: z.string().max(50).optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  insurance_company: z.string().max(255).optional(),
  claim_number: z.string().max(100).optional(),
  loss_type: z.string().max(100).optional(),
  notes: z.string().max(10000).optional(),
});

export const updateJobSchema = createJobSchema.partial();

export const updateJobStatusSchema = z.object({
  status: z.enum(['lead', 'scheduled', 'in_progress', 'monitoring', 'review', 'completed', 'invoiced', 'closed', 'cancelled']),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
