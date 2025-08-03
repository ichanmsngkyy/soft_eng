CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partName VARCHAR(255),
  categoryId VARCHAR(50),
  actionType VARCHAR(50),
  details TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 