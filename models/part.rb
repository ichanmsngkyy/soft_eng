require 'open3'

class Part
  MYSQL_CMD = 'C:\xampp\mysql\bin\mysql.exe'
  
  def self.all
    results = query_sql('SELECT * FROM parts')
    # Return original field names without complex mapping
    results.map do |part|
      {
        'id' => part['id'],
        'categoryId' => part['categoryId'],
        'name' => part['name'],
        'brand' => part['brand'],
        'category' => part['category'],
        'price' => part['price'],
        'quantity' => part['quantity'],
        'alertThreshold' => part['alertThreshold'],
        'status' => part['status']
      }
    end
  end

  def self.find(id)
    results = query_sql("SELECT * FROM parts WHERE id = #{id}")
    return nil if results.empty?
    
    part = results.first
    # Return original field names without complex mapping
    {
      'id' => part['id'],
      'categoryId' => part['categoryId'],
      'name' => part['name'],
      'brand' => part['brand'],
      'category' => part['category'],
      'price' => part['price'],
      'quantity' => part['quantity'],
      'alertThreshold' => part['alertThreshold'],
      'status' => part['status']
    }
  end

  def self.create(attrs)
    escaped_categoryId = attrs['categoryId'].gsub("'", "\\'")
    escaped_name = attrs['name'].gsub("'", "\\'")
    escaped_brand = attrs['brand'].gsub("'", "\\'")
    escaped_category = attrs['category'].gsub("'", "\\'")
    quantity = attrs['quantity'].to_i
    alert_threshold = attrs['alertThreshold'].to_i

    # Determine status
    status = if quantity == 0
      'Out of Stock'
    elsif quantity <= alert_threshold
      'Low Stock'
    else
      'In Stock'
    end

    sql = "INSERT INTO parts (categoryId, name, brand, category, price, quantity, alertThreshold, status) VALUES ('#{escaped_categoryId}', '#{escaped_name}', '#{escaped_brand}', '#{escaped_category}', #{attrs['price'].to_i}, #{quantity}, #{alert_threshold}, '#{status}')"
    execute_sql(sql)

    # Log the addition in activity_logs
    activity_id = Time.now.strftime('%Y%m%d%H%M%S%L')
    user_id = 1 # Replace with actual user ID if available
    log_sql = "INSERT INTO activity_logs (activityId, partName, categoryId, actionType, details, user_id) VALUES ('#{activity_id}', '#{escaped_name}', '#{escaped_categoryId}', 'Addition', 'Added new part to inventory', #{user_id})"
    execute_sql(log_sql)

    # Get the last inserted ID
    results = query_sql('SELECT LAST_INSERT_ID() as id')
    results.first['id'].to_i
  end

  def self.update(id, attrs)
    set_clause = attrs.map { |k, v| "#{k} = '#{v.to_s.gsub("'", "\\'")}'" }.join(', ')
    sql = "UPDATE parts SET #{set_clause} WHERE id = #{id}"
    execute_sql(sql)
  end

  def self.update_by_category_id(categoryId, attrs)
    puts "DEBUG: update_by_category_id called with categoryId=#{categoryId}, attrs=#{attrs.inspect}"
    # Fetch current values from DB
    current = query_sql("SELECT quantity, alertThreshold, name FROM parts WHERE categoryId = '#{categoryId}'").first

    # Use new value if provided, else current
    quantity = attrs['quantity']
    quantity = quantity.nil? || quantity.to_s.strip == '' ? current['quantity'].to_i : quantity.to_i

    alert_threshold = attrs['alertThreshold']
    alert_threshold = alert_threshold.nil? || alert_threshold.to_s.strip == '' ? current['alertThreshold'].to_i : alert_threshold.to_i

    # Compute status
    status =
      if attrs['status'] == 'Discontinued'
        'Discontinued'
      else
        if quantity == 0
          'Out of Stock'
        elsif quantity <= alert_threshold
          'Low Stock'
        else
          'In Stock'
        end
      end

    # Remove status from attrs if present
    attrs = attrs.reject { |k, _| k == 'status' }
    set_clause = attrs.map { |k, v| "#{k} = '#{v.to_s.gsub("'", "\\'")}'" }.join(', ')
    if set_clause.strip.empty?
      set_clause = "status = '#{status}'"
    else
      set_clause += ", status = '#{status}'"
    end
    sql = "UPDATE parts SET #{set_clause} WHERE categoryId = '#{categoryId}'"
    puts "DEBUG: update_by_category_id SQL: #{sql}"
    execute_sql(sql)

    # Log the update in activity_logs
    activity_id = Time.now.strftime('%Y%m%d%H%M%S%L')
    part_name = attrs['name'] || current['name']
    user_id = 1 # Replace with actual user ID if available
    log_sql = "INSERT INTO activity_logs (activityId, partName, categoryId, actionType, details, user_id) VALUES ('#{activity_id}', '#{part_name}', '#{categoryId}', 'Update', 'Updated part details', #{user_id})"
    execute_sql(log_sql)
  end

  def self.delete(categoryId)
    # Fetch part info for logging before deleting
    part = query_sql("SELECT name FROM parts WHERE categoryId = '#{categoryId}'").first
    if part
      activity_id = Time.now.strftime('%Y%m%d%H%M%S%L')
      user_id = 1 # Replace with actual user ID if available
      log_sql = "INSERT INTO activity_logs (activityId, partName, categoryId, actionType, details, user_id) VALUES ('#{activity_id}', '#{part['name']}', '#{categoryId}', 'Deletion', 'Deleted part from inventory', #{user_id})"
      execute_sql(log_sql)
    end
    # Then delete
    sql = "DELETE FROM parts WHERE categoryId = '#{categoryId}'"
    execute_sql(sql)
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