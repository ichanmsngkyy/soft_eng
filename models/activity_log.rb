require 'open3'

class ActivityLog
  MYSQL_CMD = 'C:\xampp\mysql\bin\mysql.exe'
  
  def self.all
    query_sql('SELECT * FROM activity_logs ORDER BY created_at DESC')
  end

  def self.create(attrs)
    escaped_partName = attrs['partName'].gsub("'", "\\'")
    escaped_categoryId = attrs['categoryId'].gsub("'", "\\'")
    escaped_actionType = attrs['actionType'].gsub("'", "\\'")
    escaped_details = attrs['details'].gsub("'", "\\'")
    escaped_orderId = attrs['orderId'] ? attrs['orderId'].gsub("'", "\\'") : nil
    
    if escaped_orderId
      sql = "INSERT INTO activity_logs (partName, categoryId, actionType, details, user_id, orderId) VALUES ('#{escaped_partName}', '#{escaped_categoryId}', '#{escaped_actionType}', '#{escaped_details}', #{attrs['user_id'].to_i}, '#{escaped_orderId}')"
    else
      sql = "INSERT INTO activity_logs (partName, categoryId, actionType, details, user_id) VALUES ('#{escaped_partName}', '#{escaped_categoryId}', '#{escaped_actionType}', '#{escaped_details}', #{attrs['user_id'].to_i})"
    end
    execute_sql(sql)
    
    # Get the last inserted ID
    results = query_sql('SELECT LAST_INSERT_ID() as id')
    results.first['id'].to_i
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