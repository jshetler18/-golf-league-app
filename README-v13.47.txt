v13.47 - Tee assignment color constraint fix

Fixes the Monthly League Setup save error:
new row for relation "tee_assignments" violates check constraint "tee_color_allowed"

The tee_assignments database constraint now allows every color offered by the
Course Tee Color dropdown:
Turquoise, Red, Green, Yellow, Gray, Blue, Black, Gold, Orange, Purple, White.

The migration has already been applied to the live Supabase project.
No application code changes are required from v13.46.
