require 'bcrypt'
require 'open3'

class User
  MYSQL_CMD = 'C:\xampp\mysql\bin\mysql.exe'
  
  def self.all
    query_sql('SELECT * FROM users')
  end

  def self.find(id)
    results = query_sql("SELECT * FROM users WHERE id = #{id}")
    results.first
  end

  def self.find_by_username(username)
    escaped_username = username.gsub("'", "\\'")
    results = query_sql("SELECT * FROM users WHERE username = '#{escaped_username}'")
    results.first
  end

  def self.create(attrs)
    password_hash = BCrypt::Password.create(attrs['password'])
    escaped_username = attrs['username'].gsub("'", "\\'")
    escaped_email = attrs['email'].gsub("'", "\\'")
    
    sql = "INSERT INTO users (username, email, password_digest, role) VALUES ('#{escaped_username}', '#{escaped_email}', '#{password_hash}', 'user')"
    execute_sql(sql)
    
    # Get the last inserted ID
    results = query_sql('SELECT LAST_INSERT_ID() as id')
    results.first['id'].to_i
  end

  def self.update(id, attrs)
    set_clause = attrs.map { |k, v| "#{k} = '#{v.to_s.gsub("'", "\\'")}'" }.join(', ')
    sql = "UPDATE users SET #{set_clause} WHERE id = #{id}"
    execute_sql(sql)
  end

  def self.delete(id)
    sql = "DELETE FROM users WHERE id = #{id}"
    execute_sql(sql)
  end

  def self.authenticate(username, password)
    user = self.find_by_username(username)
    return nil unless user && BCrypt::Password.new(user['password_digest']) == password
    user
  end

  private

  def self.execute_sql(sql)
    cmd = "#{MYSQL_CMD} -uroot inventory_db -e \"#{sql}\""
    stdout, stderr, status = Open3.capture3(cmd)
    return stdout, stderr, status
  end

  def self.query_sql(sql)
    stdout, stderr, status = execute_sql(sql)
    return [] if status != 0
    
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
end 