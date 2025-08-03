#!/usr/bin/env ruby

require 'open3'
require 'json'
require 'fileutils'

class DatabaseExporter
  MYSQL_CMD = 'C:\xampp\mysql\bin\mysql.exe'
  MYSQLDUMP_CMD = 'C:\xampp\mysql\bin\mysqldump.exe'
  
  def initialize
    @db_name = 'inventory_db'
    @backup_dir = 'database_backups'
    create_backup_directory
  end
  
  def create_backup_directory
    unless Dir.exist?(@backup_dir)
      Dir.mkdir(@backup_dir)
      puts "Created backup directory: #{@backup_dir}"
    end
  end
  
  def export_full_database
    timestamp = Time.now.strftime('%Y%m%d_%H%M%S')
    filename = "#{@backup_dir}/inventory_db_full_#{timestamp}.sql"
    
    puts "Exporting full database to #{filename}..."
    
    cmd = "#{MYSQLDUMP_CMD} -uroot --add-drop-database --databases #{@db_name} > #{filename}"
    
    begin
      stdout, stderr, status = Open3.capture3(cmd)
      
      if status.success?
        puts "✅ Database exported successfully!"
        puts "📁 File: #{filename}"
        puts "📊 Size: #{File.size(filename)} bytes"
        return filename
      else
        puts "❌ Export failed: #{stderr}"
        return nil
      end
    rescue => e
      puts "❌ Error during export: #{e.message}"
      return nil
    end
  end
  
  def export_tables_separately
    timestamp = Time.now.strftime('%Y%m%d_%H%M%S')
    tables_dir = "#{@backup_dir}/tables_#{timestamp}"
    Dir.mkdir(tables_dir) unless Dir.exist?(tables_dir)
    
    tables = ['users', 'parts', 'orders', 'activity_logs']
    
    puts "Exporting tables separately to #{tables_dir}..."
    
    tables.each do |table|
      filename = "#{tables_dir}/#{table}.sql"
      cmd = "#{MYSQLDUMP_CMD} -uroot #{@db_name} #{table} > #{filename}"
      
      begin
        stdout, stderr, status = Open3.capture3(cmd)
        
        if status.success?
          puts "✅ #{table} exported to #{filename}"
        else
          puts "❌ Failed to export #{table}: #{stderr}"
        end
      rescue => e
        puts "❌ Error exporting #{table}: #{e.message}"
      end
    end
    
    return tables_dir
  end
  
  def export_data_only
    timestamp = Time.now.strftime('%Y%m%d_%H%M%S')
    filename = "#{@backup_dir}/inventory_db_data_#{timestamp}.sql"
    
    puts "Exporting data only (no structure) to #{filename}..."
    
    cmd = "#{MYSQLDUMP_CMD} -uroot --no-create-info --no-create-db --skip-triggers #{@db_name} > #{filename}"
    
    begin
      stdout, stderr, status = Open3.capture3(cmd)
      
      if status.success?
        puts "✅ Data exported successfully!"
        puts "📁 File: #{filename}"
        puts "📊 Size: #{File.size(filename)} bytes"
        return filename
      else
        puts "❌ Export failed: #{stderr}"
        return nil
      end
    rescue => e
      puts "❌ Error during export: #{e.message}"
      return nil
    end
  end
  
  def export_json_format
    timestamp = Time.now.strftime('%Y%m%d_%H%M%S')
    filename = "#{@backup_dir}/inventory_db_#{timestamp}.json"
    
    puts "Exporting database to JSON format..."
    
    data = {
      export_date: Time.now.iso8601,
      database_name: @db_name,
      tables: {}
    }
    
    tables = ['users', 'parts', 'orders', 'activity_logs']
    
    tables.each do |table|
      puts "Exporting #{table} table..."
      table_data = export_table_to_json(table)
      data[:tables][table] = table_data if table_data
    end
    
    File.write(filename, JSON.pretty_generate(data))
    puts "✅ JSON export completed: #{filename}"
    puts "📊 Size: #{File.size(filename)} bytes"
    
    return filename
  end
  
  private
  
  def export_table_to_json(table)
    cmd = "#{MYSQL_CMD} -uroot #{@db_name} -e \"SELECT * FROM #{table}\" -s"
    
    begin
      stdout, stderr, status = Open3.capture3(cmd)
      
      if status.success?
        lines = stdout.strip.split("\n")
        return [] if lines.empty?
        
        # Parse tab-separated output
        headers = lines[0].split("\t")
        data = []
        
        lines[1..-1].each do |line|
          values = line.split("\t")
          row = {}
          headers.each_with_index do |header, index|
            row[header] = values[index]
          end
          data << row
        end
        
        return data
      else
        puts "❌ Failed to export #{table}: #{stderr}"
        return nil
      end
    rescue => e
      puts "❌ Error exporting #{table}: #{e.message}"
      return nil
    end
  end
end

# Command line interface
if __FILE__ == $0
  exporter = DatabaseExporter.new
  
  puts "🔄 Hardware Manager Database Exporter"
  puts "====================================="
  puts ""
  puts "Choose export option:"
  puts "1. Export full database (structure + data)"
  puts "2. Export tables separately"
  puts "3. Export data only (no structure)"
  puts "4. Export to JSON format"
  puts "5. Export all formats"
  puts ""
  
  print "Enter your choice (1-5): "
  choice = gets.chomp
  
  case choice
  when "1"
    exporter.export_full_database
  when "2"
    exporter.export_tables_separately
  when "3"
    exporter.export_data_only
  when "4"
    exporter.export_json_format
  when "5"
    puts "Exporting all formats..."
    exporter.export_full_database
    exporter.export_tables_separately
    exporter.export_data_only
    exporter.export_json_format
  else
    puts "Invalid choice. Please run the script again."
  end
  
  puts ""
  puts "📁 Check the 'database_backups' directory for exported files."
end 