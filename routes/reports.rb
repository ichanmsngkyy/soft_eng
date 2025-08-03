require 'sinatra'
require 'sinatra/json'
require 'prawn'
require 'prawn/table'
require 'base64'

get '/reports/summary' do
  # Get data using the new approach
  parts = Part.all
  orders = Order.all

  total_parts = parts.sum { |part| part['quantity'].to_i }
  total_value = parts.sum { |part| (part['price'].to_f * part['quantity'].to_i) }
  low_stock = parts.count { |part| part['quantity'].to_i <= part['alertThreshold'].to_i }
  pending_orders = orders.count { |order| order['status'] == 'Pending' }

  json({
    total_parts: total_parts,
    total_value: total_value,
    low_stock: low_stock,
    pending_orders: pending_orders
  })
end

post '/reports/generate-pdf' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    report_type = data['reportType']
    
    # Generate PDF based on report type
    pdf_content = generate_pdf_report(report_type)
    
    # Convert PDF to base64 for transmission
    pdf_base64 = Base64.strict_encode64(pdf_content)
    
    json({
      success: true,
      pdf_data: pdf_base64,
      filename: data['filename']
    })
  rescue => e
    status 500
    json({
      success: false,
      error: e.message
    })
  end
end

private

def generate_pdf_report(report_type)
  Prawn::Document.new do |pdf|
    # Set up document with better font handling
    pdf.font_size 12
    
    # Use a more compatible font setup
    begin
      case report_type
      when 'stock-alert'
        generate_stock_alert_pdf(pdf)
      when 'inventory'
        generate_inventory_pdf(pdf)
      when 'order'
        generate_order_pdf(pdf)
      else
        pdf.text "Unknown report type: #{report_type}"
      end
    rescue => e
      # Fallback to simple text if there are font issues
      pdf.text "Error generating report: #{e.message}"
      pdf.text "Report type: #{report_type}"
      pdf.text "Generated: #{Time.now.strftime('%Y-%m-%d %H:%M:%S')}"
    end
  end.render
end

def generate_stock_alert_pdf(pdf)
  parts = Part.all
  low_stock_items = parts.select { |part| part['quantity'].to_i <= part['alertThreshold'].to_i }
  out_of_stock_items = parts.select { |part| part['quantity'].to_i == 0 }
  
  # Header
  pdf.font_size 18
  pdf.text "HARDWARE MANAGER STOCK ALERT REPORT", align: :center
  pdf.move_down 10
  
  pdf.font_size 12
  pdf.text "Generated: #{Time.now.strftime('%Y-%m-%d %H:%M:%S')}"
  pdf.move_down 20
  
  # Summary
  pdf.font_size 14
  pdf.text "CRITICAL ALERTS", style: :bold
  pdf.move_down 5
  pdf.text "Out of Stock Items: #{out_of_stock_items.length}"
  pdf.text "Low Stock Items: #{low_stock_items.length}"
  pdf.move_down 20
  
  # Out of Stock Items
  if out_of_stock_items.any?
    pdf.font_size 14
    pdf.text "OUT OF STOCK ITEMS", style: :bold
    pdf.move_down 10
    
    table_data = [['Part ID', 'Name', 'Brand', 'Category']]
    out_of_stock_items.each do |part|
      table_data << [
        part['categoryId'],
        part['name'],
        part['brand'],
        part['category']
      ]
    end
    
    pdf.table(table_data, header: true, width: pdf.bounds.width)
    pdf.move_down 20
  end
  
  # Low Stock Items
  if low_stock_items.any?
    pdf.font_size 14
    pdf.text "LOW STOCK ITEMS", style: :bold
    pdf.move_down 10
    
    table_data = [['Part ID', 'Name', 'Current', 'Threshold', 'Category']]
    low_stock_items.each do |part|
      table_data << [
        part['categoryId'],
        part['name'],
        part['quantity'],
        part['alertThreshold'],
        part['category']
      ]
    end
    
    pdf.table(table_data, header: true, width: pdf.bounds.width)
  end
end

def generate_inventory_pdf(pdf)
  parts = Part.all || []
  
  # Header
  pdf.font_size 18
  pdf.text "HARDWARE MANAGER INVENTORY REPORT", align: :center
  pdf.move_down 10
  
  pdf.font_size 12
  pdf.text "Generated: #{Time.now.strftime('%Y-%m-%d %H:%M:%S')}"
  pdf.move_down 20
  
  # Summary with safe data handling
  total_parts = parts.sum { |part| (part['quantity'] || 0).to_i }
  total_value = parts.sum { |part| ((part['price'] || 0).to_f * (part['quantity'] || 0).to_i) }
  low_stock = parts.count { |part| (part['quantity'] || 0).to_i <= (part['alertThreshold'] || 0).to_i }
  
  pdf.font_size 14
  pdf.text "SUMMARY", style: :bold
  pdf.move_down 5
  pdf.text "Total Parts: #{total_parts}"
  pdf.text "Total Value: PHP #{total_value.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse}"
  pdf.text "Low Stock Items: #{low_stock}"
  pdf.move_down 20
  
  # Detailed Inventory
  pdf.font_size 14
  pdf.text "DETAILED INVENTORY", style: :bold
  pdf.move_down 10
  
  table_data = [['Part ID', 'Name', 'Brand', 'Category', 'Quantity', 'Price', 'Status']]
  parts.each do |part|
    stock_level = get_stock_level(part)
    table_data << [
      part['categoryId'] || 'N/A',
      part['name'] || 'N/A',
      part['brand'] || 'N/A',
      part['category'] || 'N/A',
      part['quantity'] || '0',
      "PHP #{part['price'] || '0'}",
      stock_level
    ]
  end
  
  pdf.table(table_data, header: true, width: pdf.bounds.width)
end

def generate_order_pdf(pdf)
  orders = Order.all
  
  # Header
  pdf.font_size 18
  pdf.text "HARDWARE MANAGER ORDER REPORT", align: :center
  pdf.move_down 10
  
  pdf.font_size 12
  pdf.text "Generated: #{Time.now.strftime('%Y-%m-%d %H:%M:%S')}"
  pdf.move_down 20
  
  # Summary
  pending_orders = orders.count { |order| order['status'] == 'Pending' }
  completed_orders = orders.count { |order| order['status'] == 'Completed' }
  cancelled_orders = orders.count { |order| order['status'] == 'Cancelled' }
  
  pdf.font_size 14
  pdf.text "SUMMARY", style: :bold
  pdf.move_down 5
  pdf.text "Total Orders: #{orders.length}"
  pdf.text "Pending Orders: #{pending_orders}"
  pdf.text "Completed Orders: #{completed_orders}"
  pdf.text "Cancelled Orders: #{cancelled_orders}"
  pdf.move_down 20
  
  # Detailed Orders
  pdf.font_size 14
  pdf.text "DETAILED ORDERS", style: :bold
  pdf.move_down 10
  
  table_data = [['Order ID', 'Part Name', 'Date', 'Quantity', 'Status']]
  orders.each do |order|
    table_data << [
      order['orderId'],
      order['partName'],
      order['date'],
      order['quantity'],
      order['status']
    ]
  end
  
  pdf.table(table_data, header: true, width: pdf.bounds.width)
end

def get_stock_level(part)
  quantity = (part['quantity'] || 0).to_i
  threshold = (part['alertThreshold'] || 0).to_i
  
  if quantity == 0
    'Out of Stock'
  elsif quantity <= threshold
    'Low Stock'
  else
    'In Stock'
  end
end

# Database Export/Import endpoints
post '/database/export' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    export_type = data['exportType'] || 'full'
    
    # Load the exporter
    load 'db/export_database.rb'
    exporter = DatabaseExporter.new
    
    case export_type
    when 'full'
      filename = exporter.export_full_database
    when 'tables'
      filename = exporter.export_tables_separately
    when 'data'
      filename = exporter.export_data_only
    when 'json'
      filename = exporter.export_json_format
    else
      raise "Invalid export type: #{export_type}"
    end
    
    if filename
      json({
        success: true,
        message: "Database exported successfully",
        filename: File.basename(filename),
        size: File.size(filename)
      })
    else
      raise "Export failed"
    end
    
  rescue => e
    status 500
    json({
      success: false,
      error: e.message
    })
  end
end

post '/database/import' do
  content_type :json
  
  begin
    # Handle file upload
    if params[:file] && params[:file][:tempfile]
      temp_file = params[:file][:tempfile]
      filename = params[:file][:filename]
      
      # Save uploaded file temporarily
      temp_path = "temp_#{filename}"
      FileUtils.copy(temp_file.path, temp_path)
      
      # Load the importer
      load 'db/import_database.rb'
      importer = DatabaseImporter.new
      
      success = if filename.end_with?('.json')
        importer.import_json_file(temp_path)
      else
        importer.import_sql_file(temp_path)
      end
      
      # Clean up temp file
      File.delete(temp_path) if File.exist?(temp_path)
      
      if success
        json({
          success: true,
          message: "Database imported successfully",
          filename: filename
        })
      else
        raise "Import failed"
      end
    else
      raise "No file uploaded"
    end
    
  rescue => e
    status 500
    json({
      success: false,
      error: e.message
    })
  end
end

get '/database/backups' do
  content_type :json
  
  begin
    backup_dir = 'database_backups'
    
    if Dir.exist?(backup_dir)
      files = Dir.glob("#{backup_dir}/*").map do |file|
        {
          filename: File.basename(file),
          size: File.size(file),
          modified: File.mtime(file).iso8601,
          type: File.extname(file).downcase
        }
      end
      
      json({
        success: true,
        backups: files
      })
    else
      json({
        success: true,
        backups: []
      })
    end
    
  rescue => e
    status 500
    json({
      success: false,
      error: e.message
    })
  end
end 