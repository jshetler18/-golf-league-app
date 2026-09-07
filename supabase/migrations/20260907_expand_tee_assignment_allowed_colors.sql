alter table public.tee_assignments drop constraint if exists tee_color_allowed;

alter table public.tee_assignments
add constraint tee_color_allowed
check (
  lower(tee_color) = any (
    array[
      'turquoise'::text,
      'red'::text,
      'green'::text,
      'yellow'::text,
      'gray'::text,
      'blue'::text,
      'black'::text,
      'gold'::text,
      'orange'::text,
      'purple'::text,
      'white'::text
    ]
  )
);
