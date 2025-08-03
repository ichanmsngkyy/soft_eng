#!/usr/bin/env ruby

require 'open3'
require 'json'
require 'fileutils'

class DatabaseImporter
  MYSQL_CMD = 'C:\xampp\mysql\bin\mysql.exe'
  
  def initialize
    @db_name = 'inventory_db'
    @backup_dir = 'database_backups'
  end
  
  def import_sql_file(filename)
    unless File.exist?(filename)
      puts "❌ File not found: #{filename}"
      return false
    end
    
    puts "Importing SQL file: #{filename}"
    
    cmd = "#{MYSQL_CMD} -uroot < #{filename}"
    
    begin
      stdout, stderr, status = Open3.capture3(cmd)
      
      if status.success?
        puts "✅ SQL file imported successfully!"
        return true
      else
        puts "❌ Import failed: #{stderr}"
        return false
      end
    rescue => e
      puts "❌ Error during import: #{e.message}"
      return false
    end
  end
  
  def import_json_file(filename)
    unless File.exist?(filename)
      puts "❌ File not found: #{filename}"
      return false
    end
    
    puts "Importing JSON file: #{filename}"
    
    begin
      data = JSON.parse(File.read(filename))
      
      # Clear existing data
      clear_existing_data
      
      # Import each table
      data['tables'].each do |table_name, table_data|
        import_table_data(table_name, table_data)
      end
      
      puts "✅ JSON file imported successfully!"
      return true
      
    rescue JSON::ParserError => e
      puts "❌ Invalid JSON file: #{e.message}"
      return false
    rescue => e
      puts "❌ Error during import: #{e.message}"
      return false
    end
  end
  
  def import_table_data(table_name, data)
    return if data.empty?
    
    puts "Importing #{table_name} table (#{data.length} records)..."
    
    # Get column names from first record
    columns = data.first.keys
    column_list = columns.join(', ')
    
    data.each do |record|
      values = columns.map { |col| escape_value(record[col]) }
      value_list = values.join(', ')
      
      sql = "INSERT INTO #{table_name} (#{column_list}) VALUES (#{value_list})"
      
      begin
        cmd = "#{MYSQL_CMD} -uroot #{@db_name} -e \"#{sql}\""
        stdout, stderr, status = Open3.capture3(cmd)
        
        unless status.success?
          puts "⚠️ Warning: Failed to insert record in #{table_name}: #{stderr}"
        end
      rescue => e
        puts "⚠️ Warning: Error inserting record in #{table_name}: #{e.message}"
      end
    end
    
    puts "✅ #{table_name} table imported successfully!"
  end
  
  def clear_existing_data
    tables = ['activity_logs', 'orders', 'parts', 'users']
    
    puts "Clearing existing data..."
    
    tables.each do |table|
      begin
        cmd = "#{MYSQL_CMD} -uroot #{@db_name} -e \"DELETE FROM #{table}\""
        stdout, stderr, status = Open3.capture3(cmd)
        
        if status.success?
          puts "✅ Cleared #{table} table"
        else
          puts "⚠️ Warning: Failed to clear #{table}: #{stderr}"
        end
      rescue => e
        puts "⚠️ Warning: Error clearing #{table}: #{e.message}"
      end
    end
  end
  
  def list_available_backups
    unless Dir.exist?(@backup_dir)
      puts "❌ Backup directory not found: #{@backup_dir}"
      return []
    end
    
    files = Dir.glob("#{@backup_dir}/*")
    
    if files.empty?
      puts "No backup files found in #{@backup_dir}"
      return []
    end
    
    puts "Available backup files:"
    files.each_with_index do |file, index|
      filename = File.basename(file)
      size = File.size(file)
      puts "#{index + 1}. #{filename} (#{size} bytes)"
    end
    
    return files
  end
  
  def restore_from_backup
    files = list_available_backups
    return if files.empty?
    
    puts ""
    print "Enter the number of the file to restore: "
    choice = gets.chomp.to_i
    
    if choice < 1 || choice > files.length
      puts "❌ Invalid choice"
      return
    end
    
    selected_file = files[choice - 1]
    filename = File.basename(selected_file)
    
    puts ""
    puts "⚠️ WARNING: This will overwrite your current database!"
    print "Are you sure you want to restore from #{filename}? (yes/no): "
    confirmation = gets.chomp.downcase
    
    if confirmation == 'yes'
      if filename.end_with?('.json')
        import_json_file(selected_file)
      else
        import_sql_file(selected_file)
      end
    else
      puts "Restore cancelled."
    end
  end
  
  private
  
  def escape_value(value)
    return 'NULL' if value.nil?
    
    # Escape single quotes and wrap in quotes
    escaped = value.to_s.gsub("'", "\\'")
    "'#{escaped}'"
  end
end

# Command line interface
if __FILE__ == $0
  importer = DatabaseImporter.new
  
  puts "🔄 Hardware Manager Database Importer"
  puts "====================================="
  puts ""
  puts "Choose import option:"
  puts "1. Import SQL file"
  puts "2. Import JSON file"
  puts "3. Restore from backup"
  puts "4. List available backups"
  puts ""
  
  print "Enter your choice (1-4): "
  choice = gets.chomp
  
  case choice
  when "1"
    print "Enter SQL file path: "
    filename = gets.chomp
    importer.import_sql_file(filename)
  when "2"
    print "Enter JSON file path: "
    filename = gets.chomp
    importer.import_json_file(filename)
  when "3"
    importer.restore_from_backup
  when "4"
    importer.list_available_backups
  else
    puts "Invalid choice. Please run the script again."
  end
  
  puts ""
  puts "✅ Import process completed."
end 