v13.64 - Build fix for course location

Fixes the Vercel TypeScript error:
Property 'course_location' does not exist on type 'Month'.

- Added course_location:string|null to the Month TypeScript type in app/admin/monthly-setup.tsx.
- Preserves all v13.63 functionality.
