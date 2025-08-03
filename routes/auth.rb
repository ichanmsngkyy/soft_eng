require 'sinatra'
require 'sinatra/json'
require 'jwt'
require_relative '../models/user'

post '/login' do
  begin
    data = JSON.parse(request.body.read)
    user = User.authenticate(data['username'], data['password'])
    if user
      payload = { user_id: user['id'], username: user['username'] }
      token = JWT.encode(payload, ENV['JWT_SECRET'] || 'default_secret', 'HS256')
      json token: token, user: { id: user['id'], username: user['username'] }
    else
      halt 401, json({ error: 'Invalid username or password' })
    end
  rescue JSON::ParserError
    halt 400, json({ error: 'Invalid JSON data' })
  rescue => e
    halt 500, json({ error: 'Server error' })
  end
end

# Optional: Registration route (admin only)
post '/register' do
  begin
    data = JSON.parse(request.body.read)
    # Add admin check here if needed
    id = User.create(data)
    status 201
    json({ id: id })
  rescue JSON::ParserError
    halt 400, json({ error: 'Invalid JSON data' })
  rescue => e
    halt 500, json({ error: 'Server error' })
  end
end 