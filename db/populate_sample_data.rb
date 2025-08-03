require 'mysql2'

# XAMPP MySQL connection settings
DB_CONFIG = {
  host: ENV['DB_HOST'] || 'localhost',
  port: ENV['DB_PORT'] || 3306,
  username: ENV['DB_USER'] || 'root',
  password: ENV['DB_PASSWORD'] || '',
  database: ENV['DB_NAME'] || 'inventory_db'
}

client = Mysql2::Client.new(DB_CONFIG)

# Clear tables (except users)
client.query('DELETE FROM activity_logs')
client.query('DELETE FROM orders')
client.query('DELETE FROM parts')

# Sample parts
parts = [
  { categoryId: 'CPU001', name: 'Intel Core i7-12700K', brand: 'Intel', category: 'Processor (CPU)', price: 18000, quantity: 10, alertThreshold: 3 },
  { categoryId: 'GPU001', name: 'NVIDIA RTX 3060', brand: 'NVIDIA', category: 'Graphic Card (GPU)', price: 28000, quantity: 5, alertThreshold: 2 },
  { categoryId: 'SSD001', name: 'Samsung 970 EVO 1TB', brand: 'Samsung', category: 'Storage (SSD)', price: 6000, quantity: 8, alertThreshold: 2 },
  { categoryId: 'RAM001', name: 'Corsair Vengeance 16GB', brand: 'Corsair', category: 'Memory (RAM)', price: 3500, quantity: 15, alertThreshold: 5 }
]

parts.each do |part|
  status = part[:quantity] <= part[:alertThreshold] ? 'Low Stock' : 'In Stock'
  client.query("INSERT INTO parts (categoryId, name, brand, category, price, quantity, alertThreshold, status) VALUES ('#{part[:categoryId]}', '#{part[:name]}', '#{part[:brand]}', '#{part[:category]}', #{part[:price]}, #{part[:quantity]}, #{part[:alertThreshold]}, '#{status}')")
end

# Sample orders (reference categoryId)
orders = [
  { orderId: 'ORD001', categoryId: 'CPU001', partName: 'Intel Core i7-12700K', date: '2025-07-28', quantity: 2, status: 'Completed' },
  { orderId: 'ORD002', categoryId: 'GPU001', partName: 'NVIDIA RTX 3060', date: '2025-07-28', quantity: 1, status: 'Pending' }
]

orders.each do |order|
  client.query("INSERT INTO orders (orderId, categoryId, partName, date, quantity, status) VALUES ('#{order[:orderId]}', '#{order[:categoryId]}', '#{order[:partName]}', '#{order[:date]}', #{order[:quantity]}, '#{order[:status]}')")
end

# Sample activity logs (reference categoryId and orderId)
activity_logs = [
  { activityId: 'ACT001', partName: 'Intel Core i7-12700K', categoryId: 'CPU001', actionType: 'Stock Added', details: 'Added 10 units', user_id: 1 },
  { activityId: 'ACT002', partName: 'NVIDIA RTX 3060', categoryId: 'GPU001', actionType: 'Order Created', details: 'Order ORD001 created', user_id: 1, orderId: 'ORD001' },
  { activityId: 'ACT003', partName: 'NVIDIA RTX 3060', categoryId: 'GPU001', actionType: 'Order Created', details: 'Order ORD002 created', user_id: 1, orderId: 'ORD002' }
]

activity_logs.each do |log|
  if log[:orderId]
    client.query("INSERT INTO activity_logs (activityId, partName, categoryId, actionType, details, user_id, orderId) VALUES ('#{log[:activityId]}', '#{log[:partName]}', '#{log[:categoryId]}', '#{log[:actionType]}', '#{log[:details]}', #{log[:user_id]}, '#{log[:orderId]}')")
  else
    client.query("INSERT INTO activity_logs (activityId, partName, categoryId, actionType, details, user_id) VALUES ('#{log[:activityId]}', '#{log[:partName]}', '#{log[:categoryId]}', '#{log[:actionType]}', '#{log[:details]}', #{log[:user_id]})")
  end
end

puts 'Sample data populated!' 