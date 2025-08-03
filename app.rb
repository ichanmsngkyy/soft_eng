ENV['ALLOW_HOSTS'] = '*'
require 'sinatra'
require 'sinatra/json'
require 'json'
require 'fileutils'
require 'open3'
require_relative './config/environment'
require_relative './routes/auth'
require_relative './routes/parts'
require_relative './routes/orders'
require_relative './routes/activity'
require_relative './routes/reports'

# XAMPP MySQL connection settings
DB_HOST = ENV['DB_HOST'] || 'localhost'
DB_USERNAME = ENV['DB_USER'] || 'root'
DB_PASSWORD = ENV['DB_PASSWORD'] || 'admin123'  # Updated password
DB_NAME = ENV['DB_NAME'] || 'inventory_db'
DB_PORT = ENV['DB_PORT'] || 3306

# Configure static file serving
set :public_folder, File.dirname(__FILE__)
set :static, true

# MySQL command path (XAMPP)
MYSQL_CMD = 'C:\xampp\mysql\bin\mysql.exe'

configure do
  set :port, 4567
  set :bind, '0.0.0.0'  # Allow external connections
  set :server, 'puma'
  
  # Disable all protection features that block external access
  set :protection, false
  set :protection, :except => [:host_authorization, :frame_options, :content_security_policy]
  
  # Allow all hosts
  set :allow_hosts, '*'
end

# Database helper methods
def execute_sql(sql)
  cmd = "#{MYSQL_CMD} -u#{DB_USERNAME} -p#{DB_PASSWORD} -h#{DB_HOST} -P#{DB_PORT} #{DB_NAME} -e \"#{sql}\""
  stdout, stderr, status = Open3.capture3(cmd)
  return stdout, stderr, status
end

def query_sql(sql)
  stdout, stderr, status = execute_sql(sql)
  return [] if status != 0
  # Parse the output (simple CSV-like format)
  lines = stdout.strip.split("\n")
  return [] if lines.empty?
  
  headers = lines[0].split("\t")
  results = []
  
  lines[1..-1].each do |line|
    values = line.split("\t")
    row = {}
    headers.each_with_index do |header, i|
      row[header] = values[i]
    end
    results << row
  end
  
  results
end

# CORS support for frontend
before do
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
end

options '*' do
  200
end

# JWT authentication for protected routes
before do
  pass if request.path_info =~ /^\/login|\/register|\/login\.html|\/index\.html|\/login\.css|\/login\.js/
  auth_header = request.env['HTTP_AUTHORIZATION']
  halt 401, json({ error: 'Missing token' }) unless auth_header
  token = auth_header.split(' ').last
  begin
    payload, = JWT.decode(token, ENV['JWT_SECRET'] || 'default_secret', true, { algorithm: 'HS256' })
    env['user'] = payload
  rescue JWT::DecodeError
    halt 401, json({ error: 'Invalid token' })
  end
end

get '/' do
  # Use relative redirect to work with forwarded URLs
  redirect '/login.html'
end

# Example route to fetch data from a table
get '/users' do
  users = query_sql('SELECT * FROM users')
  json users
end

# Auto-open browser when server starts (only for local development)
if ENV['RACK_ENV'] != 'production'
  Thread.new do
    sleep 2  # Wait for server to start
    system('start http://localhost:4567/login.html')  # Windows
  rescue
    # Fallback for other OS
    system('open http://localhost:4567/login.html') rescue nil  # macOS
    system('xdg-open http://localhost:4567/login.html') rescue nil  # Linux
  end
end 