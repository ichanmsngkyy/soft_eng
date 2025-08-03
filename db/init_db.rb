require 'mysql2'

# XAMPP MySQL connection settings
DB_CONFIG = {
  host: ENV['DB_HOST'] || 'localhost',
  port: ENV['DB_PORT'] || 3306,
  username: ENV['DB_USER'] || 'root',
  password: ENV['DB_PASSWORD'] || '',
  database: ENV['DB_NAME'] || 'inventory_db'
}

puts "Setting up XAMPP MySQL database..."

# First connect without database to create it
begin
  client = Mysql2::Client.new(
    host: DB_CONFIG[:host],
    port: DB_CONFIG[:port],
    username: DB_CONFIG[:username],
    password: DB_CONFIG[:password]
  )
  
  # Create database if it doesn't exist
  client.query("CREATE DATABASE IF NOT EXISTS #{DB_CONFIG[:database]}")
  puts "✅ Database '#{DB_CONFIG[:database]}' created/verified"
  
  # Connect to the specific database
  client = Mysql2::Client.new(DB_CONFIG)
  
  # Read and execute migration files
  migration_files = Dir.glob(File.join(__dir__, 'migrate', '*.sql')).sort
  
  migration_files.each do |file|
    puts "Running migration: #{File.basename(file)}"
    sql_content = File.read(file)
    client.query(sql_content)
  end
  
  # Add default admin user
  begin
    require 'bcrypt'
    admin_password = BCrypt::Password.create('admin123')
    client.query("INSERT INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@example.com', '#{admin_password}', 'admin')")
    puts "✅ Created default admin user (username: admin, password: admin123)"
  rescue Mysql2::Error => e
    if e.message.include?('Duplicate entry')
      puts "✅ Admin user already exists"
    else
      puts "⚠️ Could not create admin user: #{e.message}"
    end
  end
  
  puts "✅ XAMPP MySQL database initialized successfully!"
  puts "Database: #{DB_CONFIG[:database]} on #{DB_CONFIG[:host]}:#{DB_CONFIG[:port]}"
  puts "\nYou can now access your database in phpMyAdmin!"
  puts "URL: http://localhost/phpmyadmin"
  puts "Database: #{DB_CONFIG[:database]}"
  
rescue Mysql2::Error => e
  puts "❌ Database connection error: #{e.message}"
  puts "\nTroubleshooting tips for XAMPP:"
  puts "1. Make sure XAMPP MySQL is running (check XAMPP Control Panel)"
  puts "2. Check if MySQL service is started in XAMPP"
  puts "3. Verify MySQL port 3306 is not blocked"
  puts "4. Try connecting via phpMyAdmin in XAMPP"
  puts "5. URL: http://localhost/phpmyadmin"
end 