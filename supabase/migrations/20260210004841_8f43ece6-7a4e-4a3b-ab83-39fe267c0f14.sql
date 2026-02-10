
ALTER TABLE public.tutor_availability DROP CONSTRAINT tutor_availability_lesson_id_fkey;
ALTER TABLE public.tutor_availability ADD CONSTRAINT tutor_availability_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

ALTER TABLE public.booking_requests DROP CONSTRAINT booking_requests_lesson_id_fkey;
ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_ratings DROP CONSTRAINT lesson_ratings_lesson_id_fkey;
ALTER TABLE public.lesson_ratings ADD CONSTRAINT lesson_ratings_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
