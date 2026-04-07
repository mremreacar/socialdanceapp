alter table public.instructor_profiles
  drop constraint if exists instructor_profiles_work_mode_check;

alter table public.instructor_profiles
  add constraint instructor_profiles_work_mode_check
  check (
    work_mode in (
      'individual',
      'school',
      'both',
      'Bireysel',
      'Okul / kurum',
      'Her ikisi'
    )
  );
