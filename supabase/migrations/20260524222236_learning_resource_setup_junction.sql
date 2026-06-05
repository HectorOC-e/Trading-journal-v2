
CREATE TABLE IF NOT EXISTS "_ResourceSetups" (
  "A" UUID NOT NULL,
  "B" UUID NOT NULL,
  CONSTRAINT "_ResourceSetups_AB_pkey" PRIMARY KEY ("A", "B"),
  CONSTRAINT "_ResourceSetups_A_fkey" FOREIGN KEY ("A")
    REFERENCES learning_resources(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_ResourceSetups_B_fkey" FOREIGN KEY ("B")
    REFERENCES setups(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "_ResourceSetups_AB_unique" ON "_ResourceSetups"("A", "B");
CREATE INDEX IF NOT EXISTS "_ResourceSetups_B_index" ON "_ResourceSetups"("B");
