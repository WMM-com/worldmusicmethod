
-- Add moderation columns
ALTER TABLE reviews 
ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Fast lookup for admin
CREATE INDEX idx_reviews_status ON reviews(status);

-- Add who approved it
ALTER TABLE reviews ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- Allow admins to read/update all reviews
CREATE POLICY "Admins can read all reviews"
ON reviews FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update any review"
ON reviews FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete any review"
ON reviews FOR DELETE
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
