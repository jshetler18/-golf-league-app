alter table public.profiles
add column if not exists is_account_approver boolean not null default false;

update public.profiles
set is_account_approver = true,
    updated_at = now()
where lower(coalesce(email,'')) = 'jshetler@lvv1.com';
