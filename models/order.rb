require 'open3'

class Order
  MYSQL_CMD = 'C:\xampp\mysql\bin\mysql.exe'
  
  def self.all
    query_sql('SELECT * FROM orders')
  end

  def self.find(id)
    results = query_sql("SELECT * FROM orders WHERE id = #{id}")
    results.first
  end

  def self.create(attrs)
    escaped_orderId = attrs['orderId'].gsub("'", "\\'")
    escaped_categoryId = attrs['categoryId'].gsub("'", "\\'")
    escaped_partName = attrs['partName'].gsub("'", "\\'")
    escaped_date = attrs['date'].gsub("'", "\\'")
    escaped_status = attrs['status'].gsub("'", "\\'")
    order_quantity = attrs['quantity'].to_i
    
    sql = "INSERT INTO orders (orderId, categoryId, partName, date, quantity, status) VALUES ('#{escaped_orderId}', '#{escaped_categoryId}', '#{escaped_partName}', '#{escaped_date}', #{order_quantity}, '#{escaped_status}')"
    puts "[Order.create] SQL for order: #{sql}"
    stdout, stderr, status = execute_sql(sql)
    puts "[Order.create] Order insert stdout: #{stdout} stderr: #{stderr} status: #{status.exitstatus}"

    # Deduct the ordered quantity from the part's stock
    update_stock_sql = "UPDATE parts SET quantity = quantity - #{order_quantity} WHERE categoryId = '#{escaped_categoryId}'"
    puts "[Order.create] SQL for stock deduction: #{update_stock_sql}"
    stock_stdout, stock_stderr, stock_status = execute_sql(update_stock_sql)
    puts "[Order.create] Stock deduction stdout: #{stock_stdout} stderr: #{stock_stderr} status: #{stock_status.exitstatus}"
    
    # Get the last inserted ID
    results = query_sql('SELECT LAST_INSERT_ID() as id')
    results.first['id'].to_i
  end

  def self.update(id, attrs)
    set_clause = attrs.map { |k, v| "#{k} = '#{v.to_s.gsub("'", "\\'")}'" }.join(', ')
    sql = "UPDATE orders SET #{set_clause} WHERE id = #{id}"
    execute_sql(sql)
  end

  def self.delete(id)
    sql = "DELETE FROM orders WHERE id = #{id}"
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